import {
  createEmptyProject, normalizeProject, syncOrganizationalActivities,
  structuralFingerprint, deepClone, validateProject,
} from './core.mjs';

export const EXAMPLE_LIBRARY_CONTRACT_VERSION = 'product-example-library-1.0';
export const CANONICAL_REGRESSION_GATE = 'CANONICAL_REFERENCE_NO_REGRESSION';
export const CANONICAL_REFERENCE_SOURCE = 'data/fixture_centro_completo_a6.json';
export const CANONICAL_REFERENCE_BASELINE = Object.freeze({
  gate: CANONICAL_REGRESSION_GATE,
  source: CANONICAL_REFERENCE_SOURCE,
  sha256: 'e88d422fa6ca0229ca40b76c287175e836f0ba9d5425986c0f1d201bc9d8694c',
  structuralFingerprint: 'fnv1a-6b97cd92',
  projectId: 'project_fixture_a6',
  counts: Object.freeze({activities:502,assignments:502,groups:15,teachers:29,spaces:14}),
  semanticMinimums: Object.freeze({ldActivities:17,dcActivities:17,breakZones:2,coverageEligibleTeachers:14}),
});

export const EXAMPLE_CATALOG = Object.freeze([
  Object.freeze({
    id:'P12_WEB_MEDIUM', title:'Ejemplo web P12-5', subtitle:'Centro medio sin instalación',
    centerType:'CEIP medio sintético', visibility:'ORDINARY', expectedEngine:'WEB_SOLVER',
    purpose:'Probar generación web en navegador con 5 grupos, 8 docentes, disponibilidad parcial, espacios específicos, guardias simples, recreo y apoyos.',
    capabilities:['Generación local','Centro medio','Guardias simples','Recreo','Apoyos','Disponibilidad parcial','Espacios específicos'],
    semanticCapabilities:['generation.web_solver','organization.service.simple','organization.minimum_presence','schedule.independent_validation','schedule.space_occupancy'],
    expectedCounts:{activities:33,assignments:0,groups:5,teachers:8,spaces:8,occurrences:79},
    status:'READY_TO_GENERATE_WEB_MEDIUM',
  }),
  Object.freeze({
    id:'P12_ORG41_LIGHT', title:'Ejemplo web P12-2', subtitle:'Organización ligera sin instalación',
    centerType:'Caso organizativo ligero', visibility:'ORDINARY', expectedEngine:'WEB_SOLVER',
    purpose:'Probar generación web con presencia mínima, reglas organizativas simples, preferencias e inmediato antes/después.',
    capabilities:['Generación local','Presencia mínima','Reglas simples','Relación inmediata','Disponibilidad','Espacios compatibles'],
    semanticCapabilities:['generation.web_solver','organization.minimum_presence','organization.rules','activity.relation.immediate','schedule.independent_validation'],
    expectedCounts:{activities:8,assignments:0,groups:2,teachers:4,spaces:3,occurrences:18},
    status:'READY_TO_GENERATE_WEB_ORG_LIGHT',
  }),
  Object.freeze({
    id:'P12_WEB_MINI', title:'Ejemplo web P12-1', subtitle:'Caso mínimo sin instalación',
    centerType:'Caso mínimo', visibility:'ORDINARY', expectedEngine:'WEB_SOLVER',
    purpose:'Probar que la app genera desde el navegador un horario simple sin instalaciones técnicas.',
    capabilities:['Generación local','No solapes básicos','Disponibilidad','Espacios compatibles'],
    semanticCapabilities:['generation.web_solver','schedule.teacher_occupancy','schedule.group_occupancy','schedule.space_occupancy'],
    expectedCounts:{activities:6,assignments:0,groups:2,teachers:3,spaces:3,occurrences:16},
    status:'READY_TO_GENERATE_WEB',
  }),
]);

const FIXED_DATE='2026-06-17T12:00:00.000Z';
const DAYS=['MON','TUE','WED','THU','FRI'];
const CLASS_SLOTS=['S1','S2','S3','S4','S5'];
const provenance=()=>({origin:'SYNTHETIC',sourceRef:'Biblioteca pública de centros de ejemplo P4',verifiedBy:'QA P4',verifiedAt:'2026-06-17'});

function subject(id,name,stage){return {id,name,stage,dataState:'SIMULATED',provenance:provenance()};}
function teacher(id,name,role,weeklyTarget=20,extra={}){return {id,name,role,specialty:role,weeklyTarget,coverageEligible:true,essentialProfiles:[],unavailable:[],presence:[],ldQuota:0,dcQuota:0,itinerary:{enabled:false,presenceDays:[],travelMinutes:0,state:'CONFIRMED'},dataState:'SIMULATED',provenance:provenance(),...extra};}
function group(id,name,stage,tutorTeacherId=''){return {id,name,stage,tutorTeacherId,dataState:'SIMULATED',provenance:provenance()};}
function space(id,name,tags,capacity=1){return {id,name,tags,capacity,dataState:'SIMULATED',provenance:provenance()};}
function activity(id,name,{kind='TEACHING',subjectId='',groupIds=[],teacherIds=[],weeklySessions=1,durationSlots=1,requiredSpaceTags=[],allowedDays=[],allowedSlots=[],preferredDays=[],preferredSlots=[],fixedOccurrences=[],priority=50,maxPerDay=1,mandatory=true}={}){
  return {id,name,kind,subjectId,groupId:groupIds[0]||'',groupIds,teacherIds,weeklySessions,durationSlots,requiredSpaceTags,allowedDays,allowedSlots,preferredDays,preferredSlots,fixedOccurrences,priority,maxPerDay,mandatory,consecutive:'NONE',source:'EXAMPLE_LIBRARY',dataState:'SIMULATED',provenance:provenance()};
}
function baseProject(id,name,center){
  const p=createEmptyProject({name,center,academicYear:'2026/2027',responsible:'Jefatura de estudios · ejemplo sintético',privacyClass:'SYNTHETIC'});
  Object.assign(p.meta,{projectId:`example_${id.toLowerCase()}`,revisionId:`example_${id.toLowerCase()}_rev_001`,revisionNumber:1,status:'DRAFT',dataState:'SIMULATED',createdAt:FIXED_DATE,updatedAt:FIXED_DATE,lastAcceptedAt:null});
  p.setup.active=false;p.setup.completedSteps=[1,2,3,4,5,6,7,8,9];
  p.organization.enabled=true;
  p.organization.profile={id:`example-${id.toLowerCase()}-1.0`,name:`Perfil sintético ${name}`,version:'1.0',dataState:'SIMULATED',provenance:provenance()};
  p.daily.settings.reportingPeriodsState='CONFIGURED';
  p.daily.settings.reportingPeriods=[
    {id:'term1',label:'1.ª evaluación',fromDate:'2026-09-09',toDate:'2026-12-21'},
    {id:'term2',label:'2.ª evaluación',fromDate:'2027-01-11',toDate:'2027-03-26'},
    {id:'term3',label:'3.ª evaluación',fromDate:'2027-04-05',toDate:'2027-06-21'},
  ];
  return p;
}
function finalize(p){
  syncOrganizationalActivities(p);
  const n=normalizeProject(p);
  n.meta.createdAt=FIXED_DATE;n.meta.updatedAt=FIXED_DATE;
  n.meta.structuralFingerprint=structuralFingerprint(n);
  return n;
}

