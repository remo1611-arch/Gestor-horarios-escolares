import {
  deepClone, normalizeProject, validateProject, structuralFingerprint,
  computeMetrics, nowIso, uid,
} from './core.mjs';
import { heuristicCompatibility, revalidateProposal } from './generator.mjs';
import { createCpSatRequest, cpSatSupportsP10M4 } from './cp_sat_client.mjs';
import { semanticizeGenerationOutcome, semanticizeIssue } from './semantic_engine.mjs';
import { validateScheduleIndependently } from './product_independent_validator.mjs';
import { domain4EngineRequirements, requiredOccurrencesForActivity } from './educational_domain_4.mjs';
import { analyzeMultidimensionalQuality, publicQualitySummary } from './product_multidimensional_quality.mjs';
import { analyzeP12WebSolverSupport, P12_WEB_SOLVER_CONTRACT_VERSION } from './p12_web_solver.mjs';

export const PRODUCT_GENERATION_CONTRACT_VERSION = 'product-generation-orchestrator-1.0';
export const PRODUCT_GENERATION_POLICY_VERSION = 'product-generation-policy-1.3-p12-web-solver-medium';

export const PRODUCT_GENERATION_POLICY = Object.freeze({
  complexHardRules: 12,
  complexFixedOccurrences: 20,
  complexConstrainedActivities: 50,
  complexOccurrences: 700,
  ordinaryMaxDurationMs: 30000,
  cpSatWorkers: 8,
  webSolverContractVersion: P12_WEB_SOLVER_CONTRACT_VERSION,
});

const okStatus = new Set(['COMPLETED','PARTIAL','TIME_LIMIT_WITH_SOLUTION','OPTIMAL','FEASIBLE']);

export function analyzeProductGeneration(input, {
  mode='COMPLETE', targetActivityIds=[], enginePreference='AUTO', forceGlobalOptimization=false,
}={}) {
  const project=normalizeProject(input);
  const selectedIds=new Set((targetActivityIds||[]).map(String));
  const activities=project.activities.filter(activity=>mode==='COMPLETE'||!selectedIds.size||selectedIds.has(activity.id));
  const compatibility=heuristicCompatibility(project,mode==='COMPLETE'||!selectedIds.size?null:[...selectedIds]);
  const hardRows=[...(project.constraints||[]),...(project.organization?.rules||[])]
    .filter(row=>row&&row.active!==false&&(row.level==='HARD'||row.severity==='HARD'||(project.organization?.rules||[]).includes(row)));
  const preferences=[...(project.organization?.preferences||[]),...(project.constraints||[])]
    .filter(row=>row&&row.active!==false&&(row.level==='SOFT'||row.severity==='SOFT'));
  const multislot=activities.filter(activity=>Number(activity.durationSlots||1)>1);
  const fixedOccurrences=activities.reduce((sum,activity)=>sum+(activity.fixedOccurrences?.length||0),0);
  const constrainedActivities=activities.filter(activity=>(activity.allowedDays?.length||0)||(activity.allowedSlots?.length||0)||(activity.requiredSpaceTags?.length||0)||(activity.fixedOccurrences?.length||0)).length;
  const occurrences=activities.reduce((sum,activity)=>sum+requiredOccurrencesForActivity(activity,project.domain),0);
  const domain4=domain4EngineRequirements(project);
  const p12WebSolver=analyzeP12WebSolverSupport(project,{targetActivityIds:mode==='COMPLETE'||!selectedIds.size?null:[...selectedIds]});
  const complexityReasons=[];
  if(multislot.length)complexityReasons.push('MULTISLOT');
  for(const reason of domain4.reasons)if(!complexityReasons.includes(reason))complexityReasons.push(reason);
  if(hardRows.length>=PRODUCT_GENERATION_POLICY.complexHardRules)complexityReasons.push('MANY_HARD_RULES');
  if(fixedOccurrences>=PRODUCT_GENERATION_POLICY.complexFixedOccurrences)complexityReasons.push('MANY_FIXED_OCCURRENCES');
  if(constrainedActivities>=PRODUCT_GENERATION_POLICY.complexConstrainedActivities)complexityReasons.push('MANY_CONSTRAINED_ACTIVITIES');
  if(occurrences>=PRODUCT_GENERATION_POLICY.complexOccurrences)complexityReasons.push('LARGE_SCOPE');
  if(forceGlobalOptimization)complexityReasons.push('GLOBAL_OPTIMIZATION_REQUESTED');
  const complex=complexityReasons.length>0;
  let recommendedStrategy='HEURISTIC_FIRST';
  if(enginePreference==='HEURISTIC')recommendedStrategy='HEURISTIC_ONLY';
  else if(enginePreference==='CP_SAT')recommendedStrategy=domain4.required?'CP_SAT_REQUIRED':'CP_SAT_ONLY';
  else if(domain4.required||!compatibility.ok)recommendedStrategy='CP_SAT_REQUIRED';
  else if(complex)recommendedStrategy='COMBINED';
  return {
    contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,
    policyVersion:PRODUCT_GENERATION_POLICY_VERSION,
    enginePreference,mode,targetActivityIds:[...selectedIds],
    heuristicCompatible:compatibility.ok&&!domain4.required,heuristicCompatibility:domain4.required?{ok:false,code:'DOMAIN4_REQUIRES_CP_SAT',message:'Este proyecto usa reglas avanzadas que aún no están acreditadas en la versión web pública.',reasons:domain4.reasons}:compatibility,
    p12WebSolverCompatible:p12WebSolver.supported,p12WebSolver,
    domain4EngineRequirements:domain4,
    complex,complexityReasons,semanticReasons:complexityReasons.map(code=>semanticizeIssue({code,message:'La configuración requiere una comprobación más profunda.',severity:'INFO',blocksGeneration:false,blocksFinalization:false})),
    metrics:{activities:activities.length,occurrences,multislot:multislot.length,hardRules:hardRows.length,preferences:preferences.length,fixedOccurrences,constrainedActivities},
    recommendedStrategy,
    publicExplanation:strategyExplanation(recommendedStrategy,complexityReasons),
  };
}

