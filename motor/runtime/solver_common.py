from __future__ import annotations
import solver_common_v11 as base
from solver_common_v11 import *
from collections import Counter, defaultdict

_base_activity_options=base.activity_options
_base_structural_precheck=base.structural_precheck
_base_evaluate=base.evaluate

def all_teacher_ids(activity,opt):
    ids=[]
    if opt.get("teacherId"): ids.append(opt["teacherId"])
    ids.extend(activity.get("requiredTeacherIds") or [])
    return list(dict.fromkeys(ids))

def effective_teacher_max(t):
    vals=[]
    if t.get("maxLectivePerWeek") is not None: vals.append(int(t["maxLectivePerWeek"]))
    if t.get("baseLectivePerWeek") is not None: vals.append(max(0,int(t["baseLectivePerWeek"])-int(t.get("leadershipReductionSlots") or 0)))
    return min(vals) if vals else None

def activity_options(inp,activity):
    opts=_base_activity_options(inp,activity)
    teachers={t["id"]:t for t in inp["resources"]["teachers"]}
    sites={s["id"] for s in inp["resources"].get("sites",[])}
    if activity.get("siteId") and activity["siteId"] not in sites: return []
    clean=[]
    for opt in opts:
        ok=True
        for tid in activity.get("requiredTeacherIds") or []:
            t=teachers.get(tid)
            if not t or not t.get("active",True): ok=False; break
            av={slot_key(a["dayId"],a["timeSlotId"]):a for a in t.get("availability",[])}
            for ts in opt.get("coveredTimeSlotIds") or [opt["timeSlotId"]]:
                if not av.get(slot_key(opt["dayId"],ts),{"available":False}).get("available",False): ok=False; break
            if not ok: break
        if ok: clean.append(opt)
    return clean

def org_rules(inp,typ=None):
    xs=[r for r in inp.get("organizationalRules",[]) if r.get("active")]
    return [r for r in xs if r.get("type")==typ] if typ else xs

def structural_precheck(inp):
    causes=_base_structural_precheck(inp)
    teachers={t["id"]:t for t in inp["resources"]["teachers"]}; activities={a["id"]:a for a in inp["activities"]}
    site_ids={s["id"] for s in inp["resources"].get("sites",[])}
    for s in inp["resources"].get("spaces",[]):
        if s.get("siteId") not in site_ids: causes.append({"code":"UNKNOWN_SITE","message":"Un espacio referencia una sede inexistente.","relatedIds":[s["id"],str(s.get("siteId"))],"evidence":{}})
    for a in activities.values():
        missing=[t for t in a.get("requiredTeacherIds",[]) if t not in teachers]
        if missing: causes.append({"code":"UNKNOWN_REQUIRED_TEACHER","message":f"{a['id']} exige docentes inexistentes.","relatedIds":[a['id']]+missing,"evidence":{}})
        if a.get("siteId") and a.get("siteId") not in site_ids: causes.append({"code":"UNKNOWN_ACTIVITY_SITE","message":f"{a['id']} referencia una sede inexistente.","relatedIds":[a['id'],a['siteId']],"evidence":{}})
    for r in org_rules(inp,"LEADERSHIP_LECTIVE_REDUCTION"):
        for tid in r.get("entityIds",[]):
            t=teachers.get(tid)
            if not t: continue
            mx=effective_teacher_max(t); count=sum(1 for a in activities.values() if a.get("category")=="LECTIVO" and (tid in (a.get("teacherCandidates") or []) or tid in (a.get("requiredTeacherIds") or [])))
            if mx is not None and count>mx: causes.append({"code":"LEADERSHIP_EFFECTIVE_LIMIT","message":f"{tid} necesita {count} sesiones lectivas y su máximo efectivo tras reducción es {mx}.","relatedIds":[tid,r["id"]],"evidence":{"required":count,"maximum":mx}})
    for r in org_rules(inp,"CATEGORY_TARGET_PER_TEACHER"):
        p=r.get("parameters",{}); cat=p.get("category"); target=int(p.get("target",0)); mode=p.get("mode","EXACT")
        for tid in r.get("entityIds",[]):
            possible=sum(1 for a in activities.values() if a.get("category")==cat and (tid in (a.get("teacherCandidates") or []) or tid in (a.get("requiredTeacherIds") or [])))
            if mode=="EXACT" and possible<target: causes.append({"code":"CATEGORY_TARGET_IMPOSSIBLE","message":f"{tid} no dispone de suficientes actividades {cat} para alcanzar {target}.","relatedIds":[tid,r["id"]],"evidence":{"available":possible,"target":target}})
    return causes

def _assigned_teachers(a,ass): return list(dict.fromkeys(([ass.get("teacherId")] if ass.get("teacherId") else [])+(a.get("requiredTeacherIds") or [])))
def _site(a,ass,spaces): return a.get("siteId") or (spaces.get(ass.get("spaceId"),{}).get("siteId") if ass.get("spaceId") else None)