function createP12WebMini(){
  const p=baseProject('P12_WEB_MINI','Ejemplo web P12-1 · generación local','Centro mínimo P12-1');
  p.organization.enabled=false;
  p.organization.minimumPresence=[];
  p.organization.breakZones=[];
  p.organization.services=[];
  p.organization.rules=[];
  p.organization.preferences=[];
  p.domain={};
  p.subjects=[subject('p12_len','Lengua','Primaria'),subject('p12_mat','Matemáticas','Primaria'),subject('p12_ing','Inglés','Primaria')];
  p.teachers=[teacher('p12_t1','Docente P12 01','Tutoría',10),teacher('p12_t2','Docente P12 02','Tutoría',10),teacher('p12_t3','Especialista P12 Inglés','Inglés',6,{unavailable:['MON:S1','MON:S2']})];
  p.groups=[group('p12_g1','Grupo P12 A','Primaria','p12_t1'),group('p12_g2','Grupo P12 B','Primaria','p12_t2')];
  p.spaces=[space('p12_a1','Aula P12 A',['AULA']),space('p12_a2','Aula P12 B',['AULA']),space('p12_i1','Aula de idiomas P12',['IDIOMAS'])];
  p.activities=[
    activity('p12_g1_len','Lengua · Grupo P12 A',{subjectId:'p12_len',groupIds:['p12_g1'],teacherIds:['p12_t1'],weeklySessions:3,requiredSpaceTags:['AULA'],maxPerDay:1}),
    activity('p12_g1_mat','Matemáticas · Grupo P12 A',{subjectId:'p12_mat',groupIds:['p12_g1'],teacherIds:['p12_t1'],weeklySessions:3,requiredSpaceTags:['AULA'],maxPerDay:1}),
    activity('p12_g1_ing','Inglés · Grupo P12 A',{subjectId:'p12_ing',groupIds:['p12_g1'],teacherIds:['p12_t3'],weeklySessions:2,requiredSpaceTags:['IDIOMAS'],maxPerDay:1}),
    activity('p12_g2_len','Lengua · Grupo P12 B',{subjectId:'p12_len',groupIds:['p12_g2'],teacherIds:['p12_t2'],weeklySessions:3,requiredSpaceTags:['AULA'],maxPerDay:1}),
    activity('p12_g2_mat','Matemáticas · Grupo P12 B',{subjectId:'p12_mat',groupIds:['p12_g2'],teacherIds:['p12_t2'],weeklySessions:3,requiredSpaceTags:['AULA'],maxPerDay:1}),
    activity('p12_g2_ing','Inglés · Grupo P12 B',{subjectId:'p12_ing',groupIds:['p12_g2'],teacherIds:['p12_t3'],weeklySessions:2,requiredSpaceTags:['IDIOMAS'],maxPerDay:1}),
  ];
  return finalize(p);
}


function createP12OrgLight(){
  const p=createP12WebMini();
  Object.assign(p.meta,{projectId:'example_p12_org41_light',revisionId:'example_p12_org41_light_rev_001',name:'Ejemplo web P12-2 · dominio organizativo ligero',center:'Centro P12-2 organizativo ligero',status:'DRAFT',updatedAt:FIXED_DATE});
  p.organization.enabled=true;
  p.organization.profile={id:'p12-org-light-1.0',name:'Perfil P12-2 organizativo ligero',version:'1.0',dataState:'SIMULATED',provenance:provenance()};
  p.organization.ldDc={ordinaryLd:0,ordinaryDc:0,ldAllowedSlots:['S1','S5'],dcAllowedSlots:['S1','S5'],placement:'FLEXIBLE',grouping:'FLEXIBLE',maxSimultaneousLd:1,dcCoverageAllowed:true};
  p.organization.coveragePolicy={enabled:true,releasableKinds:['DC'],presenceExcludingKinds:['LD','REDUCTION'],preserveEssentialPresence:true,excludeItinerantWhenAbsent:true,maxDailyCoverages:null};
  p.organization.minimumPresence=[{id:'p12_min_1',name:'Presencia mínima ordinaria',minimum:1,profileTag:'',dayIds:['MON','TUE','WED','THU','FRI'],slotIds:['S1','S2','S3','S4','S5'],active:true,dataState:'SIMULATED',provenance:provenance()}];
  p.organization.breakZones=[];
  p.organization.services=[];
  p.organization.anchoredSegments=[];
  p.organization.rules=[{id:'p12_rule_no_last_opening',type:'FORBID_SLOT',activityId:'p12_org_opening',slotId:'S5',level:'HARD',active:true,label:'La apertura organizativa no puede ir a última hora.',dataState:'SIMULATED',provenance:provenance()}];
  p.organization.preferences=[{id:'p12_pref_edges',type:'AVOID_EDGE_SLOTS',level:'SOFT',weight:4,active:true,label:'Evitar sesiones extremas cuando sea posible.',dataState:'SIMULATED',provenance:provenance()}];
  p.constraints=[{id:'p12_c_ing_not_mon_s1',type:'FORBID_SLOT',teacherId:'p12_t3',slotId:'S1',level:'HARD',active:true,label:'El especialista de inglés no se coloca a primera hora.',dataState:'SIMULATED',provenance:provenance()}];
  p.subjects.push(subject('p12_org','Organización P12','Primaria'));
  p.teachers.push(teacher('p12_t4','Docente P12 04','Apoyo organizativo',8,{essentialProfiles:['APOYO']}));
  p.activities.push(
    activity('p12_org_opening','Apertura organizativa · Grupo P12 A',{subjectId:'p12_org',groupIds:['p12_g1'],teacherIds:['p12_t4'],weeklySessions:1,requiredSpaceTags:['AULA'],fixedOccurrences:[{dayId:'MON',slotId:'S1'}],priority:90,maxPerDay:1}),
    activity('p12_org_followup','Trabajo posterior · Grupo P12 A',{subjectId:'p12_org',groupIds:['p12_g1'],teacherIds:['p12_t4'],weeklySessions:1,requiredSpaceTags:['AULA'],fixedOccurrences:[{dayId:'MON',slotId:'S2'}],priority:85,maxPerDay:1})
  );
  p.domain={
    contractVersion:'educational-domain-4.0',
    cycle:{mode:'WEEKLY',weeks:[{id:'W1',label:'Semana ordinaria',active:true}]},
    sites:[],travelRules:[],resources:[],splitSets:[],
    activityRelations:[{id:'p12_rel_immediate',type:'IMMEDIATELY_BEFORE',leftActivityId:'p12_org_opening',rightActivityId:'p12_org_followup',sameWeek:true,hard:true,active:true,label:'Apertura inmediatamente antes del trabajo posterior'}]
  };
  return finalize(p);
}


