from __future__ import annotations

import hashlib
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def canonical_json_bytes(data: Any) -> bytes:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_data(data: Any) -> str:
    return hashlib.sha256(canonical_json_bytes(data)).hexdigest()


def assignment_hash(assignments: list[dict[str, Any]]) -> str:
    normalized = sorted(assignments, key=lambda x: x["activityId"])
    return sha256_data(normalized)


def maps(inp: dict[str, Any]):
    days = sorted(inp["calendar"]["days"], key=lambda x: x["ordinal"])
    slots = sorted(inp["calendar"]["timeSlots"], key=lambda x: x["ordinal"])
    teachers = {x["id"]: x for x in inp["resources"]["teachers"]}
    groups = {x["id"]: x for x in inp["resources"]["groups"]}
    spaces = {x["id"]: x for x in inp["resources"]["spaces"]}
    activities = {x["id"]: x for x in inp["activities"]}
    return days, slots, teachers, groups, spaces, activities


def flattened_slots(inp: dict[str, Any]) -> list[dict[str, Any]]:
    days = sorted(inp["calendar"]["days"], key=lambda x: x["ordinal"])
    slots = sorted(inp["calendar"]["timeSlots"], key=lambda x: x["ordinal"])
    out=[]
    for d in days:
        for s in slots:
            out.append({"dayId":d["id"],"timeSlotId":s["id"],"dayOrdinal":d["ordinal"],"slotOrdinal":s["ordinal"],"kind":s["kind"]})
    return out


def slot_key(day_id: str, time_slot_id: str) -> str:
    return f"{day_id}|{time_slot_id}"


def teacher_availability(teacher: dict[str, Any]) -> dict[str, dict[str, bool]]:
    return {slot_key(a["dayId"],a["timeSlotId"]): a for a in teacher.get("availability", [])}


def activity_slot_allowed(activity: dict[str, Any], kind: str) -> bool:
    allowed = set(activity.get("allowedSlotKinds") or [])
    forbidden = set(activity.get("forbiddenSlotKinds") or [])
    return bool(allowed) and kind in allowed and kind not in forbidden


def effective_space_ids(activity: dict[str, Any]) -> list[str]:
    alternatives = activity.get("requiredSpaceAlternatives") or []
    required_ids=[]
    for alt in alternatives:
        if alt.get("required") and alt.get("mode")=="ANY_ONE":
            required_ids.extend(alt.get("spaceIds") or [])
    ids = required_ids or list(activity.get("spaceCandidates") or [])
    return list(dict.fromkeys(ids))


def contract_semantic_errors(inp: dict[str, Any]) -> list[dict[str, Any]]:
    errors=[]
    slot_kinds={s["kind"] for s in inp.get("calendar",{}).get("timeSlots",[])}
    space_ids={s["id"] for s in inp.get("resources",{}).get("spaces",[])}
    for a in inp.get("activities",[]):
        allowed=set(a.get("allowedSlotKinds") or [])
        forbidden=set(a.get("forbiddenSlotKinds") or [])
        overlap=sorted(allowed & forbidden)
        if overlap:
            errors.append({"code":"SLOT_KIND_CONTRADICTION","message":f"La actividad {a['id']} permite y prohíbe los mismos tipos de franja.","relatedIds":[a['id']],"evidence":{"overlap":overlap}})
        for alt in a.get("requiredSpaceAlternatives") or []:
            missing=sorted(set(alt.get("spaceIds") or [])-space_ids)
            if missing:
                errors.append({"code":"UNKNOWN_SPACE_ALTERNATIVE","message":f"La actividad {a['id']} referencia espacios alternativos inexistentes.","relatedIds":[a['id']]+missing,"evidence":{"alternativeId":alt.get('id')}})
    return errors


def specialty_compatible(teacher: dict[str, Any], activity: dict[str, Any]) -> bool:
    required = set(activity.get("requiredSpecialties") or [])
    if not required:
        return True
    return bool(required.intersection(set(teacher.get("specialties") or [])))


def fixed_constraint_for(inp: dict[str, Any], activity_id: str) -> dict[str, Any] | None:
    for c in inp.get("hardConstraints", []):
        if c.get("active") and c.get("type") == "FIXED_ASSIGNMENT" and activity_id in c.get("entityIds", []):
            return c.get("parameters") or {}
    return None


