import {
  SEMANTIC_FOUNDATION_CONTRACT_VERSION, SEMANTIC_EXPLANATION_VERSION, SEMANTIC_ACTION_VERSION,
  SEMANTIC_RULES, SEMANTIC_CODE_MAP, LEGACY_REASON_PATTERNS, DAILY_REASON_PATTERNS, PROHIBITED_ORDINARY_TERMS,
  semanticRule, semanticRuleForCode, importanceDefinition,
} from './semantic_catalog.mjs';

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').trim();
const titleFromCode=code=>clean(code).toLowerCase().split('_').filter(Boolean).map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
export function sanitizeOrdinaryMessage(value=''){return String(value||'').replace(/OR-?Tools\s*CP-?SAT/gi,'la optimización avanzada local').replace(/CP-?SAT/gi,'la optimización avanzada local').replace(/heurístic[ao]/gi,'generación rápida').replace(/solver/gi,'método de generación').replace(/ENGINE_DIVERGENCE/gi,'resultados incompatibles');}

function fallbackRule(code='UNCLASSIFIED'){
  return {
    id:`technical.${String(code||'unclassified').toLowerCase()}`,entity:'project',
    visibleName:{es:titleFromCode(code)||'Incidencia pendiente de clasificar',gl:titleFromCode(code)||'Incidencia pendente de clasificar'},
    description:{es:'La incidencia conserva su mensaje original y requiere clasificación semántica antes de mostrarse en el recorrido ordinario.',gl:'A incidencia conserva a súa mensaxe orixinal e require clasificación semántica antes de mostrarse no percorrido ordinario.'},
    source:{section:'project',path:'Mantenimiento avanzado'},importance:'REQUIRED',engineCapabilities:{heuristic:'UNKNOWN',cpSat:'UNKNOWN',diagnosis:'PARTIAL'},
    actions:[],ordinaryVisible:false,coverage:'FALLBACK',uiControl:'TECHNICAL_ONLY',
  };
}

export function inferSemanticCodeFromMessage(message=''){
  const text=clean(message);
  const hit=LEGACY_REASON_PATTERNS.find(row=>row.pattern.test(text));
  return hit?{code:hit.code,ruleId:hit.ruleId,adapter:'LEGACY_TEXT_ADAPTER'}:{code:'UNCLASSIFIED',ruleId:'',adapter:'UNMAPPED_TEXT'};
}

export function resolveSemanticRule({code='',message='',ruleId=''}={}){
  if(ruleId&&semanticRule(ruleId))return{rule:semanticRule(ruleId),technicalCode:code||'',adapter:'DIRECT_RULE'};
  const mapped=semanticRuleForCode(code);
  if(mapped)return{rule:mapped,technicalCode:code,adapter:'CODE_MAP'};
  const inferred=inferSemanticCodeFromMessage(message);
  if(inferred.ruleId&&semanticRule(inferred.ruleId))return{rule:semanticRule(inferred.ruleId),technicalCode:code||inferred.code,adapter:inferred.adapter};
  return{rule:fallbackRule(code||inferred.code),technicalCode:code||inferred.code,adapter:inferred.adapter};
}

function severityImportance(severity,ruleImportance){
  if(ruleImportance)return ruleImportance;
  if(severity==='INFO')return'PREFERABLE';
  if(severity==='WARNING')return'VERY_IMPORTANT';
  return'REQUIRED';
}

export function semanticizeIssue(issue={},context={}){
  const resolved=resolveSemanticRule(issue);
  const rule=resolved.rule;
  const importance=importanceDefinition(severityImportance(issue.severity,rule.importance));
  const originalMessage=sanitizeOrdinaryMessage(clean(issue.message||issue.summary||rule.description.es));
  const source=clone(issue.source||rule.source||{});
  const actions=clone(issue.actions||rule.actions||[]);
  return {
    contractVersion:SEMANTIC_EXPLANATION_VERSION,
    semanticRuleId:rule.id,
    technicalCode:clean(issue.code||resolved.technicalCode),
    adapter:resolved.adapter,
    title:rule.visibleName.es,
    titleGl:rule.visibleName.gl,
    message:originalMessage,
    description:rule.description.es,
    entityType:issue.entityType||rule.entity,
    entityId:clean(issue.entity||issue.entityId||context.entityId),
    importance:importance.id,
    importanceLabel:importance.es,
    kind:importance.kind,
    severity:issue.severity||context.severity||(importance.kind==='HARD'?'ERROR':'INFO'),
    blocksGeneration:Boolean(issue.blocksGeneration??context.blocksGeneration??importance.kind==='HARD'),
    blocksFinalization:Boolean(issue.blocksFinalization??context.blocksFinalization??importance.kind==='HARD'),
    source,
    actions,
    suggestedAction:clean(issue.suggestedAction),
    ordinaryVisible:rule.ordinaryVisible!==false,
    coverage:rule.coverage,
    engineCapabilities:clone(rule.engineCapabilities),
    example:rule.example||'',
    raw:context.includeRaw?clone(issue):undefined,
  };
}