export function proposalProductDiagnostics(input, proposal) {
  const project=normalizeProject(input);
  const assignments=proposal?.assignments||[];
  const unplaced=proposal?.unplaced?.length??Number(proposal?.summary?.unplaced||0);
  const metrics=computeMetrics(project,assignments);
  const classSlots=project.calendar.slots.filter(slot=>slot.kind==='CLASS').map(slot=>slot.id);
  const edgeSlotAssignments=assignments.filter(row=>classSlots.length&&(row.slotId===classSlots[0]||row.slotId===classSlots.at(-1))).length;
  const placed=Number(proposal?.summary?.placed??assignments.length);
  const required=Number(proposal?.summary?.required??placed+unplaced);
  const profile=analyzeMultidimensionalQuality({...project,assignments},assignments,{mode:'CANDIDATE',source:proposal?.engine?.kind||'UNKNOWN',baselineAssignments:project.assignments});
  return {
    placed,required,unplaced,
    complete:Boolean(proposal?.summary?.complete)||(required===placed&&unplaced===0),
    completionPct:required?Math.round(10000*placed/required)/100:100,
    gaps:Number(metrics.gaps||0),edgeSlotAssignments,
    dailyLoadSpread:Number(proposal?.quality?.dailyLoadSpread||profile.legacy?.dailyLoadSpread||0),
    qualityProfile:publicQualitySummary(profile),
  };
}

export function compareProductGenerationCandidates(input, candidates=[]) {
  const project=normalizeProject(input);
  const assessed=candidates.filter(row=>row?.proposal).map((row,index)=>{
    const holder=deepClone(project);holder.proposals.push(deepClone(row.proposal));
    let revalidation;
    try{revalidation=revalidateProposal(holder,row.proposal.id);}catch(error){revalidation={stale:false,validation:{errors:[{message:error.message}]}};}
    const diagnostics=proposalProductDiagnostics(project,row.proposal);
    const independentValidation=revalidation?.draft
      ? validateScheduleIndependently(revalidation.draft,{mode:'CANDIDATE',source:row.engine==='CP_SAT'?'CP_SAT':row.engine==='WEB_SOLVER'?'WEB_SOLVER':'HEURISTIC'})
      : {valid:false,blockers:[{code:'INDEPENDENT_VALIDATION_NOT_AVAILABLE',message:'No se pudo construir el horario candidato.'}]};
    const valid=!revalidation.stale&&!(revalidation.validation?.errors?.length)&&independentValidation.valid;
    const cpOptimal=row.response?.status==='OPTIMAL';
    const vector=[valid?1:0,diagnostics.complete?1:0,diagnostics.placed,-diagnostics.unplaced,-diagnostics.gaps,-diagnostics.dailyLoadSpread,cpOptimal?1:0,-index];
    return {...row,valid,revalidation,independentValidation,diagnostics,vector};
  });
  assessed.sort((a,b)=>compareVector(b.vector,a.vector));
  const selected=assessed.find(row=>row.valid)||null;
  return {
    selected,
    candidates:assessed,
    explanation:selected?selectionExplanation(selected,assessed):'No se obtuvo una propuesta utilizable.',
  };
}

