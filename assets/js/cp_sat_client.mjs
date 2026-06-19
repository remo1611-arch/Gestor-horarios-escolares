import { deepClone, normalizeProject, structuralFingerprint, uid, nowIso } from './core.mjs';

export const CP_SAT_EXECUTION_CONTRACT_VERSION = 'cp-sat-execution-contract-1.0';
export const P10M4_PARITY_CONTRACT_VERSION = 'p10m-engine-parity-contract-1.0';
export const CP_SAT_DOMAIN4_SEMANTIC_CONTRACT_VERSION = 'p10m-cp-sat-domain4-1.0';
export const CP_SAT_STATUSES = Object.freeze(['OPTIMAL','FEASIBLE','INFEASIBLE','UNKNOWN','MODEL_INVALID','UNAVAILABLE','CANCELLED','ERROR']);

export function createCpSatRequest(input, {
  mode='COMPLETE', targetActivityIds=[], preserveAssignmentIds=[], seed=0,
  maxDurationMs=30000, numWorkers=8, requestId=uid('cp_sat_request'),
}={}) {
  const project=normalizeProject(input);
  if(!['COMPLETE','PARTIAL','REPAIR'].includes(mode))throw new Error('El modo CP-SAT no es válido.');
  const domain=project.domain||{};
  const activities=project.activities||[];
  const needsDomain4=(domain.cycle?.mode&&domain.cycle.mode!=='WEEKLY')||(domain.cycle?.weeks||[]).filter(row=>row?.active!==false).length>1||(domain.sites||[]).length||(domain.travelRules||[]).length||(domain.resources||[]).length||(domain.activityRelations||[]).some(row=>row?.active!==false)||(domain.splitSets||[]).some(row=>row?.active!==false)||activities.some(row=>Number(row.durationSlots||1)>1||(row.allowedSiteIds||[]).length||(row.requiredResourceIds||[]).length);
  return {
    contractVersion:CP_SAT_EXECUTION_CONTRACT_VERSION,
    requestId:String(requestId),createdAt:nowIso(),mode,
    targetActivityIds:[...new Set(targetActivityIds.map(String))],
    preserveAssignmentIds:[...new Set(preserveAssignmentIds.map(String))],
    seed:Number(seed||0),maxDurationMs:Math.max(50,Math.min(3600000,Number(maxDurationMs||30000))),
    numWorkers:Math.max(1,Math.min(32,Number(numWorkers||8))),
    sourceProjectId:project.meta.projectId,sourceRevisionId:project.meta.revisionId,
    sourceRevisionNumber:project.meta.revisionNumber,sourceFingerprint:structuralFingerprint(project),
    engine:{id:'ortools-cp-sat',kind:'CP_SAT'},
    ...(needsDomain4?{requiredSemanticContractVersion:CP_SAT_DOMAIN4_SEMANTIC_CONTRACT_VERSION}:{}),project:deepClone(project),
  };
}

export function compactCpSatRequest(request={}){
  const copy={...request};delete copy.project;return copy;
}