def source_rule_sets(inp: dict[str, Any]):
    fixed=[]; blocked=[]
    for c in inp.get("hardConstraints", []):
        if not c.get("active"): continue
        if c.get("type") == "SOURCE_RULE_FIJAR": fixed.append(c)
        if c.get("type") == "SOURCE_RULE_BLOQUEAR": blocked.append(c)
    return fixed, blocked


def activity_options(inp: dict[str, Any], activity: dict[str, Any]) -> list[dict[str, Any]]:
    days, slots, teachers, groups, spaces, activities = maps(inp)
    slot_pos = {s["id"]:i for i,s in enumerate(slots)}
    availability = {tid:teacher_availability(t) for tid,t in teachers.items()}
    options=[]
    fixed = fixed_constraint_for(inp, activity["id"])
    if activity.get("locked") and inp["run"].get("preserveAssignments") and activity.get("currentAssignment"):
        fixed = dict(activity["currentAssignment"])
    if inp["run"].get("mode") == "PARTIAL" and inp["run"].get("preserveAssignments"):
        requested=set(inp["run"].get("requestedActivityIds") or [])
        if activity["id"] not in requested and activity.get("currentAssignment"):
            fixed = dict(activity["currentAssignment"])
    teacher_ids = activity.get("teacherCandidates") or [None]
    space_ids = effective_space_ids(activity) or [None]
    if activity.get("spaceRequired") and not effective_space_ids(activity):
        return []
    for d in days:
        for start_idx, s in enumerate(slots):
            duration = max(1, int(activity.get("durationSlots") or 1))
            covered = slots[start_idx:start_idx+duration]
            if len(covered) != duration: continue
            if any(not activity_slot_allowed(activity, cs["kind"]) for cs in covered): continue
            for tid in teacher_ids:
                if tid is not None:
                    teacher=teachers.get(tid)
                    if not teacher or not teacher.get("active", True): continue
                    if not specialty_compatible(teacher, activity): continue
                    av=availability.get(tid,{})
                    if any(not av.get(slot_key(d["id"],cs["id"]), {"available":False}).get("available",False) for cs in covered):
                        continue
                for sid in space_ids:
                    if sid is not None and (sid not in spaces or not spaces[sid].get("active",True)): continue
                    opt={
                        "dayId":d["id"],"timeSlotId":s["id"],"teacherId":tid,"spaceId":sid,
                        "coveredTimeSlotIds":[cs["id"] for cs in covered],
                    }
                    if fixed:
                        for k in ("dayId","timeSlotId","teacherId","spaceId"):
                            if k in fixed and fixed[k] is not None and opt.get(k) != fixed[k]:
                                break
                        else:
                            options.append(opt)
                    else:
                        options.append(opt)
    # Apply blocking source rules.
    _, blocked = source_rule_sets(inp)
    clean=[]
    for opt in options:
        forbidden=False
        for c in blocked:
            p=c.get("parameters") or {}; ids=set(c.get("entityIds") or [])
            if c.get("scope") in ("TEACHER","DOCENTE") and opt.get("teacherId") in ids:
                if p.get("dayId")==opt["dayId"] and p.get("timeSlotId") in opt["coveredTimeSlotIds"]:
                    forbidden=True; break
        if not forbidden: clean.append(opt)
    return clean