export class ProductGenerationOrchestrator {
  constructor({generationRunner,cpSatClient,clock=()=>Date.now(),heartbeatMs=500}={}) {
    if(!generationRunner)throw new Error('Falta el ejecutor de generación rápida.');
    if(!cpSatClient)throw new Error('Falta el conector del motor avanzado local.');
    this.generationRunner=generationRunner;
    this.cpSatClient=cpSatClient;
    this.clock=clock;
    this.heartbeatMs=Math.max(0,Number(heartbeatMs||0));
    this.active=false;
    this.activeEngine='';
    this.cancelRequested=false;
  }
  get running(){return this.active;}
  async cancel(){
    if(!this.active)return false;
    this.cancelRequested=true;
    if(this.activeEngine==='CP_SAT')return this.cpSatClient.cancel();
    if(this.activeEngine==='HEURISTIC')return this.generationRunner.cancel();
    return true;
  }
  async start(input,options={},control={}){
    if(this.active)throw new Error('Ya hay una generación en curso.');
    this.active=true;this.activeEngine='';this.cancelRequested=false;
    const source=normalizeProject(input);
    const startedAt=nowIso(),startedMs=this.clock();
    const requestId=String(options.requestId||globalThis.crypto?.randomUUID?.()||uid('product_generation'));
    const mode=String(options.mode||'COMPLETE');
    const targetActivityIds=[...new Set((options.targetActivityIds||[]).map(String))];
    const enginePreference=String(options.enginePreference||'AUTO');
    const maxDurationMs=Math.max(1000,Math.min(3600000,Number(options.maxDurationMs||PRODUCT_GENERATION_POLICY.ordinaryMaxDurationMs)));
    const numWorkers=Math.max(1,Math.min(32,Number(options.numWorkers||PRODUCT_GENERATION_POLICY.cpSatWorkers)));
    const analysis=analyzeProductGeneration(source,{mode,targetActivityIds,enginePreference,forceGlobalOptimization:Boolean(options.forceGlobalOptimization)});
    const request={
      contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,policyVersion:PRODUCT_GENERATION_POLICY_VERSION,
      requestId,createdAt:startedAt,mode,targetActivityIds,seed:Number(options.seed||0),maxDurationMs,numWorkers,
      engine:{id:'product-auto-orchestrator',kind:'AUTO',preference:enginePreference},
      sourceProjectId:source.meta.projectId,sourceRevisionId:source.meta.revisionId,
      sourceRevisionNumber:source.meta.revisionNumber,sourceFingerprint:structuralFingerprint(source),analysis,
    };
    const onProgress=typeof control.onProgress==='function'?control.onProgress:()=>{};
    const attempts=[];
    const validation=validateProject(source);
    if(!validation.canGenerate){
      this.active=false;
      return this.#result(request,analysis,attempts,null,startedAt,startedMs,'ERROR',
        `El proyecto tiene datos que impiden generar: ${validation.errors[0]?.message||'revisa la validación del proyecto.'}`,
        {reasonCodes:['PROJECT_BLOCKED']});
    }
    let capabilities={available:false,noFallback:true,reason:'No consultado'};
    try{
      onProgress(progressPayload('PREPARING',startedMs,this.clock(),{percent:1,message:'Comprobando el proyecto y preparando la generación.'}));
      if(enginePreference==='HEURISTIC'&&!analysis.p12WebSolverCompatible){
        return this.#result(request,analysis,attempts,null,startedAt,startedMs,'ERROR',
          analysis.p12WebSolver?.message || analysis.heuristicCompatibility.message,{reasonCodes:['WEB_SOLVER_INCOMPATIBLE']});
      }
      if(enginePreference!=='HEURISTIC')capabilities=await this.#capabilities();
      const canWebSolver=analysis.p12WebSolverCompatible&&enginePreference!=='CP_SAT';
      const cpRequired=enginePreference==='CP_SAT'||!analysis.p12WebSolverCompatible;
      const cpProviderAvailable=Boolean(capabilities?.available);
      const cpAvailable=cpProviderAvailable&&(!analysis.domain4EngineRequirements?.required||cpSatSupportsP10M4(capabilities));
      if(cpRequired&&!cpAvailable){
        return this.#result(request,analysis,attempts,null,startedAt,startedMs,'UNAVAILABLE',
          'Este proyecto no puede generarse todavía con la versión web. Abre un ejemplo web compatible o revisa el proyecto desde esta vista.',
          {capabilities,reasonCodes:['CP_SAT_REQUIRED',cpProviderAvailable?'CP_SAT_PARITY_CONTRACT_MISMATCH':'CP_SAT_UNAVAILABLE',...(analysis.domain4EngineRequirements?.reasons||[])]});
      }
      let heuristicAttempt=null;
      if(canWebSolver){
        heuristicAttempt=await this.#runHeuristic(source,{requestId:`${requestId}_web_solver`,mode,targetActivityIds,seed:request.seed,maxDurationMs,engineKind:'P12_WEB_SOLVER'},onProgress,startedMs);
        attempts.push(attemptSummary('WEB_SOLVER',heuristicAttempt));
      }
      const heuristicUsable=Boolean(heuristicAttempt?.proposal)&&okStatus.has(heuristicAttempt?.response?.status);
      const heuristicComplete=heuristicUsable&&proposalProductDiagnostics(source,heuristicAttempt.proposal).complete;
      const shouldRunCp=cpAvailable&&(enginePreference==='CP_SAT'||!analysis.heuristicCompatible||analysis.complex||!heuristicComplete);
      let cpAttempt=null;
      if(shouldRunCp&&!this.cancelRequested){
        cpAttempt=await this.#runCpSat(source,{requestId:`${requestId}_cp_sat`,mode,targetActivityIds,seed:request.seed,maxDurationMs,numWorkers},onProgress,startedMs,heuristicAttempt?.proposal||null);
        attempts.push(attemptSummary('CP_SAT',cpAttempt));
      }
      const cpStatus=cpAttempt?.response?.status||'';
      const candidates=[];
      if(heuristicAttempt?.proposal)candidates.push({engine:'WEB_SOLVER',...heuristicAttempt});
      if(cpAttempt?.proposal)candidates.push({engine:'CP_SAT',...cpAttempt});
      const comparison=compareProductGenerationCandidates(source,candidates);
      if(cpStatus==='INFEASIBLE'&&comparison.selected?.diagnostics?.complete){
        return this.#result(request,analysis,attempts,null,startedAt,startedMs,'ERROR',
          'Los métodos de generación han producido resultados incompatibles. El resultado queda bloqueado hasta revisar la causa.',
          {capabilities,comparison:publicComparison(comparison),reasonCodes:['ENGINE_DIVERGENCE','CP_SAT_INFEASIBLE']});
      }
      if(comparison.selected){
        const selected=deepClone(comparison.selected.proposal);
        const selectedProfile=analyzeMultidimensionalQuality({...source,assignments:selected.assignments},selected.assignments,{mode:'CANDIDATE',source:comparison.selected.engine,baselineAssignments:source.assignments});
        selected.quality={...selected.quality,...selectedProfile.legacy,contractVersion:selectedProfile.contractVersion,scope:selectedProfile.scope,overall:selectedProfile.overall,dimensions:selectedProfile.dimensions,independentSummary:selectedProfile.independentSummary,explanatoryNote:selectedProfile.overall.note};
        selected.productGeneration={
          contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,policyVersion:PRODUCT_GENERATION_POLICY_VERSION,
          strategy:effectiveStrategy(analysis,attempts),selectedEngine:comparison.selected.engine,
          explanation:comparison.explanation,comparison:publicComparison(comparison),
        };
        const diagnosticInfeasible=cpStatus==='INFEASIBLE'&&!comparison.selected.diagnostics.complete;
        const status=diagnosticInfeasible?'PARTIAL':comparison.selected.response.status;
        const message=diagnosticInfeasible
          ? 'Se conserva una propuesta parcial revisable, pero la optimización avanzada ha determinado que no existe una solución completa con las condiciones imprescindibles actuales.'
          : comparison.explanation;
        return this.#result(request,analysis,attempts,selected,startedAt,startedMs,status,message,{
          capabilities,comparison:publicComparison(comparison),selectedEngine:comparison.selected.engine,
          reasonCodes:diagnosticInfeasible?['PARTIAL_PROPOSAL','CP_SAT_INFEASIBLE']:[],diagnosticStatus:diagnosticInfeasible?'INFEASIBLE':'',
        });
      }
      const finalStatus=cpStatus||heuristicAttempt?.response?.status||(this.cancelRequested?'CANCELLED':'ERROR');
      const finalMessage=cpAttempt?.response?.message||heuristicAttempt?.response?.message||'No se obtuvo una propuesta utilizable.';
      return this.#result(request,analysis,attempts,null,startedAt,startedMs,finalStatus,finalMessage,{capabilities,reasonCodes:['NO_USABLE_PROPOSAL']});
    }catch(error){
      return this.#result(request,analysis,attempts,null,startedAt,startedMs,this.cancelRequested?'CANCELLED':'ERROR',
        this.cancelRequested?'La generación fue cancelada por la persona usuaria.':`La generación terminó con un error controlado: ${error.message}`,
        {capabilities,reasonCodes:[this.cancelRequested?'USER_CANCELLED':'ORCHESTRATION_ERROR'],error:{name:error.name||'Error',message:error.message||String(error)}});
    }finally{
      this.active=false;this.activeEngine='';this.cancelRequested=false;
    }
  }
  async #capabilities(){
    try{return await this.cpSatClient.capabilities();}
    catch(error){return {available:false,noFallback:true,importError:error.message||String(error)};}
  }
  async #runHeuristic(source,options,onProgress,startedMs){
    this.activeEngine='HEURISTIC';
    return this.generationRunner.start(source,options,{onProgress:(progress)=>{
      const local=Number(progress.percent||0);
      onProgress(progressPayload('QUICK_GENERATION',startedMs,this.clock(),{
        percent:5+Math.round(local*.5),processed:progress.processed,total:progress.total,
        placed:progress.placed,unplaced:progress.unplaced,
        message:'Generando localmente con el motor web P12-5 del navegador.',
      }));
    }});
  }
  async #runCpSat(source,options,onProgress,startedMs,previousProposal){
    this.activeEngine='CP_SAT';
    const request=createCpSatRequest(source,options);
    const previous=previousProposal?proposalProductDiagnostics(source,previousProposal):null;
    const heartbeat=()=>onProgress(progressPayload('ADVANCED_OPTIMIZATION',startedMs,this.clock(),{
      percent:previous?70:35,processed:previous?.placed||0,total:previous?.required||source.activities.reduce((s,a)=>s+Number(a.weeklySessions||0),0),
      placed:previous?.placed||0,unplaced:previous?.unplaced||0,
      message:previous?'Comprobando si la optimización avanzada mejora o completa la propuesta rápida.':'Resolviendo el horario mediante optimización avanzada local.',
    }));
    heartbeat();
    let timer=null;
    if(this.heartbeatMs>0)timer=setInterval(heartbeat,this.heartbeatMs);
    try{return await this.cpSatClient.solve(request);}finally{if(timer)clearInterval(timer);}
  }
  #result(request,analysis,attempts,proposal,startedAt,startedMs,status,message,extra={}){
    const finishedAt=nowIso(),durationMs=Math.max(0,Math.round(this.clock()-startedMs));
    // La evaluación pública se recalcula en la aplicación con el proyecto abierto; aquí se conserva la decisión auditable.
    const response={
      contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,requestId:request.requestId,status,
      startedAt,finishedAt,durationMs,hasUsableProposal:Boolean(proposal),proposalId:proposal?.id||'',
      message,progress:null,
      product:{
        policyVersion:PRODUCT_GENERATION_POLICY_VERSION,strategy:effectiveStrategy(analysis,attempts),
        publicExplanation:message,attemptCount:attempts.length,attempts,
        selectedEngine:extra.selectedEngine||'',diagnosticStatus:extra.diagnosticStatus||'',
        reasonCodes:extra.reasonCodes||[],capabilities:publicCapabilities(extra.capabilities),
        comparison:extra.comparison||null,
        semantic:semanticizeGenerationOutcome({status,message,reasonCodes:extra.reasonCodes||[]}),
      },
    };
    if(extra.error)response.error=extra.error;
    return {contractVersion:PRODUCT_GENERATION_CONTRACT_VERSION,request,response,proposal};
  }
}

