from __future__ import annotations
import argparse,json,time
from collections import defaultdict
from pathlib import Path
from ortools import __version__ as ORTOOLS_VERSION
from ortools.sat.python import cp_model
from solver_common import activity_options,make_output,maps,option_to_assignment,structural_precheck,utc_now,all_teacher_ids,effective_teacher_max,org_rules
from adapter_ortools_v11 import add_soft_model,extract
ENGINE={"adapterId":"GHF-ORTOOLS-CP-SAT-ORG","engineName":"Google OR-Tools CP-SAT organizativo","engineVersion":ORTOOLS_VERSION,"adapterVersion":"0.4.3"}

def build_hard_model(inp):
 days,slots,teachers,groups,spaces,activities=maps(inp); model=cp_model.CpModel(); opts={}; vars={}
 for aid,a in activities.items():
  os=activity_options(inp,a); opts[aid]=os; vs=[]
  for oi,o in enumerate(os): v=model.new_bool_var(f'x__{aid}__{oi}');vars[(aid,oi)]=v;vs.append(v)
  req=set(inp['run'].get('requestedActivityIds') or []); must=inp['run'].get('mode')=='COMPLETE' or (inp['run'].get('mode')=='PARTIAL' and (aid in req or (inp['run'].get('preserveAssignments') and a.get('currentAssignment')))); model.add(sum(vs)==1 if must else sum(vs)<=1)
 teacher_occ=defaultdict(list);teacher_absent=defaultdict(list);group_occ=defaultdict(list);space_occ=defaultdict(list);teacher_lective=defaultdict(list);teacher_day_lective=defaultdict(list)
 for aid,a in activities.items():
  for oi,o in enumerate(opts[aid]):
   v=vars[(aid,oi)]
   for ts in o['coveredTimeSlotIds']:
    for tid in all_teacher_ids(a,o):
     teacher_occ[(tid,o['dayId'],ts)].append(v)
     if a.get('presenceEffect')=='ABSENT': teacher_absent[(tid,o['dayId'],ts)].append(v)
    for gid in a.get('groupIds') or []: group_occ[(gid,o['dayId'],ts)].append(v)
    if o.get('spaceId'): space_occ[(o['spaceId'],o['dayId'],ts)].append(v)
   if a.get('category')=='LECTIVO':
    for tid in all_teacher_ids(a,o): teacher_lective[tid].append(v);teacher_day_lective[(tid,o['dayId'])].append(v)
 for vs in teacher_occ.values():model.add(sum(vs)<=1)
 for vs in group_occ.values():model.add(sum(vs)<=1)
 for (sid,d,s),vs in space_occ.items():model.add(sum(vs)<=int(spaces[sid].get('concurrentCapacity') or 1))
 for tid,vs in teacher_lective.items():
  mx=effective_teacher_max(teachers[tid]);
  if mx is not None:model.add(sum(vs)<=mx)
 for (tid,d),vs in teacher_day_lective.items():
  mx=teachers[tid].get('maxLectivePerDay');
  if mx is not None:model.add(sum(vs)<=int(mx))
 # Existing source fixed rules.
 for c in inp.get('hardConstraints',[]):
  if not c.get('active') or c.get('type')!='SOURCE_RULE_FIJAR':continue
  p=c.get('parameters') or {};ids=set(c.get('entityIds') or []);vs=[]
  if c.get('scope') in ('TEACHER','DOCENTE'):
   for aid,a in activities.items():
    for oi,o in enumerate(opts[aid]):
     if any(t in ids for t in all_teacher_ids(a,o)) and o['dayId']==p.get('dayId') and p.get('timeSlotId') in o['coveredTimeSlotIds']:vs.append(vars[(aid,oi)])
   model.add(sum(vs)>=1)
 # Synchronization.
 sync=defaultdict(list)
 for aid,a in activities.items():
  if a.get('synchronizationGroup'):sync[a['synchronizationGroup']].append(aid)
 starts=[(d['id'],s['id']) for d in days for s in slots]
 for sg,aids in sync.items():
  for other in aids[1:]:
   ref=aids[0]
   for d,s in starts:model.add(sum(vars[(ref,i)] for i,o in enumerate(opts[ref]) if o['dayId']==d and o['timeSlotId']==s)==sum(vars[(other,i)] for i,o in enumerate(opts[other]) if o['dayId']==d and o['timeSlotId']==s))
 # Organizational rules.
 slot_ord={s['id']:s['ordinal'] for s in slots}
 for r in org_rules(inp):
  p=r.get('parameters',{});typ=r['type']
  if typ=='CATEGORY_TARGET_PER_TEACHER':
   cat=p.get('category');target=int(p.get('target',0));mode=p.get('mode','EXACT')
   for tid in r.get('entityIds',[]):
    vs=[vars[(aid,i)] for aid,a in activities.items() if a.get('category')==cat for i,o in enumerate(opts[aid]) if tid in all_teacher_ids(a,o)]
    if mode=='EXACT':model.add(sum(vs)==target)
    elif mode=='AT_LEAST':model.add(sum(vs)>=target)
    else:model.add(sum(vs)<=target)
  elif typ=='MINIMUM_PRESENCE':
   dset=p.get('dayIds') or [d['id'] for d in days];sset=p.get('timeSlotIds') or [s['id'] for s in slots];minimum=int(p.get('minimumTeachers',0))
   for d in dset:
    for s in sset:
     baseline=[];absvars=[]
     for tid,t in teachers.items():
      av=next((x for x in t.get('availability',[]) if x['dayId']==d and x['timeSlotId']==s),None)
      if av and av.get('present',False):
       baseline.append(tid); absvars.extend(teacher_absent.get((tid,d,s),[]))
     model.add(len(baseline)-sum(absvars)>=minimum)
  elif typ=='CONSECUTIVE_BLOCK':
   ids=r.get('entityIds',[])
   for a1,a2 in zip(ids,ids[1:]):
    for d in days:
     for s in slots:
      nxt=next((x['id'] for x in slots if x['ordinal']==s['ordinal']+1),None)
      left=sum(vars[(a1,i)] for i,o in enumerate(opts[a1]) if o['dayId']==d['id'] and o['timeSlotId']==s['id'])
      right=sum(vars[(a2,i)] for i,o in enumerate(opts[a2]) if nxt and o['dayId']==d['id'] and o['timeSlotId']==nxt)
      model.add(left==right)
  elif typ=='DIFFERENT_DAYS':
   for d in days:model.add(sum(vars[(aid,i)] for aid in r.get('entityIds',[]) for i,o in enumerate(opts.get(aid,[])) if o['dayId']==d['id'])<=1)
  elif typ=='RECESS_ZONE_COVERAGE':
   for d in p.get('dayIds',[]):
    for z in p.get('zoneSpaceIds',[]):
     vs=[vars[(aid,i)] for aid,a in activities.items() if a.get('organizationalSubtype')=='RECESS_DUTY' for i,o in enumerate(opts[aid]) if o['dayId']==d and o['timeSlotId']==p.get('timeSlotId') and o.get('spaceId')==z]
     model.add(sum(vs)>=int(p.get('minimumPerZone',1)))
  elif typ=='TRAVEL_BUFFER':
   tid=p.get('teacherId');gap=int(p.get('minimumGapSlots',0)); relevant=[]
   for aid,a in activities.items():
    for i,o in enumerate(opts[aid]):
     if tid in all_teacher_ids(a,o):relevant.append((aid,i,o,a.get('siteId')))
   for ix,(a1,i1,o1,s1) in enumerate(relevant):
    for a2,i2,o2,s2 in relevant[ix+1:]:
     if a1==a2 or not s1 or not s2 or s1==s2 or o1['dayId']!=o2['dayId']:continue
     if abs(slot_ord[o1['timeSlotId']]-slot_ord[o2['timeSlotId']])<=gap:model.add(vars[(a1,i1)]+vars[(a2,i2)]<=1)
 return model,opts,vars,teacher_occ,teacher_day_lective,(days,slots,teachers,groups,spaces,activities)