def structural_precheck(inp: dict[str, Any]) -> list[dict[str, Any]]:
    days, slots, teachers, groups, spaces, activities = maps(inp)
    causes=contract_semantic_errors(inp)
    teaching_slots=[(d["id"],s["id"]) for d in days for s in slots if s["kind"]=="TEACHING"]
    # Direct contradictory source rules.
    fixed, blocked = source_rule_sets(inp)
    for f in fixed:
        fp=f.get("parameters") or {}; fids=set(f.get("entityIds") or [])
        for b in blocked:
            bp=b.get("parameters") or {}; bids=set(b.get("entityIds") or [])
            if f.get("scope")==b.get("scope") and fids.intersection(bids) and fp.get("dayId")==bp.get("dayId") and fp.get("timeSlotId")==bp.get("timeSlotId"):
                causes.append({"code":"CONTRADICTORY_SOURCE_RULES","message":"Una misma entidad está obligada y bloqueada en la misma franja.","relatedIds":sorted(fids.intersection(bids))+[f["id"],b["id"]],"evidence":{"dayId":fp.get("dayId"),"timeSlotId":fp.get("timeSlotId")}})
    # Group capacity in teaching slots.
    group_counts=Counter()
    for a in activities.values():
        if a.get("category")=="LECTIVO":
            for gid in a.get("groupIds") or []: group_counts[gid]+=int(a.get("durationSlots") or 1)
    for gid,count in group_counts.items():
        if count>len(teaching_slots):
            causes.append({"code":"GROUP_WEEKLY_CAPACITY","message":f"El grupo {gid} necesita {count} tramos lectivos y solo existen {len(teaching_slots)}.","relatedIds":[gid],"evidence":{"required":count,"available":len(teaching_slots)}})
    # Teacher weekly capacity and availability-domain capacity.
    teacher_lective=Counter(); teacher_total=Counter()
    for a in activities.values():
        for tid in a.get("teacherCandidates") or []:
            teacher_total[tid]+=int(a.get("durationSlots") or 1)
            if a.get("category")=="LECTIVO": teacher_lective[tid]+=int(a.get("durationSlots") or 1)
    for tid,count in teacher_lective.items():
        t=teachers.get(tid)
        if t and t.get("maxLectivePerWeek") is not None and count>t["maxLectivePerWeek"]:
            causes.append({"code":"TEACHER_WEEKLY_LECTIVE_LIMIT","message":f"El docente {tid} tiene {count} sesiones lectivas candidatas para un máximo de {t['maxLectivePerWeek']}.","relatedIds":[tid],"evidence":{"required":count,"maximum":t["maxLectivePerWeek"]}})
    # Empty domains.
    for a in activities.values():
        opts=activity_options(inp,a)
        if not opts:
            causes.append({"code":"EMPTY_ACTIVITY_DOMAIN","message":f"La actividad {a['id']} no dispone de ninguna asignación compatible.","relatedIds":[a["id"]]+list(a.get("teacherCandidates") or [])+list(a.get("groupIds") or []),"evidence":{"category":a.get("category"),"locked":bool(a.get("locked"))}})
    # Required space aggregate capacity (necessary condition only).
    for sid,space in spaces.items():
        req=sum(int(a.get("durationSlots") or 1) for a in activities.values() if a.get("spaceRequired") and effective_space_ids(a)==[sid])
        cap=int(space.get("concurrentCapacity") or 1)*len(teaching_slots)
        if req>cap:
            causes.append({"code":"SPACE_AGGREGATE_CAPACITY","message":f"El espacio {sid} requiere {req} usos lectivos y su capacidad agregada es {cap}.","relatedIds":[sid],"evidence":{"required":req,"capacity":cap}})
    # Locked overlap exact check.
    locked=[]
    for a in activities.values():
        f=fixed_constraint_for(inp,a["id"])
        if a.get("locked") and inp["run"].get("preserveAssignments") and a.get("currentAssignment"):
            f=a["currentAssignment"]
        if f: locked.append((a,f))
    for i,(a,fa) in enumerate(locked):
        for b,fb in locked[i+1:]:
            if fa.get("dayId")!=fb.get("dayId") or fa.get("timeSlotId")!=fb.get("timeSlotId"): continue
            common_teacher=set([fa.get("teacherId")])-set([None]) & (set([fb.get("teacherId")])-set([None]))
            common_group=set(a.get("groupIds") or []) & set(b.get("groupIds") or [])
            common_space=set([fa.get("spaceId")])-set([None]) & (set([fb.get("spaceId")])-set([None]))
            if common_teacher or common_group or common_space:
                causes.append({"code":"FIXED_ASSIGNMENT_OVERLAP","message":"Dos asignaciones obligatorias se solapan en un recurso exclusivo.","relatedIds":[a["id"],b["id"]]+sorted(common_teacher|common_group|common_space),"evidence":{"dayId":fa.get("dayId"),"timeSlotId":fa.get("timeSlotId")}})
    sync_groups=defaultdict(list)
    for a in activities.values():
        if a.get("synchronizationGroup"):
            sync_groups[a["synchronizationGroup"]].append(a)
    for sg,acts in sync_groups.items():
        if len(acts)<2: continue
        domains=[]
        for a in acts:
            domains.append({(o["dayId"],o["timeSlotId"]) for o in activity_options(inp,a)})
        common_starts=set.intersection(*domains) if domains else set()
        if not common_starts:
            causes.append({"code":"SYNCHRONIZATION_EMPTY_INTERSECTION","message":f"El grupo de sincronización {sg} no tiene ningún inicio común.","relatedIds":[a["id"] for a in acts],"evidence":{"synchronizationGroup":sg}})
    # Deduplicate exact code+related.
    seen=set(); out=[]
    for c in causes:
        key=(c["code"],tuple(c["relatedIds"]))
        if key not in seen: seen.add(key); out.append(c)
    return out