export function validateCpSatResult(value, expectedRequest=null){
  if(!value||typeof value!=='object')throw new Error('La respuesta CP-SAT no es un objeto JSON.');
  if(value.contractVersion!==CP_SAT_EXECUTION_CONTRACT_VERSION)throw new Error('La respuesta no usa el contrato CP-SAT compatible.');
  const request=value.request,response=value.response;
  if(!request||!response)throw new Error('La respuesta CP-SAT no contiene solicitud y resultado.');
  if(request.requestId!==response.requestId)throw new Error('La respuesta CP-SAT no corresponde a su solicitud.');
  if(response.sourceProjectId&&response.sourceProjectId!==request.sourceProjectId)throw new Error('La respuesta CP-SAT identifica otro proyecto.');
  if(response.sourceRevisionId&&response.sourceRevisionId!==request.sourceRevisionId)throw new Error('La respuesta CP-SAT identifica otra revisión.');
  if(response.sourceFingerprint&&response.sourceFingerprint!==request.sourceFingerprint)throw new Error('La respuesta CP-SAT identifica otra huella estructural.');
  if(!CP_SAT_STATUSES.includes(response.status))throw new Error(`Estado CP-SAT no reconocido: ${response.status||'vacío'}.`);
  if(expectedRequest&&request.requestId!==expectedRequest.requestId)throw new Error('La respuesta pertenece a otra solicitud CP-SAT.');
  if(expectedRequest&&request.sourceFingerprint!==expectedRequest.sourceFingerprint)throw new Error('La respuesta CP-SAT usa otra huella estructural.');
  if(request.requiredSemanticContractVersion){
    if(response.parity?.contractVersion!==P10M4_PARITY_CONTRACT_VERSION)throw new Error('La respuesta CP-SAT no acredita el contrato de paridad P10M-4.');
    if(response.parity?.semanticContractVersion!==request.requiredSemanticContractVersion)throw new Error('La respuesta CP-SAT no acredita la semántica de dominio 4.0 solicitada.');
  }
  if(value.proposal){
    if(!['OPTIMAL','FEASIBLE'].includes(response.status))throw new Error('Una respuesta no factible no puede contener propuesta.');
    if(value.proposal.engine?.kind!=='CP_SAT')throw new Error('La propuesta no identifica el motor CP-SAT.');
    if(request.requiredSemanticContractVersion&&value.proposal.engine?.semanticContractVersion!==request.requiredSemanticContractVersion)throw new Error('La propuesta CP-SAT no conserva el contrato semántico P10M-4.');
    if(value.proposal.requestId!==request.requestId)throw new Error('La propuesta CP-SAT no corresponde a la solicitud.');
    if(value.proposal.sourceFingerprint!==request.sourceFingerprint)throw new Error('La propuesta CP-SAT no conserva la huella de origen.');
  }
  if(response.status==='UNAVAILABLE'&&value.proposal)throw new Error('UNAVAILABLE no puede contener una propuesta alternativa.');
  return value;
}

export class CpSatClient{
  constructor({baseUrl=''}={}){this.baseUrl=baseUrl;this.activeRequestId='';this.controller=null;}
  get running(){return Boolean(this.activeRequestId);}
  async capabilities(){
    try{
      const response=await fetch(`${this.baseUrl}/api/cp-sat/capabilities`,{cache:'no-store'});
      if(!response.ok)throw new Error(`El servicio CP-SAT respondió ${response.status}.`);
      return response.json();
    }catch(error){
      return {available:false,noFallback:true,reason:'STATIC_WEB_NO_CP_SAT_API',importError:error.message||String(error)};
    }
  }
  async solve(request){
    if(this.running)throw new Error('Ya hay una ejecución CP-SAT en curso.');
    this.activeRequestId=request.requestId;this.controller=new AbortController();
    try{
      const response=await fetch(`${this.baseUrl}/api/cp-sat/solve`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),
        signal:this.controller.signal,cache:'no-store',
      });
      const text=await response.text();let value;
      try{value=JSON.parse(text);}catch{throw new Error(`El servicio CP-SAT devolvió una respuesta no JSON (${response.status}).`);}
      if(!response.ok&&value?.response?.status!=='CANCELLED')throw new Error(value?.response?.error?.message||value?.error||`El servicio CP-SAT respondió ${response.status}.`);
      return validateCpSatResult(value,request);
    }finally{this.activeRequestId='';this.controller=null;}
  }
  async cancel(){
    if(!this.activeRequestId)return false;
    const requestId=this.activeRequestId;
    const response=await fetch(`${this.baseUrl}/api/cp-sat/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId}),cache:'no-store'});
    if(!response.ok)throw new Error('No se pudo solicitar la cancelación CP-SAT.');
    return true;
  }
}

export function cpSatRequestDownload(request){return `${JSON.stringify(request,null,2)}\n`;}
export function cpSatResultDownload(result){return `${JSON.stringify(result,null,2)}\n`;}

export function cpSatSupportsP10M4(capabilities={}){return Boolean(capabilities?.available)&&capabilities?.noFallback!==false&&capabilities?.parity?.contractVersion===P10M4_PARITY_CONTRACT_VERSION&&capabilities?.parity?.semanticContractVersion===CP_SAT_DOMAIN4_SEMANTIC_CONTRACT_VERSION&&capabilities?.parity?.domainSchemaVersion==='4.0';}