function createP12WebMedium(){
  const p=baseProject('P12_WEB_MEDIUM','Ejemplo web P12-5 · centro medio','CEIP medio P12-5');
  p.organization.enabled=true;
  p.organization.profile={id:'p12-medium-web-1.0',name:'Perfil P12-5 centro medio web',version:'1.0',dataState:'SIMULATED',provenance:provenance()};
  p.organization.ldDc={ordinaryLd:0,ordinaryDc:0,ldAllowedSlots:['S1','S5'],dcAllowedSlots:['S1','S5'],placement:'FLEXIBLE',grouping:'FLEXIBLE',maxSimultaneousLd:1,dcCoverageAllowed:true};
  p.organization.coveragePolicy={enabled:true,releasableKinds:['DC'],presenceExcludingKinds:['LD','REDUCTION'],preserveEssentialPresence:true,excludeItinerantWhenAbsent:true,maxDailyCoverages:null};
  p.organization.minimumPresence=[{id:'p12m_min_general',name:'Presencia mínima general',minimum:3,profileTag:'',dayIds:['MON','TUE','WED','THU','FRI'],slotIds:['S1','S2','S3','S4','S5'],active:true,dataState:'SIMULATED',provenance:provenance()}];
  p.organization.breakZones=[{id:'p12m_patio',name:'Patio P12-5',slotIds:['R1'],minimumStaff:2,essentialProfileTags:[],excludedTeacherIds:[],active:true,dataState:'SIMULATED',provenance:provenance()}];
  p.organization.services=[
    {id:'p12m_break_pair',name:'Vigilancia de recreo P12-5',kind:'BREAK_DUTY',teacherIds:['p12m_t6','p12m_t8'],groupIds:[],weeklySessions:5,allowedSlots:['R1'],zoneId:'p12m_patio',priority:80,maxPerDay:1,active:true,dataState:'SIMULATED',provenance:provenance()},
    {id:'p12m_guard_1',name:'Guardia ordinaria P12-5',kind:'GUARD',teacherIds:['p12m_t8'],groupIds:[],weeklySessions:2,allowedSlots:['S3','S4'],priority:60,maxPerDay:1,active:true,dataState:'SIMULATED',provenance:provenance()},
    {id:'p12m_support_1',name:'Apoyo lector P12 A',kind:'SUPPORT',teacherIds:['p12m_t8'],groupIds:['p12m_g1'],weeklySessions:2,allowedSlots:['S2','S3','S4'],requiredSpaceTags:['AULA'],priority:70,maxPerDay:1,active:true,dataState:'SIMULATED',provenance:provenance()}
  ];
  p.organization.anchoredSegments=[];
  p.organization.rules=[
    {id:'p12m_rule_no_pe_s1',type:'FORBID_SLOT',teacherId:'p12m_t7',slotId:'S1',level:'HARD',active:true,label:'Educación física no se coloca a primera hora.',dataState:'SIMULATED',provenance:provenance()},
    {id:'p12m_rule_english_not_fri_last',type:'FORBID_SLOT',teacherId:'p12m_t6',slotId:'S5',level:'HARD',active:true,label:'Inglés no se coloca a última hora.',dataState:'SIMULATED',provenance:provenance()}
  ];
  p.organization.preferences=[
    {id:'p12m_pref_edges',type:'AVOID_EDGE_SLOTS',level:'SOFT',weight:3,active:true,label:'Evitar primeras y últimas horas cuando sea posible.',dataState:'SIMULATED',provenance:provenance()},
    {id:'p12m_pref_tut_morning',type:'PREFER_SLOT',kind:'TEACHING',slotId:'S2',level:'SOFT',weight:2,active:true,label:'Favorecer tramos centrales.',dataState:'SIMULATED',provenance:provenance()}
  ];
  p.domain={contractVersion:'educational-domain-4.0',cycle:{mode:'WEEKLY',weeks:[{id:'W1',label:'Semana ordinaria',active:true}]},sites:[],travelRules:[],resources:[],splitSets:[],activityRelations:[]};
  p.subjects=[subject('p12m_len','Lengua','Primaria'),subject('p12m_mat','Matemáticas','Primaria'),subject('p12m_ing','Inglés','Primaria'),subject('p12m_ef','Educación Física','Primaria'),subject('p12m_mus','Música','Primaria'),subject('p12m_dig','Competencia digital','Primaria')];
  p.teachers=[
    teacher('p12m_t1','Tutora P12-5 A','Tutoría',18),teacher('p12m_t2','Tutor P12-5 B','Tutoría',18),teacher('p12m_t3','Tutora P12-5 C','Tutoría',18),teacher('p12m_t4','Tutor P12-5 D','Tutoría',18),teacher('p12m_t5','Tutora P12-5 E','Tutoría',18),
    teacher('p12m_t6','Especialista P12-5 Inglés','Inglés',12,{unavailable:['MON:S1','FRI:S5']}),
    teacher('p12m_t7','Especialista P12-5 Educación Física','Educación Física',12,{unavailable:['TUE:S5']}),
    teacher('p12m_t8','Docente P12-5 apoyo y guardias','Apoyo/guardias',18,{essentialProfiles:['APOYO'],unavailable:['THU:S5']})
  ];
  p.groups=[group('p12m_g1','Grupo P12-5 A','Primaria','p12m_t1'),group('p12m_g2','Grupo P12-5 B','Primaria','p12m_t2'),group('p12m_g3','Grupo P12-5 C','Primaria','p12m_t3'),group('p12m_g4','Grupo P12-5 D','Primaria','p12m_t4'),group('p12m_g5','Grupo P12-5 E','Primaria','p12m_t5')];
  p.spaces=[space('p12m_a1','Aula P12-5 A',['AULA']),space('p12m_a2','Aula P12-5 B',['AULA']),space('p12m_a3','Aula P12-5 C',['AULA']),space('p12m_a4','Aula P12-5 D',['AULA']),space('p12m_a5','Aula P12-5 E',['AULA']),space('p12m_id','Aula idiomas P12-5',['IDIOMAS','AULA']),space('p12m_gym','Pabellón P12-5',['DEPORTIVO']),space('p12m_mus','Aula música P12-5',['MUSICA','AULA'])];
  const tutors=['p12m_t1','p12m_t2','p12m_t3','p12m_t4','p12m_t5'];
  for(let i=0;i<p.groups.length;i++){
    const g=p.groups[i],t=tutors[i],aula=`p12m_a${i+1}`;
    p.activities.push(activity(`p12m_len_${i+1}`,`Lengua · ${g.name}`,{subjectId:'p12m_len',groupIds:[g.id],teacherIds:[t],weeklySessions:4,allowedSpaceIds:[aula],maxPerDay:1,priority:80}));
    p.activities.push(activity(`p12m_mat_${i+1}`,`Matemáticas · ${g.name}`,{subjectId:'p12m_mat',groupIds:[g.id],teacherIds:[t],weeklySessions:4,allowedSpaceIds:[aula],maxPerDay:1,priority:80}));
    p.activities.push(activity(`p12m_ing_${i+1}`,`Inglés · ${g.name}`,{subjectId:'p12m_ing',groupIds:[g.id],teacherIds:['p12m_t6'],weeklySessions:2,requiredSpaceTags:['IDIOMAS'],maxPerDay:1,priority:70}));
    p.activities.push(activity(`p12m_ef_${i+1}`,`Educación Física · ${g.name}`,{subjectId:'p12m_ef',groupIds:[g.id],teacherIds:['p12m_t7'],weeklySessions:2,requiredSpaceTags:['DEPORTIVO'],maxPerDay:1,priority:70}));
    p.activities.push(activity(`p12m_mus_${i+1}`,`Música · ${g.name}`,{subjectId:'p12m_mus',groupIds:[g.id],teacherIds:['p12m_t8'],weeklySessions:1,requiredSpaceTags:['MUSICA'],maxPerDay:1,priority:55}));
    p.activities.push(activity(`p12m_dig_${i+1}`,`Competencia digital · ${g.name}`,{subjectId:'p12m_dig',groupIds:[g.id],teacherIds:[t],weeklySessions:1,allowedSpaceIds:[aula],preferredSlots:['S3','S4'],maxPerDay:1,priority:55}));
  }
  return finalize(p);
}