def option_to_assignment(activity: dict[str, Any], opt: dict[str, Any]) -> dict[str, Any]:
    return {"activityId":activity["id"],"dayId":opt["dayId"],"timeSlotId":opt["timeSlotId"],"teacherId":opt.get("teacherId"),"spaceId":opt.get("spaceId"),"preservedLock":bool(activity.get("locked") and activity.get("currentAssignment"))}


def assignment_index(assignments: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {a["activityId"]:a for a in assignments}


def evaluate(inp: dict[str, Any], assignments: list[dict[str, Any]]) -> dict[str, Any]:
    days, slots, teachers, groups, spaces, activities = maps(inp)
    by_id=assignment_index(assignments)
    slot_kind={s["id"]:s["kind"] for s in slots}
    slot_ord={s["id"]:s["ordinal"] for s in slots}
    day_ord={d["id"]:d["ordinal"] for d in days}
    hard=[]
    # Missing/unknown/duplicates.
    counts=Counter(a["activityId"] for a in assignments)
    for aid,n in counts.items():
        if n>1:
            hard.append(_outcome("OUTPUT-DUPLICATE","OUTPUT_DUPLICATE_ACTIVITY",False,n-1,f"La actividad {aid} aparece {n} veces.",[aid]))
        if aid not in activities:
            hard.append(_outcome("OUTPUT-UNKNOWN","OUTPUT_UNKNOWN_ACTIVITY",False,1,f"La salida contiene una actividad desconocida: {aid}.",[aid]))
    # Validate each assignment against a generated option.
    for aid,ass in by_id.items():
        a=activities.get(aid)
        if not a: continue
        valid_opts=activity_options(inp,a)
        if not any(all(ass.get(k)==o.get(k) for k in ("dayId","timeSlotId","teacherId","spaceId")) for o in valid_opts):
            hard.append(_outcome("HC-DOMAIN","ASSIGNMENT_OUTSIDE_DOMAIN",False,1,f"La actividad {aid} está fuera de su dominio permitido.",[aid]+[x for x in [ass.get("teacherId"),ass.get("spaceId")] if x]))
    # Resource overlaps.
    teacher_occ=defaultdict(list); group_occ=defaultdict(list); space_occ=defaultdict(list)
    for aid,ass in by_id.items():
        a=activities.get(aid)
        if not a: continue
        key=(ass["dayId"],ass["timeSlotId"])
        if ass.get("teacherId"): teacher_occ[(ass["teacherId"],)+key].append(aid)
        for gid in a.get("groupIds") or []: group_occ[(gid,)+key].append(aid)
        if ass.get("spaceId"): space_occ[(ass["spaceId"],)+key].append(aid)
    for (tid,d,s),ids in teacher_occ.items():
        if len(ids)>1: hard.append(_outcome("HC-NO_TEACHER_OVERLAP","NO_TEACHER_OVERLAP",False,len(ids)-1,f"El docente {tid} tiene {len(ids)} actividades simultáneas.",[tid]+ids))
    for (gid,d,s),ids in group_occ.items():
        if len(ids)>1: hard.append(_outcome("HC-NO_GROUP_OVERLAP","NO_GROUP_OVERLAP",False,len(ids)-1,f"El grupo {gid} tiene {len(ids)} actividades simultáneas.",[gid]+ids))
    for (sid,d,s),ids in space_occ.items():
        cap=int(spaces.get(sid,{}).get("concurrentCapacity") or 1)
        if len(ids)>cap: hard.append(_outcome("HC-SPACE_CAPACITY","SPACE_CAPACITY",False,len(ids)-cap,f"El espacio {sid} supera su capacidad simultánea.",[sid]+ids))
    # Weekly/daily lective limits.
    weekly=Counter(); daily=Counter()
    for aid,ass in by_id.items():
        a=activities.get(aid)
        if a and a.get("category")=="LECTIVO" and ass.get("teacherId"):
            weekly[ass["teacherId"]]+=1; daily[(ass["teacherId"],ass["dayId"])]+=1
    for tid,count in weekly.items():
        t=teachers.get(tid,{})
        mx=t.get("maxLectivePerWeek")
        if mx is not None and count>mx: hard.append(_outcome("HC-WEEKLY_LECTIVE_LIMIT","WEEKLY_LECTIVE_LIMIT",False,count-mx,f"{tid} supera el máximo lectivo semanal.",[tid]))
    for (tid,d),count in daily.items():
        mx=teachers.get(tid,{}).get("maxLectivePerDay")
        if mx is not None and count>mx: hard.append(_outcome("HC-DAILY_LECTIVE_LIMIT","DAILY_LECTIVE_LIMIT",False,count-mx,f"{tid} supera el máximo lectivo diario.",[tid,d]))
    # Source fixed rule requirement.
    fixed_rules,_=source_rule_sets(inp)
    for c in fixed_rules:
        p=c.get("parameters") or {}; ids=set(c.get("entityIds") or [])
        if c.get("scope") in ("TEACHER","DOCENTE"):
            ok=any(a.get("teacherId") in ids and a.get("dayId")==p.get("dayId") and a.get("timeSlotId")==p.get("timeSlotId") for a in assignments)
            if not ok: hard.append(_outcome(c["id"],c["type"],False,1,"No se cumple la fijación obligatoria de fuente.",list(ids)+[p.get("dayId"),p.get("timeSlotId")]))
    sync_groups=defaultdict(list)
    for aid,ass in by_id.items():
        a=activities.get(aid)
        if a and a.get("synchronizationGroup"):
            sync_groups[a["synchronizationGroup"]].append((aid,ass))
    for sg,items in sync_groups.items():
        starts={(ass.get("dayId"),ass.get("timeSlotId")) for _,ass in items}
        expected=sum(1 for a in activities.values() if a.get("synchronizationGroup")==sg)
        if len(items)!=expected or len(starts)!=1:
            hard.append(_outcome(f"HC-SYNC-{sg}","SYNCHRONIZATION_GROUP",False,1,f"Las actividades de {sg} no comienzan simultáneamente.",[aid for aid,_ in items]))
    # Soft outcomes.
    components={}; soft=[]
    soft_by_type={c["type"]:c for c in inp.get("softConstraints",[]) if c.get("active")}
    teacher_day_slots=defaultdict(set); teacher_day_lective=defaultdict(set)
    group_area_days=defaultdict(Counter)
    for aid,ass in by_id.items():
        a=activities.get(aid)
        if not a: continue
        tid=ass.get("teacherId")
        if tid:
            teacher_day_slots[(tid,ass["dayId"])].add(ass["timeSlotId"])
            if a.get("category")=="LECTIVO": teacher_day_lective[(tid,ass["dayId"])].add(ass["timeSlotId"])
        area=next((t for t in a.get("tags",[]) if t.startswith("AREA-")),None)
        if area:
            for gid in a.get("groupIds") or []: group_area_days[(gid,area)][ass["dayId"]]+=1
    # Gaps.
    c=soft_by_type.get("MINIMIZE_TEACHER_GAPS")
    if c:
        pen=0; related=[]
        ordered=[s["id"] for s in slots if s["kind"]!="BREAK"]
        for (tid,d),used in teacher_day_slots.items():
            idx=[i for i,x in enumerate(ordered) if x in used]
            if len(idx)>=2:
                gaps=sum(1 for i in range(min(idx)+1,max(idx)) if ordered[i] not in used)
                if gaps: pen+=gaps*c["weight"]; related.extend([tid,d])
        components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"Huecos internos del profesorado.",sorted(set(related)),c["weight"]))
    # First/last balance.
    c=soft_by_type.get("BALANCE_FIRST_LAST")
    if c:
        teaching=[s["id"] for s in slots if s["kind"]=="TEACHING"]
        pen=0; related=[]
        if teaching:
            first,last=teaching[0],teaching[-1]
            for tid in teachers:
                fc=sum(first in teacher_day_lective.get((tid,d["id"]),set()) for d in days)
                lc=sum(last in teacher_day_lective.get((tid,d["id"]),set()) for d in days)
                diff=abs(fc-lc)
                if diff: pen+=diff*c["weight"]; related.append(tid)
        components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"Desequilibrio entre primeras y últimas sesiones.",related,c["weight"]))
    # Area distribution.
    c=soft_by_type.get("DISTRIBUTE_AREA_DAYS")
    if c:
        excess=0; related=[]
        for (gid,area),counts in group_area_days.items():
            e=sum(max(0,n-1) for n in counts.values())
            if e: excess+=e; related.extend([gid,area])
        pen=excess*c["weight"]; components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"Repeticiones del mismo ámbito en un día.",sorted(set(related)),c["weight"]))
    # Compact part-time.
    c=soft_by_type.get("COMPACT_PART_TIME")
    if c:
        pen=0; related=[]
        for tid,t in teachers.items():
            if (t.get("maxLectivePerWeek") or 999)<23:
                used=sum(bool(teacher_day_slots.get((tid,d["id"]))) for d in days)
                if used>1: pen+=(used-1)*c["weight"]; related.append(tid)
        components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"Días de presencia del profesorado parcial.",related,c["weight"]))
    # Isolated lective session.
    c=soft_by_type.get("AVOID_ISOLATED_SESSION")
    if c:
        n=0; related=[]
        for (tid,d),used in teacher_day_lective.items():
            if len(used)==1: n+=1; related.extend([tid,d])
        pen=n*c["weight"]; components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"Jornadas con una única sesión lectiva.",sorted(set(related)),c["weight"]))
    # LD edge.
    c=soft_by_type.get("PREFER_LD_EDGE")
    if c:
        nonbreak=[s["id"] for s in slots if s["kind"]!="BREAK"]
        edges=set(nonbreak[:1]+nonbreak[-1:]); n=0; related=[]
        for aid,ass in by_id.items():
            a=activities.get(aid)
            if a and a.get("category")=="LD" and ass["timeSlotId"] not in edges:
                n+=1; related.append(aid)
        pen=n*c["weight"]; components[c["id"]]=pen; soft.append(_outcome(c["id"],c["type"],pen==0,pen,"LD fuera de los extremos de la jornada.",related,c["weight"]))
    total=sum(components.values())
    scale=max(1,len(activities)*10)
    quality=round(100/(1+total/scale),4)
    return {"hardViolations":hard,"softOutcomes":soft,"softPenalty":float(total),"normalizedQuality":quality,"components":{k:float(v) for k,v in components.items()}}


