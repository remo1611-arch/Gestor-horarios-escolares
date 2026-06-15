from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from ortools import __version__ as ORTOOLS_VERSION
from ortools.sat.python import cp_model

from solver_common import evaluate, make_output, structural_precheck, utc_now
from adapter_heuristico_v12 import solve_once
from adapter_ortools_v12 import build_hard_model
from adapter_ortools_v11 import add_soft_model, extract

ENGINE={"adapterId":"GHF-HYBRID-DSATUR-CPSAT","engineName":"GHF híbrido: DSATUR/min-conflicts + OR-Tools CP-SAT","engineVersion":f"heur-0.1.0+ortools-{ORTOOLS_VERSION}","adapterVersion":"0.4.3"}
EXACT_CODES={"LEADERSHIP_EFFECTIVE_LIMIT","CATEGORY_TARGET_IMPOSSIBLE","UNKNOWN_REQUIRED_TEACHER","UNKNOWN_SITE","UNKNOWN_ACTIVITY_SITE","CONTRADICTORY_SOURCE_RULES","GROUP_WEEKLY_CAPACITY","TEACHER_WEEKLY_LECTIVE_LIMIT","EMPTY_ACTIVITY_DOMAIN","SPACE_AGGREGATE_CAPACITY","FIXED_ASSIGNMENT_OVERLAP","SLOT_KIND_CONTRADICTION","UNKNOWN_SLOT_KIND_IN_CALENDAR","UNKNOWN_SPACE_ALTERNATIVE","SYNCHRONIZATION_EMPTY_INTERSECTION"}


def add_external_hints(model, activities, options_by_activity, var_by_option, assignments):
    by_id={a["activityId"]:a for a in assignments}
    count=0
    for aid,a in activities.items():
        chosen=by_id.get(aid)
        if not chosen: continue
        for oi,opt in enumerate(options_by_activity[aid]):
            match=all(chosen.get(k)==opt.get(k) for k in ("dayId","timeSlotId","teacherId","spaceId"))
            if match:
                model.add_hint(var_by_option[(aid,oi)],1)
                count+=1
    return count


def finish(inp, *, started, t0, status, assignments, proof, causes, pipeline, iterations=0, error=None):
    out=make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status=status,assignments=assignments,iterations=iterations,proof=proof,causes=causes,error=error)
    out["schemaId"]="ghf_solver_output_1.2"; out["contractVersion"]="1.2"; out["pipeline"]=pipeline
    return out


