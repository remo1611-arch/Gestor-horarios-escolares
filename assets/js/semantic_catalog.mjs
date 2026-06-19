export const SEMANTIC_FOUNDATION_CONTRACT_VERSION = 'product-semantic-foundation-1.0';
export const SEMANTIC_CATALOG_VERSION = 'educational-domain-catalog-1.0';
export const SEMANTIC_EXPLANATION_VERSION = 'semantic-explanation-1.0';
export const SEMANTIC_ACTION_VERSION = 'semantic-guided-action-1.0';
export const SEMANTIC_LANGUAGE_POLICY_VERSION = 'ordinary-language-policy-1.0';

export const SEMANTIC_IMPORTANCE = Object.freeze({
  REQUIRED: Object.freeze({id:'REQUIRED',es:'Imprescindible',gl:'Imprescindible',kind:'HARD',weight:null}),
  VERY_IMPORTANT: Object.freeze({id:'VERY_IMPORTANT',es:'Muy importante',gl:'Moi importante',kind:'SOFT',weight:80}),
  PREFERABLE: Object.freeze({id:'PREFERABLE',es:'Preferible',gl:'Preferible',kind:'SOFT',weight:40}),
  NEUTRAL: Object.freeze({id:'NEUTRAL',es:'Sin preferencia',gl:'Sen preferencia',kind:'NONE',weight:0}),
});

export const SEMANTIC_ENTITIES = Object.freeze({
  project:{es:'proyecto',gl:'proxecto'},center:{es:'centro',gl:'centro'},calendar:{es:'calendario',gl:'calendario'},
  framework:{es:'marco horario',gl:'marco horario'},teacher:{es:'docente',gl:'docente'},group:{es:'grupo',gl:'grupo'},
  subgroup:{es:'subgrupo',gl:'subgrupo'},subject:{es:'materia o módulo',gl:'materia ou módulo'},activity:{es:'actividad',gl:'actividade'},
  session:{es:'sesión',gl:'sesión'},space:{es:'espacio',gl:'espazo'},resource:{es:'recurso',gl:'recurso'},
  organization:{es:'organización',gl:'organización'},service:{es:'servicio',gl:'servizo'},absence:{es:'ausencia',gl:'ausencia'},
  coverage:{es:'cobertura',gl:'cobertura'},communication:{es:'comunicación',gl:'comunicación'},incident:{es:'incidencia',gl:'incidencia'},
  recovery:{es:'recuperación',gl:'recuperación'},substitution:{es:'sustitución',gl:'substitución'},report:{es:'informe',gl:'informe'},
  revision:{es:'revisión',gl:'revisión'},schedule:{es:'horario',gl:'horario'},
});

export const SEMANTIC_TERMS = Object.freeze({
  conditionRequired:{es:'Condición imprescindible',gl:'Condición imprescindible'},
  preference:{es:'Preferencia',gl:'Preferencia'},
  importance:{es:'Importancia',gl:'Importancia'},
  unplacedSession:{es:'Sesión sin colocar',gl:'Sesión sen colocar'},
  unavailable:{es:'No disponible',gl:'Non dispoñible'},
  availableNotPreferred:{es:'Disponible, pero no preferente',gl:'Dispoñible, pero non preferente'},
  fixedSession:{es:'Sesión prefijada',gl:'Sesión prefixada'},
  seriousConflict:{es:'Conflicto grave',gl:'Conflito grave'},
  warning:{es:'Aviso',gl:'Aviso'},
  information:{es:'Información',gl:'Información'},
  advancedGeneration:{es:'Optimización avanzada local',gl:'Optimización avanzada local'},
  quickGeneration:{es:'Generación rápida',gl:'Xeración rápida'},
  impossibleSchedule:{es:'No existe una solución que cumpla todas las condiciones imprescindibles',gl:'Non existe unha solución que cumpra todas as condicións imprescindibles'},
});

export const PROHIBITED_ORDINARY_TERMS = Object.freeze([
  'cp-sat','ortools','or-tools','solver','boolean','fixture','schema','gate','constraint','penalty','hash','sha-256',
  'domain','unsat','heuristic','engine_divergence','stack trace','json interno','identificador interno',
]);

