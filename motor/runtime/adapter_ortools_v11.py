from __future__ import annotations

import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

from ortools import __version__ as ORTOOLS_VERSION
from ortools.sat.python import cp_model

from solver_common import activity_options, make_output, maps, option_to_assignment, structural_precheck, utc_now

ADAPTER_VERSION="0.4.2"
ENGINE={"adapterId":"GHF-ORTOOLS-CP-SAT","engineName":"Google OR-Tools CP-SAT (factibilidad + calidad)","engineVersion":ORTOOLS_VERSION,"adapterVersion":ADAPTER_VERSION}


def build_hard_model(inp):
    days, slots, teachers, groups, spaces, activities = maps(inp)
    model=cp_model.CpModel(); options_by_activity={}; var_by_option={}
    for aid,a in activities.items():
        opts=activity_options(inp,a); options_by_activity[aid]=opts; vs=[]
        for oi,opt in enumerate(opts):
            v=model.new_bool_var(f"x__{aid}__{oi}"); var_by_option[(aid,oi)]=v; vs.append(v)
        requested=set(inp["run"].get("requestedActivityIds") or [])
        must_assign = inp["run"].get("mode")=="COMPLETE" or (inp["run"].get("mode")=="PARTIAL" and (aid in requested or (inp["run"].get("preserveAssignments") and a.get("currentAssignment"))))
        model.add(sum(vs)==1 if must_assign else sum(vs)<=1)
    teacher_occ=defaultdict(list); group_occ=defaultdict(list); space_occ=defaultdict(list)
    teacher_lective=defaultdict(list); teacher_day_lective=defaultdict(list)
    for aid,a in activities.items():
        for oi,opt in enumerate(options_by_activity[aid]):
            v=var_by_option[(aid,oi)]
            for ts in opt["coveredTimeSlotIds"]:
                if opt.get("teacherId"): teacher_occ[(opt["teacherId"],opt["dayId"],ts)].append(v)
                for gid in a.get("groupIds") or []: group_occ[(gid,opt["dayId"],ts)].append(v)
                if opt.get("spaceId"): space_occ[(opt["spaceId"],opt["dayId"],ts)].append(v)
            if a.get("category")=="LECTIVO" and opt.get("teacherId"):
                teacher_lective[opt["teacherId"]].append(v); teacher_day_lective[(opt["teacherId"],opt["dayId"])].append(v)
    for vs in teacher_occ.values(): model.add(sum(vs)<=1)
    for vs in group_occ.values(): model.add(sum(vs)<=1)
    for (sid,d,s),vs in space_occ.items(): model.add(sum(vs)<=int(spaces[sid].get("concurrentCapacity") or 1))
    for tid,vs in teacher_lective.items():
        mx=teachers[tid].get("maxLectivePerWeek")
        if mx is not None: model.add(sum(vs)<=int(mx))
    for (tid,d),vs in teacher_day_lective.items():
        mx=teachers[tid].get("maxLectivePerDay")
        if mx is not None: model.add(sum(vs)<=int(mx))
    for c in inp.get("hardConstraints",[]):
        if not c.get("active") or c.get("type")!="SOURCE_RULE_FIJAR": continue
        p=c.get("parameters") or {}; ids=set(c.get("entityIds") or [])
        if c.get("scope") in ("TEACHER","DOCENTE"):
            vs=[]
            for aid,a in activities.items():
                for oi,opt in enumerate(options_by_activity[aid]):
                    if opt.get("teacherId") in ids and opt["dayId"]==p.get("dayId") and p.get("timeSlotId") in opt["coveredTimeSlotIds"]:
                        vs.append(var_by_option[(aid,oi)])
            model.add(sum(vs)>=1)
    sync_groups=defaultdict(list)
    for aid,a in activities.items():
        if a.get("synchronizationGroup"):
            sync_groups[a["synchronizationGroup"]].append(aid)
    starts=[(d["id"],s["id"]) for d in days for s in slots]
    for sg,aids in sync_groups.items():
        if len(aids)<2: continue
        ref=aids[0]
        for other in aids[1:]:
            for day_id,slot_id in starts:
                left=[var_by_option[(ref,oi)] for oi,opt in enumerate(options_by_activity[ref]) if opt["dayId"]==day_id and opt["timeSlotId"]==slot_id]
                right=[var_by_option[(other,oi)] for oi,opt in enumerate(options_by_activity[other]) if opt["dayId"]==day_id and opt["timeSlotId"]==slot_id]
                model.add(sum(left)==sum(right))
    return model,options_by_activity,var_by_option,teacher_occ,teacher_day_lective,(days,slots,teachers,groups,spaces,activities)