def evaluate(inp,assignments):
    ev=_base_evaluate(inp,assignments); hard=list(ev["hardViolations"]); days,slots,teachers,groups,spaces,activities=maps(inp); by={x["activityId"]:x for x in assignments}; ords={s["id"]:s["ordinal"] for s in slots}
    # Complete occupancy, including compulsory participants.
    occ=defaultdict(list)
    for aid,ass in by.items():
        a=activities.get(aid)
        if not a: continue
        for tid in _assigned_teachers(a,ass): occ[(tid,ass["dayId"],ass["timeSlotId"])].append(aid)
    for (tid,d,s),ids in occ.items():
        if len(ids)>1 and not any(v.get("constraintType")=="REQUIRED_TEACHER_OVERLAP" and tid in v.get("relatedIds",[]) for v in hard): hard.append(base._outcome("HC-REQUIRED-TEACHER","REQUIRED_TEACHER_OVERLAP",False,len(ids)-1,f"{tid} participa en actividades simultáneas.",[tid]+ids))
    # Leadership limits include compulsory support participants.
    lect=Counter()
    for aid,ass in by.items():
        a=activities.get(aid)
        if a and a.get("category")=="LECTIVO":
            for tid in _assigned_teachers(a,ass): lect[tid]+=1
    for tid,n in lect.items():
        mx=effective_teacher_max(teachers.get(tid,{}))
        if mx is not None and n>mx: hard.append(base._outcome("HC-LEADERSHIP-"+tid,"LEADERSHIP_LECTIVE_REDUCTION",False,n-mx,f"{tid} supera su máximo lectivo efectivo.",[tid]))
    # Organizational rules.
    for r in org_rules(inp):
        p=r.get("parameters",{}); typ=r["type"]
        if typ=="CATEGORY_TARGET_PER_TEACHER":
            cat=p.get("category"); target=int(p.get("target",0)); mode=p.get("mode","EXACT")
            for tid in r.get("entityIds",[]):
                n=sum(1 for aid,ass in by.items() if activities.get(aid,{}).get("category")==cat and tid in _assigned_teachers(activities[aid],ass))
                bad=(mode=="EXACT" and n!=target) or (mode=="AT_LEAST" and n<target) or (mode=="AT_MOST" and n>target)
                if bad: hard.append(base._outcome(r["id"],typ,False,abs(n-target),f"{tid}: {cat}={n}, objetivo {mode} {target}.",[tid]))
        elif typ=="MINIMUM_PRESENCE":
            dset=set(p.get("dayIds") or [d["id"] for d in days]); sset=set(p.get("timeSlotIds") or [s["id"] for s in slots]); minimum=int(p.get("minimumTeachers",0))
            for d in dset:
                for s in sset:
                    present=0
                    for tid,t in teachers.items():
                        av=next((x for x in t.get("availability",[]) if x["dayId"]==d and x["timeSlotId"]==s),None)
                        if not av or not av.get("present",False): continue
                        absent=any(activities.get(aid,{}).get("presenceEffect")=="ABSENT" for aid in occ.get((tid,d,s),[]))
                        if not absent: present+=1
                    if present<minimum: hard.append(base._outcome(r["id"],typ,False,minimum-present,f"Presencia {present}, mínimo {minimum}, en {d}/{s}.",[d,s]))
        elif typ=="CONSECUTIVE_BLOCK":
            ids=r.get("entityIds",[])
            for a1,a2 in zip(ids,ids[1:]):
                x,y=by.get(a1),by.get(a2)
                if not x or not y or x["dayId"]!=y["dayId"] or ords.get(y["timeSlotId"],-99)!=ords.get(x["timeSlotId"],0)+1: hard.append(base._outcome(r["id"],typ,False,1,"El bloque no es consecutivo y ordenado.",[a1,a2]))
        elif typ=="DIFFERENT_DAYS":
            used=[by[a]["dayId"] for a in r.get("entityIds",[]) if a in by]
            if len(used)!=len(set(used)): hard.append(base._outcome(r["id"],typ,False,len(used)-len(set(used)),"Las actividades deben distribuirse en días distintos.",r.get("entityIds",[])))
        elif typ=="RECESS_ZONE_COVERAGE":
            for d in p.get("dayIds",[]):
                for z in p.get("zoneSpaceIds",[]):
                    n=sum(1 for aid,ass in by.items() if activities.get(aid,{}).get("organizationalSubtype")=="RECESS_DUTY" and ass.get("dayId")==d and ass.get("timeSlotId")==p.get("timeSlotId") and ass.get("spaceId")==z)
                    mn=int(p.get("minimumPerZone",1))
                    if n<mn: hard.append(base._outcome(r["id"],typ,False,mn-n,"Zona de recreo sin cobertura suficiente.",[d,z]))
        elif typ=="TRAVEL_BUFFER":
            tid=p.get("teacherId"); gap=int(p.get("minimumGapSlots",0)); items=[]
            for aid,ass in by.items():
                a=activities.get(aid)
                if a and tid in _assigned_teachers(a,ass): items.append((aid,ass,_site(a,ass,spaces)))
            for i,(a1,x,s1) in enumerate(items):
                for a2,y,s2 in items[i+1:]:
                    if s1 and s2 and s1!=s2 and x["dayId"]==y["dayId"] and abs(ords[x["timeSlotId"]]-ords[y["timeSlotId"]])<=gap: hard.append(base._outcome(r["id"],typ,False,1,"No se respeta el margen entre sedes.",[tid,a1,a2]))
    ev["hardViolations"]=hard
    return ev

base.activity_options=activity_options; base.structural_precheck=structural_precheck; base.evaluate=evaluate
make_output=base.make_output