function createCeipRural(){
  const p=baseProject('CEIP_RURAL','CEIP rural · unidades mixtas','CEIP rural sintético');
  p.subjects=[subject('sr_leng','Ámbito lingüístico','Primaria'),subject('sr_mat','Ámbito matemático','Primaria'),subject('sr_ing','Lengua extranjera','Primaria'),subject('sr_ef','Educación Física','Primaria'),subject('sr_art','Educación artística','Primaria')];
  p.teachers=[
    teacher('tr1','Docente rural 01','Tutoría infantil y 1.º',22,{ldQuota:2,dcQuota:2}),
    teacher('tr2','Docente rural 02','Tutoría 2.º-3.º',22,{ldQuota:2,dcQuota:2}),
    teacher('tr3','Docente rural 03','Tutoría 4.º-6.º',22,{ldQuota:2,dcQuota:2}),
    teacher('tr4','Especialista itinerante de Inglés','Inglés',10,{itinerary:{enabled:true,presenceDays:['TUE','THU'],travelMinutes:35,state:'CONFIRMED'},unavailable:DAYS.filter(d=>!['TUE','THU'].includes(d)).flatMap(d=>CLASS_SLOTS.map(s=>`${d}:${s}`))}),
    teacher('tr5','Especialista itinerante de Educación Física','Educación Física',8,{itinerary:{enabled:true,presenceDays:['MON','WED'],travelMinutes:25,state:'CONFIRMED'},unavailable:DAYS.filter(d=>!['MON','WED'].includes(d)).flatMap(d=>CLASS_SLOTS.map(s=>`${d}:${s}`))}),
    teacher('tr6','Docente de apoyo rural','Apoyo y PT',18,{essentialProfiles:['APOYO']}),
    teacher('tr7','Especialista de artística compartida','Educación artística',8,{unavailable:['MON:S1','MON:S2','FRI:S4','FRI:S5']}),
  ];
  p.groups=[group('gr1','Infantil y 1.º mixto','Infantil/Primaria','tr1'),group('gr2','2.º y 3.º mixto','Primaria','tr2'),group('gr3','4.º y 5.º mixto','Primaria','tr3'),group('gr4','6.º Primaria','Primaria','tr3')];
  p.spaces=[space('spr1','Aula mixta norte',['AULA']),space('spr2','Aula mixta sur',['AULA']),space('spr3','Aula polivalente',['AULA','ARTISTICA'],2),space('spr4','Patio cubierto',['DEPORTIVO','RECREO']),space('spr5','Biblioteca rural',['BIBLIOTECA','AULA']),space('spr6','Zona exterior',['RECREO','DEPORTIVO'],2)];
  const tutors=['tr1','tr2','tr3','tr3'];
  for(let i=0;i<p.groups.length;i++){
    const g=p.groups[i],t=tutors[i];
    p.activities.push(activity(`r_l_${i}`,`Ámbito lingüístico · ${g.name}`,{subjectId:'sr_leng',groupIds:[g.id],teacherIds:[t],weeklySessions:6,requiredSpaceTags:['AULA'],maxPerDay:2}));
    p.activities.push(activity(`r_m_${i}`,`Ámbito matemático · ${g.name}`,{subjectId:'sr_mat',groupIds:[g.id],teacherIds:[t],weeklySessions:5,requiredSpaceTags:['AULA']}));
    p.activities.push(activity(`r_i_${i}`,`Inglés · ${g.name}`,{subjectId:'sr_ing',groupIds:[g.id],teacherIds:['tr4'],weeklySessions:2,requiredSpaceTags:['AULA'],allowedDays:['TUE','THU']}));
    p.activities.push(activity(`r_e_${i}`,`Educación Física · ${g.name}`,{subjectId:'sr_ef',groupIds:[g.id],teacherIds:['tr5'],weeklySessions:2,requiredSpaceTags:['DEPORTIVO'],allowedDays:['MON','WED']}));
    p.activities.push(activity(`r_a_${i}`,`Educación artística · ${g.name}`,{subjectId:'sr_art',groupIds:[g.id],teacherIds:['tr7'],weeklySessions:2,requiredSpaceTags:['ARTISTICA']}));
  }
  p.activities.push(activity('r_support_1','Apoyo multinivel 2.º-3.º',{kind:'SUPPORT',groupIds:['gr2'],teacherIds:['tr2','tr6'],weeklySessions:2,requiredSpaceTags:['AULA'],preferredDays:['TUE','THU']}));
  p.activities.push(activity('r_support_2','Apoyo multinivel 4.º-6.º',{kind:'SUPPORT',groupIds:['gr3','gr4'],teacherIds:['tr6'],weeklySessions:2,requiredSpaceTags:['AULA']}));
  p.organization.breakZones=[{id:'rz1',name:'Patio y zona exterior',slotIds:['R1'],minimumStaff:2,essentialProfileTags:[],excludedTeacherIds:['tr4','tr5'],dataState:'SIMULATED',provenance:provenance()}];
  p.organization.minimumPresence=[{id:'rmp1',dayIds:DAYS,slotIds:CLASS_SLOTS,minimum:3,profileTag:'',active:true,dataState:'SIMULATED',provenance:provenance()}];
  return finalize(p);
}