def add_soft_model(inp, model, options_by_activity, var_by_option, teacher_occ, teacher_day_lective, ctx):
    days,slots,teachers,groups,spaces,activities=ctx
    objective=[]; soft={c["type"]:c for c in inp.get("softConstraints",[]) if c.get("active")}
    nonbreak=[s for s in slots if s["kind"]!="BREAK"]
    edge_ids={nonbreak[0]["id"],nonbreak[-1]["id"]} if nonbreak else set()
    c=soft.get("PREFER_LD_EDGE")
    if c:
        for aid,a in activities.items():
            if a.get("category")!="LD": continue
            for oi,opt in enumerate(options_by_activity[aid]):
                if opt["timeSlotId"] not in edge_ids: objective.append(int(c["weight"])*var_by_option[(aid,oi)])
    c=soft.get("DISTRIBUTE_AREA_DAYS")
    if c:
        buckets=defaultdict(list)
        for aid,a in activities.items():
            area=next((t for t in a.get("tags",[]) if t.startswith("AREA-")),None)
            if not area: continue
            for gid in a.get("groupIds") or []:
                for oi,opt in enumerate(options_by_activity[aid]): buckets[(gid,area,opt["dayId"])].append(var_by_option[(aid,oi)])
        for key,vs in buckets.items():
            excess=model.new_int_var(0,len(vs),"excess__"+"__".join(key)); model.add(excess>=sum(vs)-1); objective.append(int(c["weight"])*excess)
    occ={}
    for tid in teachers:
        for d in days:
            for s in slots:
                vs=teacher_occ.get((tid,d["id"],s["id"]),[])
                b=model.new_bool_var(f"occ__{tid}__{d['id']}__{s['id']}"); occ[(tid,d["id"],s["id"])]=b
                model.add(sum(vs)==b if vs else b==0)
    c=soft.get("MINIMIZE_TEACHER_GAPS")
    if c:
        ordered=[s for s in slots if s["kind"]!="BREAK"]
        for tid in teachers:
            for d in days:
                for i in range(1,len(ordered)-1):
                    earlier=model.new_bool_var(f"earlier__{tid}__{d['id']}__{i}"); later=model.new_bool_var(f"later__{tid}__{d['id']}__{i}")
                    model.add_max_equality(earlier,[occ[(tid,d["id"],x["id"])] for x in ordered[:i]])
                    model.add_max_equality(later,[occ[(tid,d["id"],x["id"])] for x in ordered[i+1:]])
                    gap=model.new_bool_var(f"gap__{tid}__{d['id']}__{i}"); cur=occ[(tid,d["id"],ordered[i]["id"])]
                    model.add(gap<=earlier); model.add(gap<=later); model.add(gap+cur<=1); model.add(gap>=earlier+later-cur-1)
                    objective.append(int(c["weight"])*gap)
    c=soft.get("AVOID_ISOLATED_SESSION")
    if c:
        for tid in teachers:
            for d in days:
                lect_vs=teacher_day_lective.get((tid,d["id"]),[])
                if not lect_vs: continue
                count=model.new_int_var(0,len(lect_vs),f"lectcount__{tid}__{d['id']}"); model.add(count==sum(lect_vs))
                iso=model.new_bool_var(f"isolated__{tid}__{d['id']}"); model.add(count==1).only_enforce_if(iso); model.add(count!=1).only_enforce_if(iso.Not())
                objective.append(int(c["weight"])*iso)
    c=soft.get("COMPACT_PART_TIME")
    if c:
        for tid,t in teachers.items():
            if (t.get("maxLectivePerWeek") or 999)>=23: continue
            used=[]
            for d in days:
                b=model.new_bool_var(f"dayused__{tid}__{d['id']}"); model.add_max_equality(b,[occ[(tid,d["id"],s["id"])] for s in slots]); used.append(b)
            objective.append(int(c["weight"])*sum(used))
    c=soft.get("BALANCE_FIRST_LAST"); teaching=[s for s in slots if s["kind"]=="TEACHING"]
    if c and teaching:
        first,last=teaching[0]["id"],teaching[-1]["id"]
        for tid in teachers:
            f=sum(occ[(tid,d["id"],first)] for d in days); l=sum(occ[(tid,d["id"],last)] for d in days)
            diff=model.new_int_var(0,len(days),f"firstlastdiff__{tid}"); model.add_abs_equality(diff,f-l); objective.append(int(c["weight"])*diff)
    if objective: model.minimize(sum(objective))


