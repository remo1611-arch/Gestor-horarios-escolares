from __future__ import annotations

import argparse
import json
import random
import time
from collections import defaultdict
from pathlib import Path

from solver_common import activity_options, evaluate, make_output, maps, option_to_assignment, structural_precheck, utc_now, all_teacher_ids

ENGINE={"adapterId":"GHF-DSATUR-MINCONFLICTS","engineName":"GHF Heurístico DSATUR + min-conflicts","engineVersion":"0.1.0","adapterVersion":"0.4.3"}


def conflict(a,b,spaces):
    if (set(a.get("teacherCandidates") or [])|set(a.get("requiredTeacherIds") or [])) & (set(b.get("teacherCandidates") or [])|set(b.get("requiredTeacherIds") or [])): return True
    if set(a.get("groupIds") or []) & set(b.get("groupIds") or []): return True
    common=set(a.get("spaceCandidates") or []) & set(b.get("spaceCandidates") or [])
    return any(int(spaces.get(s,{}).get("concurrentCapacity") or 1)<=1 for s in common)


def solve_once(inp, seed, deadline):
    days, slots, teachers, groups, spaces, activities=maps(inp)
    rng=random.Random(seed)
    aids=list(activities)
    options={aid:activity_options(inp,activities[aid]) for aid in aids}
    # Current benchmark cases have a single teacher/space combination per activity; keep all option tuples for generality.
    adj={aid:set() for aid in aids}
    for i,aid in enumerate(aids):
        a=activities[aid]
        for bid in aids[i+1:]:
            if conflict(a,activities[bid],spaces): adj[aid].add(bid); adj[bid].add(aid)
    assigned={}; chosen={}
    # Precolored activities with a single option due to a lock/fix.
    for aid in aids:
        if len(options[aid])==1 and (activities[aid].get("locked") or any(c.get("type")=="FIXED_ASSIGNMENT" and aid in c.get("entityIds",[]) for c in inp.get("hardConstraints",[]))):
            assigned[aid]=(options[aid][0]["dayId"],options[aid][0]["timeSlotId"]); chosen[aid]=options[aid][0]
    def opt_color(o): return (o["dayId"],o["timeSlotId"])
    def feasible(aid,opt):
        col=opt_color(opt)
        for n in sorted(adj[aid]):
            if n in assigned and assigned[n]==col: return False
        return True
    nonbreak=[s for s in slots if s["kind"]!="BREAK"]
    edges={nonbreak[0]["id"],nonbreak[-1]["id"]} if nonbreak else set()
    area_day=defaultdict(int); teacher_day_slots=defaultdict(set)
    for aid,opt in chosen.items():
        a=activities[aid]; area=next((t for t in a.get("tags",[]) if t.startswith("AREA-")),None)
        if area:
            for gid in a.get("groupIds") or []: area_day[(gid,area,opt["dayId"])]+=1
        if opt.get("teacherId"): teacher_day_slots[(opt["teacherId"],opt["dayId"])].add(opt["timeSlotId"])
    soft={c["type"]:c for c in inp.get("softConstraints",[]) if c.get("active")}
    def incremental(aid,opt):
        a=activities[aid]; cost=0
        if a.get("category")=="LD" and opt["timeSlotId"] not in edges and "PREFER_LD_EDGE" in soft: cost+=soft["PREFER_LD_EDGE"]["weight"]
        area=next((t for t in a.get("tags",[]) if t.startswith("AREA-")),None)
        if area and "DISTRIBUTE_AREA_DAYS" in soft:
            for gid in a.get("groupIds") or []: cost+=area_day[(gid,area,opt["dayId"])]*soft["DISTRIBUTE_AREA_DAYS"]["weight"]
        if opt.get("teacherId") and "MINIMIZE_TEACHER_GAPS" in soft:
            used=teacher_day_slots[(opt["teacherId"],opt["dayId"])]
            if used:
                ords={s["id"]:s["ordinal"] for s in slots}; vals=[ords[x] for x in used]+[ords[opt["timeSlotId"]]]
                cost+=(max(vals)-min(vals)+1-len(set(vals)))*soft["MINIMIZE_TEACHER_GAPS"]["weight"]
        return cost
    uncolored=set(aids)-set(assigned)
    iterations=0
    while uncolored:
        if time.perf_counter()>=deadline: break
        # DSATUR selection.
        ranked=[]
        for aid in sorted(uncolored):
            sat=len({assigned[n] for n in sorted(adj[aid]) if n in assigned})
            domain=sum(1 for o in options[aid] if feasible(aid,o))
            ranked.append((sat,len(adj[aid]),-domain,rng.random(),aid))
        aid=max(ranked)[-1]
        candidates=[o for o in options[aid] if feasible(aid,o)]
        if not candidates: break
        rng.shuffle(candidates); candidates.sort(key=lambda o:(incremental(aid,o),sum(1 for n in sorted(adj[aid]) if n in uncolored and any(opt_color(no)==opt_color(o) for no in options[n]))))
        opt=candidates[0]; assigned[aid]=opt_color(opt); chosen[aid]=opt; uncolored.remove(aid); iterations+=1
        a=activities[aid]; area=next((t for t in a.get("tags",[]) if t.startswith("AREA-")),None)
        if area:
            for gid in a.get("groupIds") or []: area_day[(gid,area,opt["dayId"])]+=1
        if opt.get("teacherId"): teacher_day_slots[(opt["teacherId"],opt["dayId"])].add(opt["timeSlotId"])
    assignments=[option_to_assignment(activities[aid],opt) for aid,opt in chosen.items()]
    return assignments,iterations