function createCeipUrbanLarge(){
  const p=baseProject('CEIP_URBAN_LARGE','CEIP urbano grande · tres líneas','CEIP urbano grande sintético');
  p.subjects=[subject('su_l','Lengua Castellana','Primaria'),subject('su_g','Lingua Galega','Primaria'),subject('su_m','Matemáticas','Primaria'),subject('su_n','Ciencias','Primaria'),subject('su_i','Inglés','Primaria'),subject('su_e','Educación Física','Primaria'),subject('su_a','Educación Artística','Primaria')];
  for(let i=1;i<=18;i++)p.teachers.push(teacher(`tu${i}`,`Tutoría urbana ${String(i).padStart(2,'0')}`,'Tutoría',22,{ldQuota:2,dcQuota:2}));
  for(let i=1;i<=4;i++)p.teachers.push(teacher(`tui${i}`,`Especialista Inglés ${i}`,'Inglés',20));
  for(let i=1;i<=3;i++)p.teachers.push(teacher(`tue${i}`,`Especialista Educación Física ${i}`,'Educación Física',20));
  for(let i=1;i<=2;i++)p.teachers.push(teacher(`tua${i}`,`Especialista Artística ${i}`,'Educación artística',20));
  p.teachers.push(teacher('tup1','Docente PT','Pedagogía terapéutica',18,{essentialProfiles:['APOYO']}),teacher('tup2','Docente AL','Audición y lenguaje',18,{essentialProfiles:['APOYO']}),teacher('tuj','Jefatura de estudios','Equipo directivo',14,{positions:[{id:'pos_j',type:'LEADERSHIP',label:'Jefatura de estudios',weeklySessions:6,allowedDays:[],allowedSlots:[],dataState:'SIMULATED',provenance:provenance()}]}));
  for(let grade=1;grade<=6;grade++)for(let line=0;line<3;line++){const idx=(grade-1)*3+line+1;const letter='ABC'[line];p.groups.push(group(`gu${idx}`,`${grade}.º Primaria ${letter}`,'Primaria',`tu${idx}`));}
  for(let i=1;i<=18;i++)p.spaces.push(space(`spu${i}`,`Aula grupo ${i}`,['AULA']));
  p.spaces.push(space('spui1','Aula de idiomas 1',['AULA','IDIOMAS']),space('spui2','Aula de idiomas 2',['AULA','IDIOMAS']),space('spug1','Gimnasio',['DEPORTIVO'],2),space('spup','Patio zonificado',['RECREO','DEPORTIVO'],4));
  for(let i=0;i<p.groups.length;i++){
    const g=p.groups[i],t=`tu${i+1}`,ing=`tui${(i%4)+1}`,ef=`tue${(i%3)+1}`,art=`tua${(i%2)+1}`;
    const defs=[['su_l','Lengua Castellana',4,t,['AULA']],['su_g','Lingua Galega',4,t,['AULA']],['su_m','Matemáticas',5,t,['AULA']],['su_n','Ciencias',3,t,['AULA']],['su_i','Inglés',3,ing,['IDIOMAS']],['su_e','Educación Física',2,ef,['DEPORTIVO']],['su_a','Educación Artística',2,art,['AULA']]];
    for(const [sid,n,sessions,tid,tags] of defs)p.activities.push(activity(`u_${sid}_${i}`,`${n} · ${g.name}`,{subjectId:sid,groupIds:[g.id],teacherIds:[tid],weeklySessions:sessions,requiredSpaceTags:tags,maxPerDay:n==='Matemáticas'?2:1}));
  }
  for(let i=0;i<12;i++){const g=p.groups[i%18];p.activities.push(activity(`u_support_${i}`,`Apoyo inclusivo ${i+1} · ${g.name}`,{kind:'SUPPORT',groupIds:[g.id],teacherIds:[i%2?'tup1':'tup2'],weeklySessions:1,requiredSpaceTags:['AULA']}));}
  p.organization.breakZones=[
    {id:'uz1',name:'Zona infantil',slotIds:['R1'],minimumStaff:3,essentialProfileTags:[],excludedTeacherIds:[],dataState:'SIMULATED',provenance:provenance()},
    {id:'uz2',name:'Zona primaria baja',slotIds:['R1'],minimumStaff:3,essentialProfileTags:[],excludedTeacherIds:[],dataState:'SIMULATED',provenance:provenance()},
    {id:'uz3',name:'Zona primaria alta',slotIds:['R1'],minimumStaff:3,essentialProfileTags:[],excludedTeacherIds:[],dataState:'SIMULATED',provenance:provenance()},
  ];
  p.organization.minimumPresence=[{id:'ump',dayIds:DAYS,slotIds:CLASS_SLOTS,minimum:10,profileTag:'',active:true,dataState:'SIMULATED',provenance:provenance()}];
  return finalize(p);
}