def solve(inp):
    started=utc_now(); t0=time.perf_counter(); total=max(0.1,inp["run"].get("timeLimitMs",5000)/1000)
    base_pipeline={
      "strategy":"HEURISTIC_THEN_CP_SAT",
      "heuristic":{"status":"SKIPPED","elapsedMs":0,"assignedCount":0,"softPenalty":None},
      "cpSat":{"status":"SKIPPED","elapsedMs":0,"hintCount":0,"proof":"NOT_AVAILABLE"},
      "selectedSource":"NONE","authoritativeValidation":False,
    }
    structural=structural_precheck(inp)
    if structural and any(c["code"] in EXACT_CODES for c in structural):
        base_pipeline["cpSat"].update(status="INFEASIBLE",proof="PROVEN")
        base_pipeline["authoritativeValidation"]=True
        return finish(inp,started=started,t0=t0,status="INFEASIBLE",assignments=[],proof="PROVEN",causes=structural,pipeline=base_pipeline)
    if not inp["activities"]:
        base_pipeline["authoritativeValidation"]=True
        return finish(inp,started=started,t0=t0,status="PARTIAL",assignments=[],proof="PROVEN",causes=structural,pipeline=base_pipeline)

    # Etapa 1: solución inicial heurística.
    heur_start=time.perf_counter(); heur_budget=min(10.0,max(0.15,total*0.50)); heur_deadline=heur_start+heur_budget
    try:
        heur_assign,heur_iterations=solve_once(inp,int(inp["run"].get("seed") or 0),heur_deadline)
        heur_eval=evaluate(inp,heur_assign)
        heur_complete=len(heur_assign)==len(inp["activities"]) and not heur_eval["hardViolations"]
        heur_status="FEASIBLE" if heur_complete else ("TIME_LIMIT" if time.perf_counter()>=heur_deadline else "PARTIAL")
        base_pipeline["heuristic"]={"status":heur_status,"elapsedMs":round((time.perf_counter()-heur_start)*1000),"assignedCount":len(heur_assign),"softPenalty":heur_eval["softPenalty"]}
    except Exception as exc:
        heur_assign=[]; heur_iterations=0; heur_eval={"hardViolations":[],"softPenalty":None}; heur_complete=False
        base_pipeline["heuristic"]={"status":"ERROR","elapsedMs":round((time.perf_counter()-heur_start)*1000),"assignedCount":0,"softPenalty":None}
        structural=structural+[{"code":"HEURISTIC_STAGE_ERROR","message":"La etapa heurística falló; CP-SAT intentará resolver sin pistas.","relatedIds":[],"evidence":{"error":str(exc)}}]

    # Etapa 2: CP-SAT autoritativo, con las pistas disponibles.
    cp_start=time.perf_counter()
    try:
        model,opts,vars,teacher_occ,teacher_day_lective,ctx=build_hard_model(inp); activities=ctx[-1]
        hint_count=add_external_hints(model,activities,opts,vars,heur_assign)
        add_soft_model(inp,model,opts,vars,teacher_occ,teacher_day_lective,ctx)
        remaining=max(0.05,total-(time.perf_counter()-t0))
        solver=cp_model.CpSolver(); solver.parameters.max_time_in_seconds=remaining; solver.parameters.random_seed=int(inp["run"].get("seed") or 0); solver.parameters.num_search_workers=1
        st=solver.solve(model)
        cp_elapsed=round((time.perf_counter()-cp_start)*1000)
        if st in (cp_model.OPTIMAL,cp_model.FEASIBLE):
            ass=extract(solver,activities,opts,vars)
            status="OPTIMAL" if st==cp_model.OPTIMAL else "FEASIBLE"; proof="PROVEN" if st==cp_model.OPTIMAL else "NOT_AVAILABLE"
            base_pipeline["cpSat"]={"status":status,"elapsedMs":cp_elapsed,"hintCount":hint_count,"proof":proof}
            base_pipeline["selectedSource"]="CP_SAT"; base_pipeline["authoritativeValidation"]=True
            return finish(inp,started=started,t0=t0,status=status,assignments=ass,proof=proof,causes=structural,pipeline=base_pipeline,iterations=heur_iterations+int(solver.num_branches))
        if st==cp_model.INFEASIBLE:
            base_pipeline["cpSat"]={"status":"INFEASIBLE","elapsedMs":cp_elapsed,"hintCount":hint_count,"proof":"PROVEN"}
            base_pipeline["authoritativeValidation"]=True
            causes=structural+[{"code":"CP_SAT_INFEASIBLE","message":"CP-SAT ha demostrado que el modelo duro 1.1 no tiene solución.","relatedIds":[],"evidence":{"stage":"HYBRID_VALIDATION"}}]
            return finish(inp,started=started,t0=t0,status="INFEASIBLE",assignments=[],proof="PROVEN",causes=causes,pipeline=base_pipeline,iterations=heur_iterations+int(solver.num_branches))
        base_pipeline["cpSat"]={"status":"TIME_LIMIT","elapsedMs":cp_elapsed,"hintCount":hint_count,"proof":"NOT_AVAILABLE"}
        if heur_complete:
            base_pipeline["selectedSource"]="HEURISTIC_FALLBACK"; base_pipeline["authoritativeValidation"]=True
            causes=structural+[{"code":"CP_SAT_TIME_LIMIT_HEURISTIC_FALLBACK","message":"CP-SAT agotó el tiempo; se conserva la solución heurística validada como vista previa.","relatedIds":[],"evidence":{"hintCount":hint_count}}]
            return finish(inp,started=started,t0=t0,status="FEASIBLE",assignments=heur_assign,proof="HEURISTIC",causes=causes,pipeline=base_pipeline,iterations=heur_iterations+int(solver.num_branches))
        base_pipeline["authoritativeValidation"]=True
        return finish(inp,started=started,t0=t0,status="TIME_LIMIT",assignments=heur_assign,proof="NOT_AVAILABLE",causes=structural,pipeline=base_pipeline,iterations=heur_iterations+int(solver.num_branches))
    except Exception as exc:
        cp_elapsed=round((time.perf_counter()-cp_start)*1000)
        base_pipeline["cpSat"]={"status":"ERROR","elapsedMs":cp_elapsed,"hintCount":0,"proof":"NOT_AVAILABLE"}
        if heur_complete:
            base_pipeline["selectedSource"]="HEURISTIC_FALLBACK"; base_pipeline["authoritativeValidation"]=True
            return finish(inp,started=started,t0=t0,status="FEASIBLE",assignments=heur_assign,proof="HEURISTIC",causes=structural,pipeline=base_pipeline,iterations=heur_iterations,error=None)
        return finish(inp,started=started,t0=t0,status="ERROR",assignments=[],proof="NOT_AVAILABLE",causes=structural,pipeline=base_pipeline,error={"code":"HYBRID_PIPELINE_ERROR","message":"Falló la etapa CP-SAT del motor híbrido.","details":{"error":str(exc)}})


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('output'); args=ap.parse_args()
    inp=json.load(open(args.input,encoding='utf-8')); out=solve(inp)
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({"status":out["status"],"elapsedMs":out["timing"]["elapsedMs"],"assigned":len(out["assignments"]),"softPenalty":out["score"]["softPenalty"],"source":out["pipeline"]["selectedSource"]},ensure_ascii=False))
if __name__=='__main__': main()