def _outcome(cid: str, ctype: str, satisfied: bool, penalty: float, message: str, related: Iterable[str], weight: int|None=None):
    out={"constraintId":cid,"constraintType":ctype,"satisfied":bool(satisfied),"penalty":float(max(0,penalty)),"message":message,"relatedIds":[str(x) for x in related if x is not None]}
    if weight is not None: out["weight"]=int(weight)
    return out


def diagnostics_from_causes(causes: list[dict[str,Any]], proof: str, status: str) -> dict[str,Any]:
    suggestions=[]
    codes={c["code"] for c in causes}
    if "GROUP_WEEKLY_CAPACITY" in codes: suggestions.append({"code":"REDUCE_GROUP_LOAD","message":"Reducir necesidades del grupo o ampliar el calendario lectivo.","impact":"HIGH","relatedIds":sum((c["relatedIds"] for c in causes if c["code"]=="GROUP_WEEKLY_CAPACITY"),[])})
    if "TEACHER_WEEKLY_LECTIVE_LIMIT" in codes: suggestions.append({"code":"ADD_TEACHER_CAPACITY","message":"Aumentar disponibilidad compatible o reasignar sesiones a otro docente habilitado.","impact":"HIGH","relatedIds":sum((c["relatedIds"] for c in causes if c["code"]=="TEACHER_WEEKLY_LECTIVE_LIMIT"),[])})
    if "CONTRADICTORY_SOURCE_RULES" in codes: suggestions.append({"code":"RESOLVE_RULE_CONTRADICTION","message":"Retirar o modificar una de las dos reglas obligatorias contradictorias.","impact":"HIGH","relatedIds":sum((c["relatedIds"] for c in causes if c["code"]=="CONTRADICTORY_SOURCE_RULES"),[])})
    if "EMPTY_ACTIVITY_DOMAIN" in codes: suggestions.append({"code":"EXPAND_ACTIVITY_DOMAIN","message":"Revisar disponibilidad, especialidad, espacio o fijación de las actividades sin dominio.","impact":"HIGH","relatedIds":sum((c["relatedIds"] for c in causes if c["code"]=="EMPTY_ACTIVITY_DOMAIN"),[])})
    if "SPACE_AGGREGATE_CAPACITY" in codes: suggestions.append({"code":"EXPAND_SPACE_CAPACITY","message":"Ampliar franjas, capacidad o espacios alternativos compatibles.","impact":"HIGH","relatedIds":sum((c["relatedIds"] for c in causes if c["code"]=="SPACE_AGGREGATE_CAPACITY"),[])})
    if not suggestions and status in ("FEASIBLE","OPTIMAL"):
        suggestions.append({"code":"REVIEW_SOFT_SCORE","message":"Revisar las preferencias penalizadas antes de aceptar la propuesta.","impact":"LOW","relatedIds":[]})
    summary = "Solución completa sin infracciones obligatorias." if status in ("FEASIBLE","OPTIMAL") else ("La entrada no contiene actividades suficientes para generar un horario." if status=="PARTIAL" and not causes else "No se ha obtenido una solución completa válida.")
    return {"summary":summary,"causes":causes,"suggestions":suggestions,"proofLevel":proof}