function createIesSmall(){
  const p=baseProject('IES_SMALL','IES pequeño · optativas y desdobles','IES pequeño sintético');
  const subjects=[['si_l','Lengua'],['si_g','Lingua Galega'],['si_m','Matemáticas'],['si_i','Inglés'],['si_b','Biología y Geología'],['si_f','Física y Química'],['si_t','Tecnología'],['si_e','Educación Física'],['si_o1','Optativa científica'],['si_o2','Optativa humanística']];
  p.subjects=subjects.map(([id,n])=>subject(id,n,'ESO/Bacharelato'));
  const roles=['Lengua','Lingua Galega','Matemáticas','Inglés','Biología','Física y Química','Tecnología','Educación Física','Orientación','Pedagogía terapéutica'];
  for(let i=1;i<=20;i++)p.teachers.push(teacher(`ti${i}`,`Profesorado IES ${String(i).padStart(2,'0')}`,roles[(i-1)%roles.length],18,{coverageEligible:i!==9}));
  const names=['1.º ESO A','1.º ESO B','2.º ESO A','2.º ESO B','3.º ESO A','3.º ESO B','4.º ESO A','1.º Bacharelato A'];
  names.forEach((n,i)=>p.groups.push(group(`gi${i+1}`,n,n.includes('Bach')?'Bacharelato':'ESO',`ti${i+1}`)));
  for(let i=1;i<=8;i++)p.spaces.push(space(`spi${i}`,`Aula ${names[i-1]}`,['AULA']));
  p.spaces.push(space('spil1','Laboratorio de ciencias',['LABORATORIO']),space('spit1','Aula-taller de tecnología',['TALLER']),space('spii1','Aula de idiomas',['IDIOMAS']),space('spig1','Gimnasio',['DEPORTIVO']),space('spio1','Aula de optativas 1',['AULA','OPTATIVA']),space('spio2','Aula de optativas 2',['AULA','OPTATIVA']));
  const teacherFor={si_l:'ti1',si_g:'ti3',si_m:'ti5',si_i:'ti7',si_b:'ti9',si_f:'ti11',si_t:'ti13',si_e:'ti15'};
  for(let i=0;i<p.groups.length;i++){
    const g=p.groups[i];
    const defs=[['si_l','Lengua',4,['AULA']],['si_g','Lingua Galega',3,['AULA']],['si_m','Matemáticas',4,['AULA']],['si_i','Inglés',3,['IDIOMAS']],['si_b','Biología y Geología',2,['LABORATORIO']],['si_f','Física y Química',2,['LABORATORIO']],['si_t','Tecnología',2,['TALLER']],['si_e','Educación Física',2,['DEPORTIVO']]];
    for(const [sid,n,sessions,tags] of defs)p.activities.push(activity(`i_${sid}_${i}`,`${n} · ${g.name}`,{subjectId:sid,groupIds:[g.id],teacherIds:[teacherFor[sid]],weeklySessions:sessions,requiredSpaceTags:tags}));
    p.activities.push(activity(`i_tut_${i}`,`Tutoría · ${g.name}`,{kind:'MEETING',groupIds:[],teacherIds:[g.tutorTeacherId],weeklySessions:1,requiredSpaceTags:['AULA'],allowedSlots:['S5']}));
  }
  p.activities.push(activity('i_opt1','Optativa científica · 4.º ESO',{subjectId:'si_o1',groupIds:['gi7'],teacherIds:['ti17'],weeklySessions:3,requiredSpaceTags:['OPTATIVA']}));
  p.activities.push(activity('i_opt2','Optativa humanística · 4.º ESO',{subjectId:'si_o2',groupIds:['gi7'],teacherIds:['ti18'],weeklySessions:3,requiredSpaceTags:['OPTATIVA']}));
  p.activities.push(activity('i_split1','Desdoble de laboratorio · 3.º ESO A',{kind:'SUPPORT',subjectId:'si_b',groupIds:['gi5'],teacherIds:['ti9','ti10'],weeklySessions:1,requiredSpaceTags:['LABORATORIO']}));
  p.activities.push(activity('i_split2','Desdoble de laboratorio · 3.º ESO B',{kind:'SUPPORT',subjectId:'si_b',groupIds:['gi6'],teacherIds:['ti9','ti10'],weeklySessions:1,requiredSpaceTags:['LABORATORIO']}));
  for(let i=1;i<=5;i++)p.activities.push(activity(`i_guard_${i}`,`Guardia semanal ${i}`,{kind:'GUARD',teacherIds:[`ti${15+i}`],weeklySessions:2,allowedSlots:CLASS_SLOTS}));
  p.organization.minimumPresence=[{id:'imp',dayIds:DAYS,slotIds:CLASS_SLOTS,minimum:6,profileTag:'',active:true,dataState:'SIMULATED',provenance:provenance()}];
  return finalize(p);
}