const actions = {
  project:[{id:'OPEN_PROJECT',label:'Revisar los datos del proyecto',route:{page:'data',dataTab:'project'},risk:'LOW'}],
  calendar:[{id:'OPEN_CALENDAR',label:'Revisar el calendario',route:{page:'data',dataTab:'calendar'},risk:'LOW'}],
  teachers:[{id:'OPEN_TEACHERS',label:'Revisar el profesorado',route:{page:'data',dataTab:'teachers'},risk:'LOW'}],
  groups:[{id:'OPEN_GROUPS',label:'Revisar los grupos',route:{page:'data',dataTab:'groups'},risk:'LOW'}],
  subjects:[{id:'OPEN_SUBJECTS',label:'Revisar las materias o módulos',route:{page:'data',dataTab:'subjects'},risk:'LOW'}],
  spaces:[{id:'OPEN_SPACES',label:'Revisar los espacios',route:{page:'data',dataTab:'spaces'},risk:'LOW'}],
  activities:[{id:'OPEN_ACTIVITIES',label:'Revisar las actividades',route:{page:'data',dataTab:'activities'},risk:'LOW'}],
  availability:[{id:'OPEN_AVAILABILITY',label:'Revisar la disponibilidad',route:{page:'data',dataTab:'availability'},risk:'LOW'}],
  organization:[{id:'OPEN_ORGANIZATION',label:'Revisar la organización',route:{page:'organization'},risk:'LOW'}],
  schedule:[{id:'OPEN_SCHEDULE',label:'Revisar el horario',route:{page:'schedule',scheduleTab:'review'},risk:'LOW'}],
  daily:[{id:'OPEN_DAILY',label:'Abrir la gestión diaria',route:{page:'daily',dailyTab:'today'},risk:'LOW'}],
  coverages:[{id:'OPEN_COVERAGES',label:'Revisar las coberturas',route:{page:'daily',dailyTab:'coverages'},risk:'LOW'}],
  reports:[{id:'OPEN_DAILY_REPORTS',label:'Abrir los informes de gestión diaria',route:{page:'daily',dailyTab:'reports'},risk:'LOW'}],
};

function rule(id, entity, nameEs, nameGl, descriptionEs, source, importance='REQUIRED', extra={}){
  return Object.freeze({id,entity,visibleName:{es:nameEs,gl:nameGl},description:{es:descriptionEs,gl:extra.descriptionGl||descriptionEs},
    source,importance,engineCapabilities:{heuristic:'SUPPORTED',cpSat:'SUPPORTED',diagnosis:'COMPLETE',...extra.engineCapabilities},
    actions:Object.freeze(extra.actions||actions[source.section]||[]),example:extra.example||'',ordinaryVisible:extra.ordinaryVisible!==false,
    uiControl:extra.uiControl||'CONTEXTUAL',coverage:extra.coverage||'CANONICAL'});
}