def make_output(inp: dict[str,Any], *, engine: dict[str,str], started: str, finished: str, elapsed_ms: int, status: str, assignments: list[dict[str,Any]], iterations: int|None, proof: str, causes: list[dict[str,Any]]|None=None, error: dict[str,Any]|None=None) -> dict[str,Any]:
    causes=list(causes or [])
    ev=evaluate(inp,assignments)
    hard=ev["hardViolations"]
    if hard and status in ("FEASIBLE","OPTIMAL"):
        status="ERROR"; error={"code":"ADAPTER_INVALID_FEASIBLE_OUTPUT","message":"El adaptador produjo una salida declarada válida con infracciones obligatorias.","details":{"hardViolationCount":len(hard)}}
    all_ids=[a["id"] for a in inp["activities"]]
    assigned={a["activityId"] for a in assignments}
    unassigned=[x for x in all_ids if x not in assigned]
    if not inp["activities"] and status not in ("ERROR","CANCELLED"):
        status="PARTIAL"; causes.append({"code":"INPUT_WITHOUT_ACTIVITIES","message":"La entrada no contiene actividades; no puede evaluarse un horario completo.","relatedIds":[inp["run"]["scenarioId"]],"evidence":{"activityCount":0}}); proof="PROVEN"
    quality = ev["normalizedQuality"] if status in ("OPTIMAL","FEASIBLE") else None
    out={
        "schemaId":"ghf_solver_output_1.0","contractVersion":"1.0","runId":inp["run"]["runId"],"status":status,
        "engine":engine,
        "timing":{"startedAt":started,"finishedAt":finished,"elapsedMs":int(max(0,elapsed_ms)),"iterations":iterations},
        "assignments":sorted(assignments,key=lambda x:x["activityId"]),"unassignedActivityIds":unassigned,
        "score":{"hardViolationCount":len(hard),"softPenalty":ev["softPenalty"],"normalizedQuality":quality,"components":ev["components"]},
        "hardViolations":hard,"softOutcomes":ev["softOutcomes"],
        "diagnostics":diagnostics_from_causes(causes,proof,status),
        "reproducibility":{"seed":int(inp["run"].get("seed") or 0),"deterministicRequested":True,"inputSha256":sha256_data(inp),"assignmentSha256":assignment_hash(assignments)},
        "outputHashAlgorithm":"SHA-256","error":error,
    }
    return out