function createCifp(){
  const p=baseProject('CIFP_SYNTHETIC','CIFP sintético · talleres y multitramos','CIFP sintético de formación profesional');
  p.calendar.slots=[
    {id:'M1',label:'Mañana 1',kind:'CLASS',start:'08:30',end:'09:25'},{id:'M2',label:'Mañana 2',kind:'CLASS',start:'09:25',end:'10:20'},{id:'M3',label:'Mañana 3',kind:'CLASS',start:'10:20',end:'11:15'},{id:'MR',label:'Recreo mañana',kind:'BREAK',start:'11:15',end:'11:45'},{id:'M4',label:'Mañana 4',kind:'CLASS',start:'11:45',end:'12:40'},{id:'M5',label:'Mañana 5',kind:'CLASS',start:'12:40',end:'13:35'},{id:'M6',label:'Mañana 6',kind:'CLASS',start:'13:35',end:'14:30'},
    {id:'T1',label:'Tarde 1',kind:'CLASS',start:'16:00',end:'16:55'},{id:'T2',label:'Tarde 2',kind:'CLASS',start:'16:55',end:'17:50'},{id:'T3',label:'Tarde 3',kind:'CLASS',start:'17:50',end:'18:45'},{id:'TR',label:'Descanso tarde',kind:'BREAK',start:'18:45',end:'19:15'},{id:'T4',label:'Tarde 4',kind:'CLASS',start:'19:15',end:'20:10'},{id:'T5',label:'Tarde 5',kind:'CLASS',start:'20:10',end:'21:05'},{id:'T6',label:'Tarde 6',kind:'CLASS',start:'21:05',end:'22:00'},
  ];
  p.subjects=[subject('sc_tec','Procesos técnicos','FP'),subject('sc_seg','Seguridad e hixiene','FP'),subject('sc_dig','Dixitalización','FP'),subject('sc_pro','Proxecto intermodular','FP'),subject('sc_emp','Itinerario para a empregabilidade','FP')];
  for(let i=1;i<=18;i++)p.teachers.push(teacher(`tc${i}`,`Profesorado CIFP ${String(i).padStart(2,'0')}`,i<=8?'Especialidade técnica':i<=14?'Especialidade secundaria':'Módulos transversais',18));
  const groups=[['gc1','1.º Cociña A','M'],['gc2','2.º Cociña A','M'],['gc3','1.º Pastelaría A','M'],['gc4','2.º Pastelaría A','M'],['gc5','1.º Dirección de Cociña','T'],['gc6','2.º Dirección de Cociña','T']];
  groups.forEach(([id,n],i)=>p.groups.push(group(id,n,'Formación Profesional',`tc${i+1}`)));
  p.spaces=[space('sct1','Taller de cociña 1',['TALLER_COCINA']),space('sct2','Taller de cociña 2',['TALLER_COCINA']),space('scp1','Obrador de pastelaría',['OBRADOR_PASTELERIA']),space('sccf','Cuarto frío',['CUARTO_FRIO']),space('screst','Aula restaurante',['RESTAURANTE']),space('scl1','Laboratorio alimentario',['LABORATORIO']),space('sca1','Aula teórica 1',['AULA']),space('sca2','Aula teórica 2',['AULA']),space('sca3','Aula teórica 3',['AULA']),space('sci1','Aula informática',['INFORMATICA']),space('scalm','Almacén didáctico',['ALMACEN']),space('scec','Economato',['ECONOMATO']),space('scv1','Vestiario técnico',['VESTIARIO'],2),space('scm1','Aula polivalente',['AULA','REUNION'],2)];
  const morning=['M1','M2','M3','M4','M5','M6'],afternoon=['T1','T2','T3','T4','T5','T6'];
  for(let i=0;i<p.groups.length;i++){
    const g=p.groups[i],isPastry=g.name.includes('Pastelaría'),isAfternoon=i>=4,slots=isAfternoon?afternoon:morning,t1=`tc${(i*2)%12+1}`,t2=`tc${(i*2+1)%12+1}`;
    p.activities.push(activity(`c_prac_${i}`,`Prácticas de taller · ${g.name}`,{subjectId:'sc_tec',groupIds:[g.id],teacherIds:[t1,t2],weeklySessions:3,durationSlots:2,requiredSpaceTags:[isPastry?'OBRADOR_PASTELERIA':'TALLER_COCINA'],allowedSlots:slots,priority:90,maxPerDay:2}));
    p.activities.push(activity(`c_lab_${i}`,`Control de procesos · ${g.name}`,{subjectId:'sc_seg',groupIds:[g.id],teacherIds:[`tc${13+(i%2)}`],weeklySessions:2,durationSlots:2,requiredSpaceTags:['LABORATORIO'],allowedSlots:slots,priority:80}));
    p.activities.push(activity(`c_dig_${i}`,`Dixitalización · ${g.name}`,{subjectId:'sc_dig',groupIds:[g.id],teacherIds:['tc15'],weeklySessions:2,requiredSpaceTags:['INFORMATICA'],allowedSlots:slots}));
    p.activities.push(activity(`c_emp_${i}`,`Empregabilidade · ${g.name}`,{subjectId:'sc_emp',groupIds:[g.id],teacherIds:['tc16'],weeklySessions:2,requiredSpaceTags:['AULA'],allowedSlots:slots}));
    p.activities.push(activity(`c_pro_${i}`,`Proxecto intermodular · ${g.name}`,{subjectId:'sc_pro',groupIds:[g.id],teacherIds:[t1],weeklySessions:2,durationSlots:2,requiredSpaceTags:['AULA'],allowedSlots:slots,priority:70}));
  }
  p.organization.breakZones=[{id:'czm',name:'Recreo mañana',slotIds:['MR'],minimumStaff:2,essentialProfileTags:[],excludedTeacherIds:[],dataState:'SIMULATED',provenance:provenance()},{id:'czt',name:'Descanso tarde',slotIds:['TR'],minimumStaff:1,essentialProfileTags:[],excludedTeacherIds:[],dataState:'SIMULATED',provenance:provenance()}];
  return finalize(p);
}

function createImpossible(){
  const p=baseProject('IMPOSSIBLE','Caso imposible · 30 sesiones en 25 huecos','Centro diagnóstico sintético');
  p.subjects=[subject('sx','Materia única','Diagnóstico')];
  p.teachers=[teacher('tx','Docente único','Docencia única',25)];
  p.groups=[group('gx','Grupo único','Diagnóstico','tx')];
  p.spaces=[space('spx','Aula única',['AULA'])];
  for(let i=1;i<=6;i++)p.activities.push(activity(`ax${i}`,`Bloque obligatorio ${i}`,{subjectId:'sx',groupIds:['gx'],teacherIds:['tx'],weeklySessions:5,requiredSpaceTags:['AULA'],maxPerDay:1,priority:100}));
  return finalize(p);
}

function createStress(){
  const p=baseProject('STRESS_1200','Escenario de estrés · 1.200 sesiones','Centro sintético de carga masiva');
  p.calendar.slots=[...Array.from({length:10},(_,i)=>({id:`X${i+1}`,label:`Tramo ${i+1}`,kind:'CLASS',start:`${String(8+Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`,end:`${String(8+Math.floor((i+1)/2)).padStart(2,'0')}:${(i+1)%2?'30':'00'}`}))];
  p.subjects=Array.from({length:12},(_,i)=>subject(`ss${i+1}`,`Materia de estrés ${i+1}`,'Sintético'));
  p.teachers=Array.from({length:80},(_,i)=>teacher(`ts${i+1}`,`Docente estrés ${String(i+1).padStart(2,'0')}`,'Perfil sintético',20));
  p.groups=Array.from({length:50},(_,i)=>group(`gs${i+1}`,`Grupo estrés ${String(i+1).padStart(2,'0')}`,'Sintético',`ts${(i%80)+1}`));
  p.spaces=Array.from({length:60},(_,i)=>space(`sps${i+1}`,`Espacio estrés ${String(i+1).padStart(2,'0')}`,[`TIPO_${(i%6)+1}`],i%10===0?2:1));
  let index=0;
  for(let g=0;g<50;g++)for(let j=0;j<8;j++){
    index+=1;const sid=`ss${(j%12)+1}`,teacherId=`ts${((g*3+j)%80)+1}`,tag=`TIPO_${(j%6)+1}`;
    p.activities.push(activity(`as${index}`,`Actividad masiva ${index}`,{subjectId:sid,groupIds:[`gs${g+1}`],teacherIds:[teacherId],weeklySessions:3,durationSlots:j%7===0?2:1,requiredSpaceTags:[tag],priority:50+(j%5)}));
  }
  return finalize(p);
}