export function productGenerationPhaseLabel(phase){
  return ({PREPARING:'Preparando',QUICK_GENERATION:'Creando primera propuesta',ADVANCED_OPTIMIZATION:'Optimizando y comprobando'})[phase]||'Generando';
}

function progressPayload(phase,startedMs,nowMs,extra={}){
  return {phase,elapsedMs:Math.max(0,Math.round(nowMs-startedMs)),processed:0,total:0,placed:0,unplaced:0,percent:0,...extra};
}
function attemptSummary(engine,result){
  return {engine,status:result?.response?.status||'ERROR',durationMs:Number(result?.response?.durationMs||0),hasUsableProposal:Boolean(result?.proposal),proposalId:result?.proposal?.id||'',message:result?.response?.message||''};
}
function publicCapabilities(value){return value?{available:Boolean(value.available),noFallback:value.noFallback!==false,engine:value.engine?{id:value.engine.id||'',version:value.engine.version||''}:null,parity:value.parity?{contractVersion:value.parity.contractVersion||'',semanticContractVersion:value.parity.semanticContractVersion||'',domainSchemaVersion:value.parity.domainSchemaVersion||'',features:[...(value.parity.features||[])]}:null}:null;}
function publicComparison(value){return {explanation:value.explanation,candidates:value.candidates.map(row=>({engine:row.engine,status:row.response?.status||'',valid:row.valid,diagnostics:row.diagnostics,selected:row===value.selected}))};}
function effectiveStrategy(analysis,attempts){
  if(attempts.length>1)return 'COMBINED';
  if(attempts[0]?.engine==='CP_SAT')return analysis.recommendedStrategy==='CP_SAT_REQUIRED'?'CP_SAT_REQUIRED':'CP_SAT_ONLY';
  if(attempts[0]?.engine==='WEB_SOLVER')return 'WEB_SOLVER_ONLY';
  if(attempts[0]?.engine==='HEURISTIC')return 'HEURISTIC_ONLY';
  return analysis.recommendedStrategy;
}
function strategyExplanation(strategy,reasons){
  if(strategy==='CP_SAT_REQUIRED')return 'El proyecto contiene reglas avanzadas que esta versión web todavía no genera de forma acreditada.';
  if(strategy==='CP_SAT_ONLY')return 'Se usará únicamente el motor avanzado solicitado desde mantenimiento.';
  if(strategy==='WEB_SOLVER_ONLY')return 'Se usará el motor web del navegador, sin instalación adicional.';
  if(strategy==='HEURISTIC_ONLY')return 'Se utilizará únicamente la generación rápida solicitada desde mantenimiento.';
  if(strategy==='COMBINED')return 'Se creará una primera propuesta y se contrastará con una optimización más profunda.';
  return 'Se intentará crear una propuesta local en el navegador y se avisará si el proyecto supera el alcance web actual.';
}
function selectionExplanation(selected,rows){
  if(rows.length===1)return selected.diagnostics.complete?'Se obtuvo una propuesta completa y revalidada.':'Se obtuvo una propuesta parcial revalidada que requiere revisión humana.';
  const other=rows.find(row=>row!==selected);
  if(selected.diagnostics.complete&&!other?.diagnostics.complete)return 'Se seleccionó la propuesta completa frente a una alternativa con sesiones pendientes.';
  if(selected.diagnostics.unplaced!==other?.diagnostics.unplaced)return `Se seleccionó la propuesta con menos sesiones pendientes (${selected.diagnostics.unplaced} frente a ${other.diagnostics.unplaced}).`;
  if(selected.diagnostics.gaps!==other?.diagnostics.gaps)return `Se seleccionó la propuesta con menos huecos descriptivos (${selected.diagnostics.gaps} frente a ${other.diagnostics.gaps}).`;
  if(selected.response?.status==='OPTIMAL')return 'Las propuestas eran equivalentes en completitud y se seleccionó la solución declarada óptima por la optimización avanzada.';
  return 'Las propuestas superaron la revalidación y se seleccionó determinísticamente la alternativa mejor situada por completitud, pendientes y huecos.';
}
function compareVector(a,b){for(let i=0;i<Math.max(a.length,b.length);i+=1){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0;}