def solve(inp):
 started=utc_now();t0=time.perf_counter();struct=structural_precheck(inp);exact={'CONTRADICTORY_SOURCE_RULES','GROUP_WEEKLY_CAPACITY','TEACHER_WEEKLY_LECTIVE_LIMIT','EMPTY_ACTIVITY_DOMAIN','SPACE_AGGREGATE_CAPACITY','FIXED_ASSIGNMENT_OVERLAP','LEADERSHIP_EFFECTIVE_LIMIT','CATEGORY_TARGET_IMPOSSIBLE','UNKNOWN_REQUIRED_TEACHER','UNKNOWN_SITE','UNKNOWN_ACTIVITY_SITE'}
 if any(c['code'] in exact for c in struct):return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status='INFEASIBLE',assignments=[],iterations=0,proof='PROVEN',causes=struct)
 if not inp['activities']:return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=0,status='PARTIAL',assignments=[],iterations=0,proof='PROVEN',causes=struct)
 model,opts,vars,to,td,ctx=build_hard_model(inp);add_soft_model(inp,model,opts,vars,to,td,ctx);solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=max(.1,inp['run'].get('timeLimitMs',5000)/1000);solver.parameters.random_seed=int(inp['run'].get('seed') or 0);solver.parameters.num_search_workers=1;st=solver.solve(model)
 if st in (cp_model.OPTIMAL,cp_model.FEASIBLE):ass=extract(solver,ctx[-1],opts,vars);status='OPTIMAL' if st==cp_model.OPTIMAL else 'FEASIBLE';proof='PROVEN' if st==cp_model.OPTIMAL else 'NOT_AVAILABLE'
 elif st==cp_model.INFEASIBLE:ass=[];status='INFEASIBLE';proof='PROVEN';struct=struct+[{"code":"CP_SAT_INFEASIBLE","message":"CP-SAT demuestra inviabilidad del modelo organizativo 1.2.","relatedIds":[],"evidence":{}}]
 else:ass=[];status='TIME_LIMIT';proof='NOT_AVAILABLE'
 return make_output(inp,engine=ENGINE,started=started,finished=utc_now(),elapsed_ms=round((time.perf_counter()-t0)*1000),status=status,assignments=ass,iterations=int(solver.num_branches),proof=proof,causes=struct)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');a=ap.parse_args();inp=json.load(open(a.input,encoding='utf-8'));out=solve(inp);out['schemaId']='ghf_solver_output_1.2';out['contractVersion']='1.2';out['pipeline']={"strategy":"HEURISTIC_THEN_CP_SAT","heuristic":{"status":"SKIPPED","elapsedMs":0,"assignedCount":0,"softPenalty":None},"cpSat":{"status":out['status'] if out['status'] in ['OPTIMAL','FEASIBLE','INFEASIBLE','TIME_LIMIT'] else 'ERROR',"elapsedMs":out['timing']['elapsedMs'],"hintCount":0,"proof":out['diagnostics']['proofLevel'] if out['diagnostics']['proofLevel'] in ['PROVEN','NOT_AVAILABLE'] else 'NOT_AVAILABLE'},"selectedSource":"CP_SAT" if out['status'] in ['OPTIMAL','FEASIBLE'] else 'NONE',"authoritativeValidation":True};Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':out['status'],'assigned':len(out['assignments']),'hard':out['score']['hardViolationCount'],'elapsedMs':out['timing']['elapsedMs']},ensure_ascii=False))
if __name__=='__main__':main()