const FACTORIES={P12_WEB_MINI:createP12WebMini,P12_ORG41_LIGHT:createP12OrgLight,P12_WEB_MEDIUM:createP12WebMedium};

export function catalogForMode({technicalMode=false}={}){
  const order=new Map([['P12_WEB_MEDIUM',0],['P12_ORG41_LIGHT',1],['P12_WEB_MINI',2]]);
  return EXAMPLE_CATALOG.filter(row=>row.expectedEngine==='WEB_SOLVER').sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));
}
export function exampleDefinition(id){return EXAMPLE_CATALOG.find(row=>row.id===id)||null;}

export async function loadExampleProject(id,{fetchJson=defaultFetchJson}={}){
  if(id==='CANONICAL_REFERENCE'){
    const raw=await fetchJson(CANONICAL_REFERENCE_SOURCE);
    const project=normalizeProject(raw);
    const gate=verifyCanonicalReference(project);
    if(!gate.ok)throw new Error(`El ejemplo centro canónico no supera ${CANONICAL_REGRESSION_GATE}: ${gate.errors.join(' · ')}`);
    return project;
  }
  if(id==='P11_SYNTHETIC_REALISTIC'){
    const raw=await fetchJson('data/P11-S1_SYNTHETIC_REALISTIC.json');
    const project=normalizeProject(raw);
    const metrics=exampleMetrics(project);
    const expected=exampleDefinition(id)?.expectedCounts||{};
    const mismatches=Object.entries(expected).filter(([key,value])=>metrics[key]!==value).map(([key,value])=>`${key}: ${metrics[key]}/${value}`);
    if(mismatches.length)throw new Error(`El ejemplo sintético P11 no coincide con sus métricas: ${mismatches.join(' · ')}`);
    return project;
  }
  const factory=FACTORIES[id];
  if(!factory)throw new Error(`Ejemplo desconocido: ${id}`);
  return factory();
}

async function defaultFetchJson(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`No se pudo cargar ${url} (${response.status}).`);return response.json();}

export function exampleMetrics(input){
  const p=normalizeProject(input);
  return {
    subjects:p.subjects.length,teachers:p.teachers.length,groups:p.groups.length,spaces:p.spaces.length,
    activities:p.activities.length,assignments:p.assignments.length,
    occurrences:p.activities.reduce((sum,row)=>sum+Number(row.weeklySessions||0),0),
    occupiedSlots:p.activities.reduce((sum,row)=>sum+Number(row.weeklySessions||0)*Math.max(1,Number(row.durationSlots||1)),0),
    multislotActivities:p.activities.filter(row=>Number(row.durationSlots||1)>1).length,
    itinerantTeachers:p.teachers.filter(row=>row.itinerary?.enabled).length,
    breakZones:p.organization?.breakZones?.length||0,
  };
}

export function verifyCanonicalReference(input){
  const p=normalizeProject(input),m=exampleMetrics(p),errors=[];
  if(p.meta.projectId!==CANONICAL_REFERENCE_BASELINE.projectId)errors.push(`projectId ${p.meta.projectId}`);
  for(const [key,expected] of Object.entries(CANONICAL_REFERENCE_BASELINE.counts))if(m[key]!==expected)errors.push(`${key}: ${m[key]}/${expected}`);
  const ld=p.activities.filter(row=>row.kind==='LD').length,dc=p.activities.filter(row=>row.kind==='DC').length,coverage=p.teachers.filter(row=>row.coverageEligible).length;
  if(ld<CANONICAL_REFERENCE_BASELINE.semanticMinimums.ldActivities)errors.push(`LD: ${ld}`);
  if(dc<CANONICAL_REFERENCE_BASELINE.semanticMinimums.dcActivities)errors.push(`DC: ${dc}`);
  if(m.breakZones<CANONICAL_REFERENCE_BASELINE.semanticMinimums.breakZones)errors.push(`zonas de recreo: ${m.breakZones}`);
  if(coverage<CANONICAL_REFERENCE_BASELINE.semanticMinimums.coverageEligibleTeachers)errors.push(`docentes para cobertura: ${coverage}`);
  const legacyFingerprint=String(p.meta.legacyStructuralFingerprint3||'');
  if(p.meta.structuralFingerprint!==CANONICAL_REFERENCE_BASELINE.structuralFingerprint&&legacyFingerprint!==CANONICAL_REFERENCE_BASELINE.structuralFingerprint)errors.push(`huella: ${p.meta.structuralFingerprint} · legado: ${legacyFingerprint||'ausente'}`);
  return {gate:CANONICAL_REGRESSION_GATE,ok:errors.length===0,errors,metrics:m,structuralFingerprint:p.meta.structuralFingerprint,legacyStructuralFingerprint3:legacyFingerprint};
}

export async function auditExampleLibrary({fetchJson=defaultFetchJson,includeStress=true}={}){
  const rows=[];
  for(const item of EXAMPLE_CATALOG.filter(row=>includeStress||row.id!=='STRESS_1200')){
    try{
      const project=await loadExampleProject(item.id,{fetchJson});
      const validation=validateProject(project),metrics=exampleMetrics(project);
      rows.push({id:item.id,ok:item.id==='IMPOSSIBLE'?validation.canGenerate:validation.errors.length===0,canGenerate:validation.canGenerate,errors:validation.errors.length,warnings:validation.warnings.length,metrics});
    }catch(error){rows.push({id:item.id,ok:false,error:error.message});}
  }
  return {contractVersion:EXAMPLE_LIBRARY_CONTRACT_VERSION,gate:CANONICAL_REGRESSION_GATE,ok:rows.every(row=>row.ok),rows};
}

export function cloneExampleProject(project){return deepClone(normalizeProject(project));}