def solve(inp):
    started=utc_now(); t0=time.perf_counter(); deadline=t0+max(0.001,inp["run"].get("timeLimitMs",5000)/1000)
    structural=structural_precheck(inp)
    exact_codes={"CONTRADICTORY_SOURCE_RULES","GROUP_WEEKLY_CAPACITY","TEACHER_WEEKLY_LECTIVE_LIMIT","EMPTY_ACTIVITY_DOMAIN","SPACE_AGGREGATE_CAPACITY","FIXED_ASSIGNMENT_OVERLAP"}
    if structural and any(c["code"] in exact_codes for c in structural):
        finished=utc_now(); return make_output(inp,engine=ENGINE,started=started,finished=finished,elapsed_ms=round((time.perf_counter()-t0)*1000),status="INFEASIBLE",assignments=[],iterations=0,proof="EXACT_CORE",causes=structural)
    if not inp["activities"]:
        finished=utc_now(); return make_output(inp,engine=ENGINE,started=started,finished=finished,elapsed_ms=round((time.perf_counter()-t0)*1000),status="PARTIAL",assignments=[],iterations=0,proof="PROVEN",causes=[])
    best=[]; best_eval=None; total_iterations=0; restart=0
    base_seed=int(inp["run"].get("seed") or 0)
    while time.perf_counter()<deadline and restart<64:
        ass,it=solve_once(inp,base_seed+restart*7919,deadline); total_iterations+=it
        ev=evaluate(inp,ass)
        rank=(len(ass),-len(ev["hardViolations"]),-ev["softPenalty"])
        if best_eval is None or rank>(len(best),-len(best_eval["hardViolations"]),-best_eval["softPenalty"]): best,best_eval=ass,ev
        if len(best)==len(inp["activities"]) and not best_eval["hardViolations"]: break
        restart+=1
    complete=len(best)==len(inp["activities"]) and best_eval is not None and not best_eval["hardViolations"]
    status="FEASIBLE" if complete else ("TIME_LIMIT" if time.perf_counter()>=deadline else "PARTIAL")
    causes=structural
    if not complete:
        causes=causes+[{"code":"HEURISTIC_INCOMPLETE","message":"El heurístico no encontró una asignación completa; esto no demuestra inviabilidad.","relatedIds":[a["id"] for a in inp["activities"] if a["id"] not in {x["activityId"] for x in best}],"evidence":{"assigned":len(best),"total":len(inp["activities"]),"restarts":restart+1}}]
    finished=utc_now(); return make_output(inp,engine=ENGINE,started=started,finished=finished,elapsed_ms=round((time.perf_counter()-t0)*1000),status=status,assignments=best,iterations=total_iterations,proof="HEURISTIC",causes=causes)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('output'); args=ap.parse_args()
    inp=json.load(open(args.input,encoding='utf-8')); out=solve(inp)
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({"status":out["status"],"elapsedMs":out["timing"]["elapsedMs"],"assigned":len(out["assignments"]),"softPenalty":out["score"]["softPenalty"]},ensure_ascii=False))

if __name__=='__main__': main()
