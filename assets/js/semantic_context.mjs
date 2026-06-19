import { normalizeProject } from './core.mjs';
import { semanticizeIssue } from './semantic_engine.mjs';
import { SEMANTIC_FOUNDATION_CONTRACT_VERSION } from './semantic_catalog.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const includesAll=(source=[],required=[])=>required.every(value=>source.includes(value));

export function compatibleSpacesForActivity(input,activityId,{includeIncompatible=false}={}){
  const project=normalizeProject(input);const activity=project.activities.find(row=>row.id===activityId);
  if(!activity)return[];
  return project.spaces.map(space=>{
    const compatible=includesAll(space.tags||[],activity.requiredSpaceTags||[]);
    return{value:space.id,label:space.name,compatible,reason:compatible?'Compatible con los requisitos de la actividad':`No reúne: ${(activity.requiredSpaceTags||[]).filter(tag=>!(space.tags||[]).includes(tag)).join(', ')}`};
  }).filter(row=>includeIncompatible||row.compatible);
}

export function compatibleTeachersForActivity(input,activityId,{includeAssigned=true}={}){
  const project=normalizeProject(input);const activity=project.activities.find(row=>row.id===activityId);
  if(!activity)return[];
  const assigned=new Set(activity.teacherIds||[]);
  return project.teachers.map(teacher=>({value:teacher.id,label:teacher.name,compatible:true,assigned:assigned.has(teacher.id)})).filter(row=>includeAssigned||!row.assigned);
}

export function contextualOptions(input,{entityType,activityId='',includeIncompatible=false}={}){
  if(entityType==='space')return compatibleSpacesForActivity(input,activityId,{includeIncompatible});
  if(entityType==='teacher')return compatibleTeachersForActivity(input,activityId,{});
  return[];
}

export function semanticSourceRoute(issue){
  const semantic=issue?.semanticRuleId?issue:semanticizeIssue(issue||{});
  return clone(semantic.actions?.[0]?.route||{page:'data',dataTab:'project'});
}

export function projectSemanticProfile(input){
  const project=normalizeProject(input);
  const multislot=project.activities.filter(row=>Number(row.durationSlots||1)>1).length;
  const restrictedSpaces=project.activities.filter(row=>(row.requiredSpaceTags||[]).length>0).length;
  const itinerant=project.teachers.filter(row=>row.itinerary?.enabled).length;
  const organizational=(project.organization?.services||[]).length+(project.organization?.rules||[]).length;
  return{contractVersion:SEMANTIC_FOUNDATION_CONTRACT_VERSION,projectId:project.meta.projectId,counts:{multislot,restrictedSpaces,itinerant,organizational},capabilities:[
    ...(multislot?['activity.multislot']:[]),...(restrictedSpaces?['activity.space_compatibility']:[]),
    ...(itinerant?['teacher.itinerary']:[]),...(organizational?['organization.service']:[]),
  ]};
}