export function semanticizeIssues(issues=[],context={}){return(issues||[]).map(issue=>semanticizeIssue(issue,context));}

export function semanticizeMoveReason(reason,context={}){
  const input=typeof reason==='string'?{message:reason}:reason||{};
  const issue=semanticizeIssue({severity:'ERROR',blocksGeneration:true,blocksFinalization:true,...input},context);
  return {
    ...issue,
    code:issue.technicalCode||issue.semanticRuleId,
    label:issue.title,
    kind:issue.kind,
    originLabel:issue.source?.path||'',
  };
}

export function semanticizePreference(reason,context={}){
  const issue=semanticizeIssue({code:'PREFER_SLOT',message:typeof reason==='string'?reason:reason?.message,severity:'INFO',blocksGeneration:false,blocksFinalization:false},context);
  return{...issue,kind:'SOFT',importance:'PREFERABLE',importanceLabel:'Preferible'};
}


export function semanticizeDailyReason(reason,context={}){
  const message=typeof reason==='string'?reason:String(reason?.message||'');
  const hit=DAILY_REASON_PATTERNS.find(row=>row.pattern.test(message));
  const issue=semanticizeIssue({
    code:hit?.code||'DAILY_COVERAGE_REASON',ruleId:hit?.ruleId||'daily.coverage',message,
    severity:context.eligible===false?'ERROR':'INFO',blocksGeneration:false,blocksFinalization:false,
    entityType:'teacher',entityId:context.teacherId||'',source:context.source,
  },context);
  return{...issue,eligible:context.eligible!==false,positive:context.eligible!==false};
}

export function semanticizeDailyEvent({ruleId='daily.coverage',code='',message='',entityType='',entityId='',severity='INFO',source,actions}={}){
  return semanticizeIssue({ruleId,code,message,entityType,entityId,severity,blocksGeneration:false,blocksFinalization:false,source,actions});
}

export function semanticizeGenerationOutcome(outcome={}){
  const code=outcome.code||outcome.status||outcome.reasonCodes?.[0]||'';
  const issue=semanticizeIssue({code,message:outcome.message||outcome.explanation||'',severity:['ERROR','INFEASIBLE'].includes(outcome.status)?'ERROR':'INFO',blocksGeneration:false,blocksFinalization:false});
  return {...issue,status:outcome.status||'',reasonCodes:[...(outcome.reasonCodes||[])],metrics:clone(outcome.metrics||{})};
}

export function semanticizeClosureCheck(check={}){
  const issue=semanticizeIssue({code:check.id,message:check.detail,severity:check.ok?'INFO':'ERROR',blocksGeneration:false,blocksFinalization:!check.ok});
  return{...check,semantic:issue,label:issue.title||check.label,detail:check.detail||issue.message};
}

export function semanticMessageCard(issue){
  const semantic=issue?.contractVersion===SEMANTIC_EXPLANATION_VERSION?issue:semanticizeIssue(issue||{});
  return {
    title:semantic.title,
    message:semantic.message,
    cause:semantic.description,
    importance:semantic.importanceLabel,
    source:semantic.source?.path||'',
    actions:semantic.actions,
    entityType:semantic.entityType,
    entityId:semantic.entityId,
  };
}

export function ordinaryLanguageAudit(text=''){
  const normalized=String(text||'').toLocaleLowerCase('es');
  const matches=PROHIBITED_ORDINARY_TERMS.filter(term=>normalized.includes(term));
  return{contractVersion:SEMANTIC_FOUNDATION_CONTRACT_VERSION,ok:matches.length===0,matches};
}

export function semanticCoverageAudit({codes=[],messages=[]}={}){
  const codeRows=[...new Set(codes.map(String).filter(Boolean))].map(code=>{
    const resolved=resolveSemanticRule({code});return{code,semanticRuleId:resolved.rule.id,coverage:resolved.rule.coverage,ordinaryVisible:resolved.rule.ordinaryVisible!==false,adapter:resolved.adapter};
  });
  const messageRows=messages.map(message=>{const resolved=resolveSemanticRule({message});return{message,semanticRuleId:resolved.rule.id,coverage:resolved.rule.coverage,adapter:resolved.adapter};});
  const fallback=[...codeRows,...messageRows].filter(row=>row.coverage==='FALLBACK');
  return{contractVersion:SEMANTIC_FOUNDATION_CONTRACT_VERSION,total:codeRows.length+messageRows.length,canonical:codeRows.length+messageRows.length-fallback.length,fallback:fallback.length,ok:fallback.length===0,rows:[...codeRows,...messageRows]};
}

export function semanticRegistrySnapshot(){
  return{contractVersion:SEMANTIC_FOUNDATION_CONTRACT_VERSION,explanationVersion:SEMANTIC_EXPLANATION_VERSION,actionVersion:SEMANTIC_ACTION_VERSION,rules:Object.values(SEMANTIC_RULES).map(clone),codeMap:clone(SEMANTIC_CODE_MAP)};
}