export const SEMANTIC_RULES = Object.freeze({
  'project.identity':rule('project.identity','project','Identificación del proyecto','Identificación do proxecto','El proyecto debe tener nombre, centro y curso académico coherentes.',{section:'project',path:'Datos → Proyecto'}),
  'project.privacy':rule('project.privacy','project','Tratamiento local de los datos','Tratamento local dos datos','La clasificación de privacidad debe corresponder al uso real o sintético del proyecto.',{section:'project',path:'Datos → Proyecto'}),
  'calendar.framework':rule('calendar.framework','calendar','Marco horario válido','Marco horario válido','Los días, tramos y recreos deben formar una jornada coherente.',{section:'calendar',path:'Datos → Calendario'}),
  'entity.identity':rule('entity.identity','project','Identificación de los elementos','Identificación dos elementos','Cada elemento necesita un nombre y una identidad no duplicada.',{section:'project',path:'Datos'}),
  'teacher.identity':rule('teacher.identity','teacher','Datos del profesorado','Datos do profesorado','Cada docente debe estar identificado y sus referencias deben existir.',{section:'teachers',path:'Datos → Docentes'}),
  'teacher.availability':rule('teacher.availability','teacher','Disponibilidad del profesorado','Dispoñibilidade do profesorado','Una sesión solo puede situarse cuando el docente está disponible o presente.',{section:'availability',path:'Datos → Disponibilidad'},'REQUIRED',{example:'No colocar una clase durante una reducción o una itinerancia.'}),
  'teacher.itinerary':rule('teacher.itinerary','teacher','Itinerancia y presencia','Itinerancia e presenza','Los días de presencia y el tiempo de desplazamiento deben ser compatibles con el horario.',{section:'organization',path:'Organización → Itinerancias'}),
  'group.identity':rule('group.identity','group','Datos del grupo','Datos do grupo','Cada grupo debe existir, tener nombre y, cuando proceda, tutoría válida.',{section:'groups',path:'Datos → Grupos'}),
  'subject.identity':rule('subject.identity','subject','Materia o módulo válido','Materia ou módulo válido','La materia o módulo asociado debe existir en el proyecto.',{section:'subjects',path:'Datos → Materias o módulos'}),
  'activity.identity':rule('activity.identity','activity','Datos de la actividad','Datos da actividade','Cada actividad debe tener nombre, grupo, profesorado y carga semanal válidos.',{section:'activities',path:'Datos → Actividades'}),
  'activity.weekly_load':rule('activity.weekly_load','activity','Carga semanal de la actividad','Carga semanal da actividade','La carga semanal debe expresarse mediante un número entero positivo de sesiones.',{section:'activities',path:'Datos → Actividades'}),
  'activity.multislot':rule('activity.multislot','activity','Bloque de varios periodos','Bloque de varios períodos','Una actividad que ocupa varios periodos consecutivos requiere una generación capaz de mantener el bloque completo.',{section:'activities',path:'Datos → Actividades'},'REQUIRED',{engineCapabilities:{heuristic:'UNSUPPORTED',cpSat:'SUPPORTED',diagnosis:'COMPLETE'},example:'Una práctica de taller de tres periodos seguidos.'}),
  'activity.fixed_occurrence':rule('activity.fixed_occurrence','activity','Sesión prefijada','Sesión prefixada','Una colocación prefijada debe utilizar un día y un periodo existentes.',{section:'activities',path:'Datos → Actividades'}),
  'activity.space_compatibility':rule('activity.space_compatibility','space','Espacio compatible','Espazo compatible','La actividad necesita al menos un espacio que cumpla sus requisitos.',{section:'spaces',path:'Datos → Espacios'},'REQUIRED',{example:'Preferentemente Obrador de Pastelería, con Panadería como alternativa.'}),
  'schedule.teacher_occupancy':rule('schedule.teacher_occupancy','teacher','Docente ocupado','Docente ocupado','Un docente no puede atender dos actividades simultáneas.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'schedule.group_occupancy':rule('schedule.group_occupancy','group','Grupo ocupado','Grupo ocupado','Un grupo no puede participar en dos actividades simultáneas.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'schedule.space_occupancy':rule('schedule.space_occupancy','space','Espacio ocupado','Espazo ocupado','Un espacio no puede superar su capacidad simultánea.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'schedule.lock':rule('schedule.lock','session','Decisión bloqueada','Decisión bloqueada','La sesión está protegida y debe desbloquearse con motivo y responsable antes de moverla.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'schedule.hard_rule':rule('schedule.hard_rule','session','Condición imprescindible','Condición imprescindible','El movimiento incumple una regla que invalida el horario.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'schedule.preference':rule('schedule.preference','session','Preferencia pedagógica','Preferencia pedagóxica','El destino es válido, pero puede empeorar una condición deseable.',{section:'schedule',path:'Horario → Revisar y editar'},'PREFERABLE'),
  'organization.profile':rule('organization.profile','organization','Perfil organizativo','Perfil organizativo','El perfil organizativo debe estar identificado y usar el contrato vigente.',{section:'organization',path:'Organización'}),
  'organization.workload':rule('organization.workload','teacher','Carga y reducciones','Carga e reducións','Las cuotas, reducciones y límites de carga deben ser coherentes y justificarse cuando se apartan de la referencia.',{section:'organization',path:'Organización → Profesorado'}),
  'organization.service':rule('organization.service','service','Servicio organizativo','Servizo organizativo','Guardias, apoyos, reuniones y recreos deben referirse a personas, grupos y periodos válidos.',{section:'organization',path:'Organización → Servicios'}),
  'organization.presence':rule('organization.presence','organization','Presencia mínima','Presenza mínima','La presencia mínima declarada debe poder cumplirse en cada periodo afectado.',{section:'organization',path:'Organización → Presencia mínima'}),
  'data.confirmation':rule('data.confirmation','project','Confirmación de los datos','Confirmación dos datos','Los datos pendientes, provisionales o simulados deben revisarse antes del cierre oficial.',{section:'project',path:'Datos → Revisión'},'VERY_IMPORTANT'),
  'generation.readiness':rule('generation.readiness','schedule','Preparación para generar','Preparación para xerar','El proyecto debe superar las comprobaciones previas antes de crear una propuesta.',{section:'schedule',path:'Horario → Generar'}),
  'generation.capacity':rule('generation.capacity','schedule','Capacidad insuficiente','Capacidade insuficiente','No existen suficientes periodos compatibles para colocar todas las sesiones imprescindibles.',{section:'schedule',path:'Horario → Generar'}),
  'generation.unavailable':rule('generation.unavailable','schedule','Optimización avanzada no disponible','Optimización avanzada non dispoñible','Este proyecto necesita la optimización avanzada local y no está disponible en el dispositivo actual.',{section:'schedule',path:'Horario → Generar'}),
  'generation.inconsistent_results':rule('generation.inconsistent_results','schedule','Resultados incompatibles','Resultados incompatibles','Los métodos de generación han producido conclusiones incompatibles y el resultado debe revisarse antes de utilizarlo.',{section:'schedule',path:'Horario → Generar'}),
  'closure.validation':rule('closure.validation','schedule','Horario sin conflictos graves','Horario sen conflitos graves','El cierre oficial exige que no existan conflictos que invaliden el horario.',{section:'schedule',path:'Horario → Validación y cierre'}),
  'closure.pending_sessions':rule('closure.pending_sessions','session','Todas las sesiones imprescindibles colocadas','Todas as sesións imprescindibles colocadas','No puede cerrarse el horario mientras queden sesiones obligatorias sin colocar.',{section:'schedule',path:'Horario → Validación y cierre'}),
  'closure.pending_proposal':rule('closure.pending_proposal','schedule','Sin propuestas pendientes','Sen propostas pendentes','Las propuestas deben aceptarse o descartarse antes del cierre oficial.',{section:'schedule',path:'Horario → Validación y cierre'}),
  'daily.absence':rule('daily.absence','absence','Ausencia válida','Ausencia válida','La ausencia debe identificar docente, fecha y sesiones afectadas.',{section:'daily',path:'Gestión diaria → Ausencias'}),
  'daily.affected_services':rule('daily.affected_services','session','Servicios afectados','Servizos afectados','La ausencia debe mostrar todas las sesiones y servicios que requieren una decisión operativa.',{section:'daily',path:'Gestión diaria → Ausencias'}),
  'daily.coverage':rule('daily.coverage','coverage','Cobertura compatible','Cobertura compatible','La cobertura debe respetar disponibilidad, elegibilidad y carga de la persona sustituta.',{section:'coverages',path:'Gestión diaria → Coberturas'}),
  'daily.coverage_eligibility':rule('daily.coverage_eligibility','teacher','Elegibilidad para cubrir','Elixibilidade para cubrir','La persona debe estar habilitada para coberturas y no puede ser quien está ausente.',{section:'organization',path:'Organización → Profesorado'}),
  'daily.coverage_availability':rule('daily.coverage_availability','teacher','Disponibilidad para la cobertura','Dispoñibilidade para a cobertura','La persona candidata debe estar disponible y presente en la franja afectada.',{section:'availability',path:'Datos → Disponibilidad'}),
  'daily.coverage_occupancy':rule('daily.coverage_occupancy','teacher','Actividad simultánea','Actividade simultánea','La persona candidata no puede abandonar una actividad no liberable ni atender dos servicios a la vez.',{section:'schedule',path:'Horario → Revisar y editar'}),
  'daily.coverage_presence':rule('daily.coverage_presence','organization','Presencia esencial protegida','Presenza esencial protexida','La cobertura no puede dejar al centro por debajo de una presencia mínima imprescindible.',{section:'organization',path:'Organización → Presencia mínima'}),
  'daily.coverage_balance':rule('daily.coverage_balance','coverage','Equilibrio de coberturas','Equilibrio de coberturas','La recomendación considera servicios anteriores, carga diaria y decisiones todavía abiertas sin convertirlos en una obligación automática.',{section:'coverages',path:'Gestión diaria → Coberturas'},'PREFERABLE'),
  'daily.coverage_decision':rule('daily.coverage_decision','coverage','Decisión de cobertura','Decisión de cobertura','La asignación debe conservar la persona elegida, la justificación y la comparación con las opciones recomendadas.',{section:'coverages',path:'Gestión diaria → Coberturas'}),
  'daily.coverage_communication':rule('daily.coverage_communication','communication','Comunicación de la cobertura','Comunicación da cobertura','La cobertura asignada debe registrar cuándo y por qué canal fue comunicada.',{section:'coverages',path:'Gestión diaria → Coberturas'}),
  'daily.coverage_completion':rule('daily.coverage_completion','service','Servicio realizado','Servizo realizado','Una cobertura solo se marca como realizada cuando el servicio ha tenido lugar y queda incorporado al histórico.',{section:'daily',path:'Gestión diaria → Seguimiento'}),
  'daily.coverage_uncovered':rule('daily.coverage_uncovered','coverage','Servicio sin cubrir','Servizo sen cubrir','Dejar un servicio sin cubrir exige un motivo explícito y conserva la necesidad en el historial.',{section:'coverages',path:'Gestión diaria → Coberturas'},'VERY_IMPORTANT'),
  'daily.reconciliation':rule('daily.reconciliation','coverage','Reconciliación con el horario','Reconciliación co horario','Los cambios del horario deben crear nuevas necesidades, marcar como obsoletas las anteriores y conservar todas las decisiones previas.',{section:'daily',path:'Gestión diaria → Seguimiento'}),
  'daily.impact':rule('daily.impact','incident','Consecuencia sobre la actividad','Consecuencia sobre a actividade','Una actividad afectada puede mantenerse, desplazarse, suspenderse, cancelarse o quedar pendiente de recuperación con trazabilidad.',{section:'daily',path:'Gestión diaria → Seguimiento'}),
  'daily.recovery':rule('daily.recovery','recovery','Recuperación de actividad','Recuperación de actividade','Las actividades pendientes de recuperación deben conservar estado, fecha prevista y motivo de cualquier cancelación.',{section:'daily',path:'Gestión diaria → Seguimiento'}),
  'daily.substitution':rule('daily.substitution','substitution','Sustitución temporal','Substitución temporal','Una sustitución temporal debe definir persona ausente, sustituta, periodo y ámbito de actividades.',{section:'daily',path:'Gestión diaria → Seguimiento'}),
  'daily.reporting':rule('daily.reporting','report','Informe operativo','Informe operativo','Los informes deben distinguir ausencias, coberturas, servicios realizados, incidencias y recuperaciones sin mostrar motivos privados.',{section:'reports',path:'Gestión diaria → Informes'}),
});

const CODE_GROUPS = Object.freeze({
  'project.identity':['PROJECT_NAME_REQUIRED','CENTER_REQUIRED','CENTER_PENDING','ACADEMIC_YEAR_REQUIRED','ACADEMIC_YEAR_INVALID','RESPONSIBLE_PENDING'],
  'project.privacy':['PRIVACY_CLASS_INVALID'],
  'calendar.framework':['REPORTING_PERIOD_DATES_INVALID','REPORTING_PERIOD_LABEL_REQUIRED','REPORTING_PERIOD_OVERLAP','ASSIGNMENT_TIME_BROKEN','CALENDAR_INVALID','DAY_ID_DUPLICATED','DAY_NAME_REQUIRED','SLOT_ID_DUPLICATED','SLOT_LABEL_REQUIRED','SLOT_TIME_INVALID','SLOT_KIND_INVALID','EVALUATION_PERIOD_INCOMPLETE','EVALUATION_PERIODS_PENDING'],
  'entity.identity':['ENTITY_NOT_FOUND','OTHER','ID_REQUIRED','ID_DUPLICATED','NAME_DUPLICATED','EXTERNAL_ID_DUPLICATED'],
  'teacher.identity':['TEACHER_NAME_REQUIRED','TEACHER_TIME_REFERENCE_INVALID','ACTIVITY_TEACHER_BROKEN','ACTIVITY_TEACHER_REQUIRED'],
  'teacher.availability':['TEACHER_UNAVAILABLE','AVAILABILITY','FORBID_DAY','FORBID_SLOT'],
  'teacher.itinerary':['ITINERARY_PRESENCE_PENDING','ITINERARY_DAY_INVALID','ITINERARY_TRAVEL_INVALID','ITINERARY_PROVISIONAL','ITINERARY_DAY_CONFLICT'],
  'group.identity':['GROUP_NAME_REQUIRED','GROUP_TUTOR_BROKEN','TUTOR_BROKEN','ACTIVITY_GROUP_BROKEN','ACTIVITY_GROUP_REQUIRED'],
  'subject.identity':['ACTIVITY_SUBJECT_BROKEN'],
  'activity.identity':['ASSIGNMENT_ACTIVITY_BROKEN','ACTIVITY_NAME_REQUIRED','ACTIVITY_GROUP_REQUIRED','ACTIVITY_TEACHER_REQUIRED','ACTIVITY_SUBJECT_BROKEN','BUILD_FAILED'],
  'activity.weekly_load':['ACTIVITY_WEEKLY_INVALID','ACTIVITY_SESSIONS_REQUIRED','ACTIVITY_DURATION_INVALID'],
  'activity.multislot':['HEURISTIC_MULTISLOT_REQUIRES_CP_SAT','MULTISLOT_CP_SAT','HEURISTIC_MULTISLOT_UNSUPPORTED','MANUAL_MULTISLOT_UNSUPPORTED','MULTISLOT'],
  'activity.fixed_occurrence':['FIXED_OCCURRENCE_INVALID'],
  'activity.space_compatibility':['ASSIGNMENT_SPACE_BROKEN','NO_COMPATIBLE_SPACE','SPACE'],
  'schedule.teacher_occupancy':['TEACHER_CONFLICT'],
  'schedule.group_occupancy':['GROUP_CONFLICT'],
  'schedule.space_occupancy':['SPACE_CONFLICT','OCCUPANCY'],
  'schedule.lock':['LOCK','LOCK_OWNER_REQUIRED','LOCK_REASON_REQUIRED'],
  'schedule.hard_rule':['HARD_RULE','DAILY_LIMIT'],
  'schedule.preference':['AVOID_EDGE_SLOTS','AVOID_FIRST_SLOT','AVOID_LAST_SLOT','PREFER_DAY','PREFER_SLOT'],
  'organization.profile':['ORG_SYNC_PENDING','ORG_PROFILE_NAME_REQUIRED','ORG_PROFILE_VERSION_REQUIRED','ORG_CONTRACT_VERSION_INVALID','ORGANIZATION_DISABLED','ORGANIZATION_MINIMAL'],
  'organization.workload':['ORG_ORDINARY_QUOTA_INVALID','WORKLOAD_TARGET_MISMATCH','TEACHER_STRUCTURAL_LOAD_EXCEEDS_TARGET','LD_DC_QUOTA_INVALID','LD_DC_JUSTIFICATION_REQUIRED','WORKLOAD_TOLERANCE_INVALID','WORKLOAD_KINDS_REQUIRED','WORKLOAD_KIND_INVALID','MAX_DAILY_COVERAGES_INVALID','MAX_SIMULTANEOUS_LD_INVALID','MAX_SIMULTANEOUS_LD_EXCEEDED'],
  'organization.service':['BREAK_SERVICE_PROFILE_REQUIRED','BREAK_SERVICE_SLOT_INVALID','BREAK_SERVICE_TEACHER_EXCLUDED','BREAK_ZONE_EXCLUDED_TEACHER_BROKEN','BREAK_ZONE_SLOT_INVALID','BREAK_ZONE_SLOT_REQUIRED','COVERAGE_POLICY_KIND_INVALID','ORG_RULE_ACTIVITY_BROKEN','ORG_RULE_DAY_BROKEN','ORG_RULE_DAY_REQUIRED','ORG_RULE_GROUP_BROKEN','ORG_RULE_KIND_BROKEN','ORG_RULE_LABEL_REQUIRED','ORG_RULE_SLOT_BROKEN','ORG_RULE_SLOT_REQUIRED','ORG_RULE_SPACE_TAG_REQUIRED','ORG_RULE_TEACHER_BROKEN','ORG_RULE_TYPE_INVALID','ORG_RULE_WEIGHT_INVALID','ORG_SERVICE_DAY_BROKEN','ORG_SERVICE_GROUP_DUPLICATED','ORG_SERVICE_ID_DUPLICATED','ORG_SERVICE_TEACHER_DUPLICATED','ORG_SERVICE_TEACHER_REQUIRED','ORG_SERVICE_WEEKLY_INVALID','SUPPORT_SERVICE_GROUP_REQUIRED','TEACHER_ORG_DAY_BROKEN','TEACHER_ORG_DEFINITION_ID_DUPLICATED','TEACHER_ORG_LABEL_REQUIRED','TEACHER_ORG_SESSIONS_INVALID','TEACHER_ORG_SLOT_BROKEN','TEACHER_ORG_TYPE_INVALID','ORG_SERVICE_NAME_REQUIRED','ORG_SERVICE_KIND_INVALID','ORG_SERVICE_TEACHER_BROKEN','ORG_SERVICE_GROUP_BROKEN','ORG_SERVICE_SLOT_BROKEN','BREAK_SERVICE_ZONE_REQUIRED','BREAK_SERVICE_ZONE_BROKEN','BREAK_ZONE_NAME_REQUIRED','BREAK_ZONE_MINIMUM_INVALID'],
  'organization.presence':['MINIMUM_PRESENCE_INVALID','MINIMUM_PRESENCE_NOT_MET','MINIMUM_PRESENCE_SCOPE_REQUIRED','MINIMUM_PRESENCE_DAY_INVALID','MINIMUM_PRESENCE_SLOT_INVALID'],
  'data.confirmation':['PENDING_DATA','PROVISIONAL_DATA','SIMULATED_IN_REAL_PROJECT','DATA_SOURCE_MISSING','DATA_ORIGIN_INVALID','DATA_EXPIRED','DATA_NOT_YET_VALID','DATA_DATE_INVALID','DATA_VALIDITY_RANGE_INVALID'],
  'generation.readiness':['ORCHESTRATION_ERROR','USER_CANCELLED','CP_SAT_REQUIRED','PROJECT_BLOCKED','HEURISTIC_INCOMPATIBLE','NO_USABLE_PROPOSAL','PARTIAL_PROPOSAL','MANY_HARD_RULES','MANY_FIXED_OCCURRENCES','MANY_CONSTRAINED_ACTIVITIES','LARGE_SCOPE','GLOBAL_OPTIMIZATION_REQUESTED','QUICK_GENERATION','ADVANCED_OPTIMIZATION','PREPARING'],
  'generation.capacity':['INFEASIBLE','CP_SAT_INFEASIBLE'],
  'generation.unavailable':['CP_SAT_UNAVAILABLE','UNAVAILABLE'],
  'generation.inconsistent_results':['ENGINE_DIVERGENCE'],
  'closure.validation':['ASSIGNMENTS_PRESENT','VALIDATION_ERRORS','FINALIZATION_RULES'],
  'closure.pending_sessions':['NO_PENDING'],
  'closure.pending_proposal':['NO_PENDING_PROPOSAL'],
  'daily.absence':['ABSENCE_STATUS_INVALID','DAILY_CONTRACT_VERSION_INVALID','DAILY_INCIDENT_ASSIGNMENT_BROKEN','DAILY_INCIDENT_COVERAGE_BROKEN','DAILY_INCIDENT_DATE_INVALID','DAILY_INCIDENT_STATUS_INVALID','DAILY_INCIDENT_TYPE_INVALID','ABSENCE_DATE_INVALID','ABSENCE_DAY_BROKEN','ABSENCE_SLOT_BROKEN','ABSENCE_TEACHER_BROKEN','ABSENCE_ASSIGNMENT_BROKEN'],
  'daily.coverage':['COVERAGE_ABSENCE_BROKEN','COVERAGE_RELEASED_ASSIGNMENT_BROKEN','COVERAGE_STATUS_INVALID','PERFORMED_SERVICE_COVERAGE_BROKEN','PERFORMED_SERVICE_DATE_INVALID','PERFORMED_SERVICE_STATUS_INVALID','PERFORMED_SERVICE_TEACHER_BROKEN','PERFORMED_SERVICE_TIME_BROKEN','RECOVERY_ACTIVITY_BROKEN','RECOVERY_COVERAGE_BROKEN','RECOVERY_DATE_INVALID','RECOVERY_INCIDENT_BROKEN','RECOVERY_STATUS_INVALID','TEMP_SUB_ABSENT_TEACHER_BROKEN','TEMP_SUB_ACTIVITY_BROKEN','TEMP_SUB_DATE_RANGE_INVALID','TEMP_SUB_SAME_TEACHER','TEMP_SUB_START_INVALID','TEMP_SUB_STATUS_INVALID','TEMP_SUB_TEACHER_BROKEN','COVERAGE_TEACHER_BROKEN','COVERAGE_ACTIVITY_BROKEN','COVERAGE_ASSIGNMENT_BROKEN','COVERAGE_TIME_BROKEN','BREAK_COVERAGE_PENDING'],
});

const codeMap={};
for(const [ruleId,codes] of Object.entries(CODE_GROUPS))for(const code of codes)codeMap[code]=ruleId;
export const SEMANTIC_CODE_MAP = Object.freeze(codeMap);

export const LEGACY_REASON_PATTERNS = Object.freeze([
  {pattern:/no se encontr|no existe/i,code:'ENTITY_NOT_FOUND',ruleId:'entity.identity'},
  {pattern:/bloquead|desbloquear/i,code:'LOCK',ruleId:'schedule.lock'},
  {pattern:/docente.*ocupad|profesor.*ocupad|docente.*dos actividades|profesor.*dos actividades/i,code:'TEACHER_CONFLICT',ruleId:'schedule.teacher_occupancy'},
  {pattern:/grupo.*ocupad|grupo.*dos actividades/i,code:'GROUP_CONFLICT',ruleId:'schedule.group_occupancy'},
  {pattern:/espacio.*ocupad|espacio.*capacidad|supera su capacidad/i,code:'SPACE_CONFLICT',ruleId:'schedule.space_occupancy'},
  {pattern:/no disponible|disponibilidad|presencia|itineran/i,code:'TEACHER_UNAVAILABLE',ruleId:'teacher.availability'},
  {pattern:/multitramos|varios tramos|varios periodos|cp-sat|or-tools/i,code:'MANUAL_MULTISLOT_UNSUPPORTED',ruleId:'activity.multislot'},
  {pattern:/espacio compatible|etiqueta.*espacio|requiere.*espacio/i,code:'NO_COMPATIBLE_SPACE',ruleId:'activity.space_compatibility'},
  {pattern:/máximo diario|límite.*diario|simultánea/i,code:'DAILY_LIMIT',ruleId:'schedule.hard_rule'},
  {pattern:/regla obligatoria|debe situarse|excluido|no permitido|prohibid/i,code:'HARD_RULE',ruleId:'schedule.hard_rule'},
]);


export const DAILY_REASON_PATTERNS = Object.freeze([
  {pattern:/persona ausente/i,code:'DAILY_ABSENT_PERSON',ruleId:'daily.coverage_eligibility'},
  {pattern:/habilitad.*cobertura/i,code:'DAILY_NOT_ELIGIBLE',ruleId:'daily.coverage_eligibility'},
  {pattern:/no está disponible|no consta como presente|libre en el horario/i,code:'DAILY_AVAILABILITY',ruleId:'daily.coverage_availability'},
  {pattern:/itineran|no está presente.*ese día/i,code:'DAILY_ITINERARY',ruleId:'teacher.itinerary'},
  {pattern:/otra ausencia activa/i,code:'DAILY_OTHER_ABSENCE',ruleId:'daily.coverage_availability'},
  {pattern:/sustitución temporal/i,code:'DAILY_TEMPORARY_SUBSTITUTION',ruleId:'daily.substitution'},
  {pattern:/ya tiene |actividad .* liberable|usar dc/i,code:'DAILY_OCCUPANCY',ruleId:'daily.coverage_occupancy'},
  {pattern:/máximo de .*cobertura/i,code:'DAILY_COVERAGE_LIMIT',ruleId:'organization.workload'},
  {pattern:/por debajo del mínimo|perfil .* mínimo/i,code:'DAILY_ESSENTIAL_PRESENCE',ruleId:'daily.coverage_presence'},
  {pattern:/equilibrio histórico|actuación\(es\).*peso/i,code:'DAILY_BALANCE',ruleId:'daily.coverage_balance'},
  {pattern:/cobertura\(s\).*asignada/i,code:'DAILY_OPEN_COVERAGES',ruleId:'daily.coverage_balance'},
  {pattern:/carga prevista/i,code:'DAILY_DAILY_LOAD',ruleId:'daily.coverage_balance'},
  {pattern:/perfil adecuado/i,code:'DAILY_PROFILE_MATCH',ruleId:'daily.coverage_eligibility'},
]);

export function semanticRule(ruleId){return SEMANTIC_RULES[ruleId]||null;}
export function semanticRuleForCode(code){return semanticRule(SEMANTIC_CODE_MAP[String(code||'')])||null;}
export function semanticTerm(key,locale='es'){return SEMANTIC_TERMS[key]?.[locale]||SEMANTIC_TERMS[key]?.es||key;}
export function semanticEntityName(key,locale='es'){return SEMANTIC_ENTITIES[key]?.[locale]||SEMANTIC_ENTITIES[key]?.es||key;}
export function importanceDefinition(id){return SEMANTIC_IMPORTANCE[id]||SEMANTIC_IMPORTANCE.REQUIRED;}
export function allSemanticRules(){return Object.values(SEMANTIC_RULES);}