def extract(solver, activities, options_by_activity, var_by_option):
    out=[]
    for aid,a in activities.items():
        for oi,opt in enumerate(options_by_activity[aid]):
            if solver.value(var_by_option[(aid,oi)]): out.append(option_to_assignment(a,opt)); break
    return out


def solve(inp):
    started=utc_now(); t0=time.perf_counter(); total_limit=max(0.001,inp["run"].get("timeLimitMs",5000)/1000)
    structural=structural_precheck(inp)
    exact_codes={"CONTRADICTORY_SOURCE_RULES","GROUP_WEEKLY_CAPACITY","TEACHER_WEEKLY_LECTIVE_LIMIT","EMPTY_ACTIVITY_DOMAIN","SPACE_AGGREGATE_CAPACITY","FIXED_ASSIGNMENT_OVERLAP"}
    if structural and any(c["code"] in exact_codes for c in structural):
        return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status="INFEASIBLE",assignments=[],iterations=0,proof="PROVEN",causes=structural)
    if not inp["activities"]:
        return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status="PARTIAL",assignments=[],iterations=0,proof="PROVEN",causes=[])
    model,opts,vars,teacher_occ,teacher_day_lective,ctx=build_hard_model(inp); activities=ctx[-1]
    # Phase 1: feasibility, deliberately without soft encodings.
    s1=cp_model.CpSolver(); s1.parameters.max_time_in_seconds=min(total_limit,max(2.0,total_limit*0.35)); s1.parameters.random_seed=int(inp["run"].get("seed") or 0); s1.parameters.num_search_workers=1; s1.parameters.stop_after_first_solution=True
    st1=s1.solve(model)
    if st1==cp_model.INFEASIBLE:
        return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status="INFEASIBLE",assignments=[],iterations=int(s1.num_branches),proof="PROVEN",causes=structural+[{"code":"CP_SAT_INFEASIBLE","message":"CP-SAT ha demostrado que el modelo duro no tiene solución.","relatedIds":[],"evidence":{"phase":"FEASIBILITY"}}])
    if st1 not in (cp_model.OPTIMAL,cp_model.FEASIBLE):
        return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status="TIME_LIMIT",assignments=[],iterations=int(s1.num_branches),proof="NOT_AVAILABLE",causes=structural+[{"code":"FEASIBILITY_TIME_LIMIT","message":"No se obtuvo una solución dura dentro del presupuesto de factibilidad.","relatedIds":[],"evidence":{"phase":"FEASIBILITY"}}])
    hard_assignment=extract(s1,activities,opts,vars)
    # Phase 2: add a hint and optimize quality only with the remaining budget (capped at 8 s in P4-1).
    for aid,a in activities.items():
        chosen=next((x for x in hard_assignment if x["activityId"]==aid),None)
        if chosen:
            for oi,opt in enumerate(opts[aid]):
                model.add_hint(vars[(aid,oi)],int(all(chosen.get(k)==opt.get(k) for k in ("dayId","timeSlotId","teacherId","spaceId"))))
    add_soft_model(inp,model,opts,vars,teacher_occ,teacher_day_lective,ctx)
    elapsed=time.perf_counter()-t0; remaining=max(0.0,total_limit-elapsed); quality_budget=min(8.0,remaining)
    if quality_budget<0.05:
        return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status="FEASIBLE",assignments=hard_assignment,iterations=int(s1.num_branches),proof="NOT_AVAILABLE",causes=structural)
    s2=cp_model.CpSolver(); s2.parameters.max_time_in_seconds=quality_budget; s2.parameters.random_seed=int(inp["run"].get("seed") or 0); s2.parameters.num_search_workers=1
    st2=s2.solve(model)
    if st2 in (cp_model.OPTIMAL,cp_model.FEASIBLE): assignments=extract(s2,activities,opts,vars); status="OPTIMAL" if st2==cp_model.OPTIMAL else "FEASIBLE"; proof="PROVEN" if st2==cp_model.OPTIMAL else "NOT_AVAILABLE"; iterations=int(s1.num_branches+s2.num_branches)
    else: assignments=hard_assignment; status="FEASIBLE"; proof="NOT_AVAILABLE"; iterations=int(s1.num_branches+s2.num_branches)
    return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status=status,assignments=assignments,iterations=iterations,proof=proof,causes=structural)


def main():
    ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');args=ap.parse_args()
    inp=json.load(open(args.input,encoding='utf-8'));out=solve(inp);Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({"status":out["status"],"elapsedMs":out["timing"]["elapsedMs"],"assigned":len(out["assignments"]),"softPenalty":out["score"]["softPenalty"]},ensure_ascii=False))
if __name__=='__main__':main()
