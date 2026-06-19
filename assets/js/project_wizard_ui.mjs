import {
  PROJECT_WIZARD_STEPS,
  normalizeWizardState,
  validateProjectWizard,
  wizardCalendarPreview,
  wizardSummary,
  wizardDays,
} from './project_wizard.mjs';

export function renderProjectWizard(input) {
  const state = normalizeWizardState(input);
  const review = validateProjectWizard(state);
  const summary = wizardSummary(state);

  const steps = PROJECT_WIZARD_STEPS.map((row) => {
    const active = row.id === state.step;
    const done = row.id < state.step;
    return `
      <button type="button" class="wizard-step ${active ? 'active' : ''} ${done ? 'done' : ''}"
        data-wizard-action="go-step" data-step="${row.id}" ${active ? 'aria-current="step"' : ''}>
        <span>${done ? '✓' : row.id}</span>${h(row.label)}
      </button>`;
  }).join('');

  const body = state.step === 1 ? renderCenterStep(state)
    : state.step === 2 ? renderCalendarStep(state)
    : state.step === 3 ? renderDataStep(state)
    : state.step === 4 ? renderOrganizationStep(state)
    : renderReviewStep(state, review, summary);

  return `
    <div class="wizard-shell">
      <section class="card wizard-header">
        <div>
          <p class="eyebrow">Asistente de creación</p>
          <h2>Nuevo proyecto de horario</h2>
          <p class="muted">Completa información ordinaria del centro. Todo podrá ampliarse o corregirse después.</p>
        </div>
        <div class="wizard-autosave" role="status">Borrador local de esta pestaña</div>
      </section>
      <nav class="wizard-steps" aria-label="Pasos del asistente">${steps}</nav>
      ${body}
      <div class="card wizard-footer">
        <button type="button" class="btn ghost" data-wizard-action="cancel">Salir del asistente</button>
        <button type="button" class="btn secondary" data-wizard-action="restart">Reiniciar</button>
        <span class="spacer"></span>
        ${state.step > 1 ? '<button type="button" class="btn secondary" data-wizard-action="previous">Anterior</button>' : ''}
        ${state.step < 5
          ? '<button type="button" class="btn" data-wizard-action="next">Continuar</button>'
          : `<button type="button" class="btn" data-wizard-action="finish" ${review.canCreateDraft ? '' : 'disabled'}>${review.canGenerateAfterCreate ? 'Crear proyecto preparado' : 'Crear proyecto en borrador'}</button>`}
      </div>
    </div>`;
}

function renderCenterStep(state) {
  return `
    <section class="card wizard-panel">
      <h2>Paso 1 · Centro</h2>
      <p class="muted">Identifica el proyecto y selecciona la organización general de la jornada.</p>
      <div class="field-row">
        <label>Tipo de centro
          <select data-wizard-path="center.centerType">
            ${[['CEIP','CEIP'],['CPI','CPI'],['IES','IES'],['CIFP','CIFP'],['OTHER','Otro']].map(([value,label])=>option(value,label,state.center.centerType)).join('')}
          </select>
        </label>
        <label>Nombre del centro
          <input data-wizard-path="center.centerName" required value="${h(state.center.centerName)}" placeholder="Ej.: CEIP de referencia">
        </label>
        <label>Curso académico
          <input data-wizard-path="center.academicYear" required value="${h(state.center.academicYear)}" placeholder="2026/2027">
        </label>
      </div>
      <div class="field-row">
        <label>Nombre del proyecto
          <input data-wizard-path="center.projectName" required value="${h(state.center.projectName)}">
        </label>
        <label>Responsable
          <input data-wizard-path="center.responsible" value="${h(state.center.responsible)}" placeholder="Jefatura de estudios">
        </label>
        <label>Estado inicial
          <select data-wizard-path="center.dataState">
            ${option('PENDING','Pendiente de revisar',state.center.dataState)}
            ${option('PROVISIONAL','Provisional',state.center.dataState)}
            ${option('CONFIRMED','Confirmado por el centro',state.center.dataState)}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Turnos</legend>
        <div class="choice-grid">
          ${listChoice('center.turns','MORNING','Mañana',state.center.turns.includes('MORNING'))}
          ${listChoice('center.turns','AFTERNOON','Tarde',state.center.turns.includes('AFTERNOON'))}
          ${listChoice('center.turns','EVENING','Nocturno',state.center.turns.includes('EVENING'))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Días lectivos ordinarios</legend>
        <div class="choice-grid">
          ${wizardDays().map(day=>listChoice('center.dayIds',day.id,day.label,state.center.dayIds.includes(day.id))).join('')}
        </div>
      </fieldset>
      <fieldset>
        <legend>Tratamiento de los datos</legend>
        <div class="choice-grid vertical">
          ${radioChoice('center.privacyMode','REAL_LOCAL','Datos reales, solo en este dispositivo','No se envían a ningún servidor.',state.center.privacyMode)}
          ${radioChoice('center.privacyMode','ANONYMIZED','Datos anonimizados','Útil para preparación, formación o soporte.',state.center.privacyMode)}
          ${radioChoice('center.privacyMode','SYNTHETIC','Simulación','Datos ficticios para pruebas.',state.center.privacyMode)}
        </div>
      </fieldset>
    </section>`;
}

function renderCalendarStep(state) {
  const preview = wizardCalendarPreview(state);
  return `
    <section class="card wizard-panel">
      <h2>Paso 2 · Calendario</h2>
      <p class="muted">Define una jornada ordinaria. Los tramos se calculan automáticamente y después pueden editarse individualmente.</p>
      <div class="field-row">
        <label>Inicio de la jornada<input type="time" data-wizard-path="calendar.startTime" value="${h(state.calendar.startTime)}"></label>
        <label>Sesiones lectivas por día<input type="number" min="1" max="16" data-wizard-type="number" data-wizard-path="calendar.classCount" value="${state.calendar.classCount}"></label>
        <label>Minutos por sesión<input type="number" min="20" max="180" data-wizard-type="number" data-wizard-path="calendar.classMinutes" value="${state.calendar.classMinutes}"></label>
      </div>
      <div class="grid two" style="margin-top:14px">
        ${breakFieldset('Primer recreo','firstBreak',state)}
        ${breakFieldset('Segundo recreo opcional','secondBreak',state)}
      </div>
      ${preview.errors.length ? `<div class="notice error wizard-inline-notice">${preview.errors.map(message=>`<div>${h(message)}</div>`).join('')}</div>` : ''}
      <h3>Vista previa de la jornada</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Tramo</th><th>Tipo</th><th>Inicio</th><th>Fin</th></tr></thead>
        <tbody>${preview.slots.map(slot=>`<tr><td>${h(slot.label)}</td><td>${slot.kind==='CLASS'?'Lectivo':'Recreo'}</td><td>${slot.start}</td><td>${slot.end}</td></tr>`).join('')}</tbody>
      </table></div>
      <h3 style="margin-top:18px">Periodos de evaluación</h3>
      <p class="muted">Son opcionales ahora. Solo se guardarán los periodos con ambas fechas.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Denominación</th><th>Desde</th><th>Hasta</th></tr></thead>
        <tbody>${state.calendar.periods.map((row,index)=>`
          <tr>
            <td><input data-wizard-path="calendar.periods.${index}.label" value="${h(row.label)}"></td>
            <td><input type="date" data-wizard-path="calendar.periods.${index}.fromDate" value="${h(row.fromDate)}"></td>
            <td><input type="date" data-wizard-path="calendar.periods.${index}.toDate" value="${h(row.toDate)}"></td>
          </tr>`).join('')}</tbody>
      </table></div>
    </section>`;
}

function breakFieldset(title,prefix,state) {
  const after = prefix === 'firstBreak' ? state.calendar.firstBreakAfter : state.calendar.secondBreakAfter;
  const minutes = prefix === 'firstBreak' ? state.calendar.firstBreakMinutes : state.calendar.secondBreakMinutes;
  return `
    <fieldset><legend>${h(title)}</legend><div class="field-row">
      <label>Después de la sesión
        <input type="number" min="0" max="15" data-wizard-type="number" data-wizard-path="calendar.${prefix}After" value="${after}">
        <small class="help">0 significa sin recreo.</small>
      </label>
      <label>Duración en minutos
        <input type="number" min="0" max="120" data-wizard-type="number" data-wizard-path="calendar.${prefix}Minutes" value="${minutes}">
      </label>
    </div></fieldset>`;
}

function renderDataStep(state) {
  return `
    <section class="card wizard-panel">
      <h2>Paso 3 · Datos básicos</h2>
      <p class="muted">Añade filas mediante formularios ordinarios. No es necesario editar JSON, CSV ni identificadores internos.</p>
      ${renderSimpleRows('teachers','Docentes',state.data.teachers,[['name','Nombre'],['specialty','Especialidad o función'],['weeklyTarget','Carga objetivo','number']],'La carga objetivo puede dejarse en 0 y completarse después.')}
      ${renderSimpleRows('groups','Grupos',state.data.groups,[['name','Nombre'],['stage','Etapa']])}
      ${renderSimpleRows('subjects','Materias o módulos',state.data.subjects,[['name','Nombre'],['stage','Etapa']])}
      ${renderSimpleRows('spaces','Espacios',state.data.spaces,[['name','Nombre'],['tags','Tipo o etiquetas'],['capacity','Capacidad simultánea','number']])}
      ${renderActivities(state)}
    </section>`;
}

function renderSimpleRows(collection,title,rows,fields,help='') {
  const header = fields.map(([,label])=>`<th>${h(label)}</th>`).join('');
  const body = rows.map(row=>`<tr>
    ${fields.map(([field,,type])=>`<td><input ${type==='number'?'type="number" min="0" data-wizard-type="number"':''} data-wizard-collection="${collection}" data-wizard-row="${row.id}" data-wizard-field="${field}" value="${h(row[field]??'')}"></td>`).join('')}
    <td><button type="button" class="btn small ghost" data-wizard-action="remove-row" data-collection="${collection}" data-row="${row.id}">Eliminar</button></td>
  </tr>`).join('');
  return `
    <section class="wizard-subsection">
      <div class="toolbar"><div><h3>${h(title)}</h3>${help?`<p class="help">${h(help)}</p>`:''}</div><span class="spacer"></span><button type="button" class="btn small" data-wizard-action="add-row" data-collection="${collection}">Añadir</button></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr>${header}<th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="empty">Todavía no hay ${h(title.toLocaleLowerCase('es'))}.</div>`}
    </section>`;
}

function renderActivities(state) {
  const groupOptions = state.data.groups.map(row=>({value:row.id,label:row.name||'Grupo sin nombre'}));
  const subjectOptions = state.data.subjects.map(row=>({value:row.id,label:row.name||'Materia sin nombre'}));
  const teacherOptions = state.data.teachers.map(row=>({value:row.id,label:row.name||'Docente sin nombre'}));
  return `
    <section class="wizard-subsection">
      <div class="toolbar"><div><h3>Actividades lectivas</h3><p class="help">Relaciona grupo, materia, profesorado, sesiones semanales y tipo de espacio.</p></div><span class="spacer"></span><button type="button" class="btn small" data-wizard-action="add-row" data-collection="activities">Añadir</button></div>
      ${state.data.activities.length ? `<div class="wizard-activity-list">${state.data.activities.map(row=>`
        <article class="wizard-row-card">
          <div class="toolbar"><h4>${h(row.name||'Nueva actividad')}</h4><span class="spacer"></span><button type="button" class="btn small ghost" data-wizard-action="remove-row" data-collection="activities" data-row="${row.id}">Eliminar</button></div>
          <div class="field-row">
            <label>Nombre<input data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="name" value="${h(row.name)}"></label>
            <label>Grupo<select data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="groupId"><option value="">Selecciona</option>${options(groupOptions,row.groupId)}</select></label>
            <label>Materia o módulo<select data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="subjectId"><option value="">Sin vincular todavía</option>${options(subjectOptions,row.subjectId)}</select></label>
          </div>
          <div class="field-row">
            <label>Docentes<select multiple size="${Math.min(5,Math.max(2,state.data.teachers.length))}" data-wizard-multiple data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="teacherIds">${options(teacherOptions,row.teacherIds,true)}</select></label>
            <label>Sesiones semanales<input type="number" min="1" data-wizard-type="number" data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="weeklySessions" value="${row.weeklySessions}"></label>
            <label>Duración en tramos<input type="number" min="1" max="8" data-wizard-type="number" data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="durationSlots" value="${row.durationSlots}"><small class="help">Más de 1 requiere generación avanzada.</small></label>
            <label>Tipo de espacio<input data-wizard-collection="activities" data-wizard-row="${row.id}" data-wizard-field="requiredSpaceTags" value="${h(row.requiredSpaceTags)}" placeholder="AULA, TALLER"></label>
          </div>
        </article>`).join('')}</div>` : '<div class="empty">Añade al menos una actividad para poder generar un horario.</div>'}
    </section>`;
}

function renderOrganizationStep(state) {
  const preview = wizardCalendarPreview(state);
  return `
    <section class="card wizard-panel">
      <h2>Paso 4 · Organización</h2>
      <p class="muted">Este paso puede dejarse pendiente. Actívalo para incorporar decisiones organizativas del centro.</p>
      <label class="choice-card organization-toggle">
        <input type="checkbox" data-wizard-path="organization.enabled" data-wizard-type="boolean" ${state.organization.enabled?'checked':''}>
        <span><b>Configurar ahora la organización del centro</b><small>Tutorías, cargos, reducciones, guardias, recreos e itinerancias.</small></span>
      </label>
      ${state.organization.enabled ? `
        <div class="field-row" style="margin-top:16px">
          <label>Nombre del perfil<input data-wizard-path="organization.profileName" value="${h(state.organization.profileName)}"></label>
          <label>LD ordinarias<input type="number" min="0" data-wizard-type="number" data-wizard-path="organization.ordinaryLd" value="${state.organization.ordinaryLd}"></label>
          <label>DC ordinarias<input type="number" min="0" data-wizard-type="number" data-wizard-path="organization.ordinaryDc" value="${state.organization.ordinaryDc}"></label>
          <label>Máximo LD simultáneas<input type="number" min="0" data-wizard-type="number-or-empty" data-wizard-path="organization.maxSimultaneousLd" value="${h(state.organization.maxSimultaneousLd)}"></label>
        </div>
        <div class="field-row">
          <label class="checkline"><input type="checkbox" data-wizard-path="organization.dcCoverageAllowed" data-wizard-type="boolean" ${state.organization.dcCoverageAllowed?'checked':''}> Permitir DC para coberturas</label>
          <label class="checkline"><input type="checkbox" data-wizard-path="organization.requireExactTarget" data-wizard-type="boolean" ${state.organization.requireExactTarget?'checked':''}> Exigir ajuste de carga</label>
          <label>Tolerancia de carga<input type="number" min="0" data-wizard-type="number" data-wizard-path="organization.toleranceSessions" value="${state.organization.toleranceSessions}"></label>
          <label>Presencia mínima general<input type="number" min="0" data-wizard-type="number-or-empty" data-wizard-path="organization.minimumPresence" value="${h(state.organization.minimumPresence)}"></label>
        </div>
        ${renderTutorsAndItinerary(state)}
        ${renderTeacherDefinitions(state,'positions','Cargos y coordinaciones','cargo')}
        ${renderTeacherDefinitions(state,'reductions','Reducciones','reducción')}
        ${renderServices(state)}
        ${preview.slots.some(row=>row.kind==='BREAK') ? renderBreakZones(state) : ''}
      ` : '<div class="empty">La configuración organizativa se mantendrá pendiente.</div>'}
    </section>`;
}

function renderTutorsAndItinerary(state) {
  const teacherOptions = state.data.teachers.map(row=>({value:row.id,label:row.name||'Docente sin nombre'}));
  return `
    <section class="wizard-subsection">
      <h3>Tutorías</h3>
      ${state.data.groups.length ? `<div class="table-wrap"><table><thead><tr><th>Grupo</th><th>Tutor o tutora</th></tr></thead><tbody>${state.data.groups.map(row=>`<tr><td>${h(row.name||'Grupo sin nombre')}</td><td><select data-wizard-collection="groups" data-wizard-row="${row.id}" data-wizard-field="tutorTeacherId"><option value="">Pendiente</option>${options(teacherOptions,row.tutorTeacherId)}</select></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Añade grupos para asignar tutorías.</div>'}
      <h3 style="margin-top:18px">Coberturas e itinerancias</h3>
      ${state.data.teachers.length ? `<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Coberturas</th><th>Itinerante</th><th>Días de presencia</th><th>Desplazamiento</th></tr></thead><tbody>${state.data.teachers.map(row=>{
        const settings = state.organization.teacherSettings[row.id] || {};
        const dayOptions = wizardDays().filter(day=>state.center.dayIds.includes(day.id)).map(day=>({value:day.id,label:day.label}));
        return `<tr>
          <td>${h(row.name||'Docente sin nombre')}</td>
          <td><input type="checkbox" aria-label="Elegible para coberturas" data-wizard-path="organization.teacherSettings.${row.id}.coverageEligible" data-wizard-type="boolean" ${settings.coverageEligible!==false?'checked':''}></td>
          <td><input type="checkbox" aria-label="Docente itinerante" data-wizard-path="organization.teacherSettings.${row.id}.itineraryEnabled" data-wizard-type="boolean" ${settings.itineraryEnabled?'checked':''}></td>
          <td><select multiple size="3" data-wizard-multiple data-wizard-path="organization.teacherSettings.${row.id}.presenceDays">${options(dayOptions,settings.presenceDays||[],true)}</select></td>
          <td><input type="number" min="0" aria-label="Minutos de desplazamiento" data-wizard-type="number" data-wizard-path="organization.teacherSettings.${row.id}.travelMinutes" value="${settings.travelMinutes||0}"></td>
        </tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty">Añade docentes para configurar coberturas e itinerancias.</div>'}
    </section>`;
}

function renderTeacherDefinitions(state,collection,title,singular) {
  const rows = state.organization[collection];
  const teacherOptions = state.data.teachers.map(row=>({value:row.id,label:row.name||'Docente sin nombre'}));
  const typeOptions = collection === 'positions'
    ? [['LEADERSHIP','Dirección'],['COORDINATION','Coordinación'],['TUTORSHIP','Tutoría'],['OTHER','Otro']]
    : [['LEADERSHIP','Cargo directivo'],['COORDINATION','Coordinación'],['AGE','Edad'],['PART_TIME','Jornada parcial'],['OTHER','Otra']];
  return `
    <section class="wizard-subsection">
      <div class="toolbar"><h3>${h(title)}</h3><span class="spacer"></span><button type="button" class="btn small" data-wizard-action="add-row" data-collection="${collection}">Añadir ${h(singular)}</button></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Denominación</th><th>Tipo</th><th>Sesiones</th><th></th></tr></thead><tbody>${rows.map(row=>`<tr>
        <td><select data-wizard-collection="${collection}" data-wizard-row="${row.id}" data-wizard-field="teacherId"><option value="">Selecciona</option>${options(teacherOptions,row.teacherId)}</select></td>
        <td><input data-wizard-collection="${collection}" data-wizard-row="${row.id}" data-wizard-field="label" value="${h(row.label)}"></td>
        <td><select data-wizard-collection="${collection}" data-wizard-row="${row.id}" data-wizard-field="type">${typeOptions.map(([value,label])=>option(value,label,row.type)).join('')}</select></td>
        <td><input type="number" min="0" data-wizard-type="number" data-wizard-collection="${collection}" data-wizard-row="${row.id}" data-wizard-field="weeklySessions" value="${row.weeklySessions}"></td>
        <td><button type="button" class="btn small ghost" data-wizard-action="remove-row" data-collection="${collection}" data-row="${row.id}">Eliminar</button></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Sin elementos.</div>'}
    </section>`;
}

function renderServices(state) {
  const rows = state.organization.services;
  const teacherOptions = state.data.teachers.map(row=>({value:row.id,label:row.name||'Docente sin nombre'}));
  const groupOptions = state.data.groups.map(row=>({value:row.id,label:row.name||'Grupo sin nombre'}));
  const kinds = [['GUARD','Guardia'],['SUPPORT','Apoyo'],['BREAK_DUTY','Vigilancia de recreo'],['MEETING','Reunión'],['TRAVEL','Desplazamiento'],['OTHER','Otro']];
  return `
    <section class="wizard-subsection">
      <div class="toolbar"><h3>Guardias, apoyos, recreos y reuniones</h3><span class="spacer"></span><button type="button" class="btn small" data-wizard-action="add-row" data-collection="services">Añadir servicio</button></div>
      ${rows.length ? `<div class="wizard-activity-list">${rows.map(row=>`
        <article class="wizard-row-card">
          <div class="toolbar"><h4>${h(row.name||'Nuevo servicio')}</h4><span class="spacer"></span><button type="button" class="btn small ghost" data-wizard-action="remove-row" data-collection="services" data-row="${row.id}">Eliminar</button></div>
          <div class="field-row">
            <label>Nombre<input data-wizard-collection="services" data-wizard-row="${row.id}" data-wizard-field="name" value="${h(row.name)}"></label>
            <label>Tipo<select data-wizard-collection="services" data-wizard-row="${row.id}" data-wizard-field="kind">${kinds.map(([value,label])=>option(value,label,row.kind)).join('')}</select></label>
            <label>Sesiones semanales<input type="number" min="1" data-wizard-type="number" data-wizard-collection="services" data-wizard-row="${row.id}" data-wizard-field="weeklySessions" value="${row.weeklySessions}"></label>
            <label>Docentes<select multiple size="3" data-wizard-multiple data-wizard-collection="services" data-wizard-row="${row.id}" data-wizard-field="teacherIds">${options(teacherOptions,row.teacherIds||[],true)}</select></label>
            <label>Grupos opcionales<select multiple size="3" data-wizard-multiple data-wizard-collection="services" data-wizard-row="${row.id}" data-wizard-field="groupIds">${options(groupOptions,row.groupIds||[],true)}</select></label>
          </div>
        </article>`).join('')}</div>` : '<div class="empty">Sin servicios.</div>'}
    </section>`;
}

function renderBreakZones(state) {
  const rows = state.organization.breakZones;
  return `
    <section class="wizard-subsection">
      <div class="toolbar"><h3>Zonas de recreo</h3><span class="spacer"></span><button type="button" class="btn small" data-wizard-action="add-row" data-collection="breakZones">Añadir zona</button></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Zona</th><th>Puestos mínimos</th><th></th></tr></thead><tbody>${rows.map(row=>`<tr>
        <td><input data-wizard-collection="breakZones" data-wizard-row="${row.id}" data-wizard-field="name" value="${h(row.name)}"></td>
        <td><input type="number" min="1" data-wizard-type="number" data-wizard-collection="breakZones" data-wizard-row="${row.id}" data-wizard-field="minimumStaff" value="${row.minimumStaff}"></td>
        <td><button type="button" class="btn small ghost" data-wizard-action="remove-row" data-collection="breakZones" data-row="${row.id}">Eliminar</button></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">No hay zonas configuradas.</div>'}
    </section>`;
}

function renderReviewStep(state,review,summary) {
  const status = review.canGenerateAfterCreate
    ? {kind:'ok',title:'Preparado para generar',text:'El proyecto no presenta bloqueos de generación.'}
    : review.canCreateDraft
      ? {kind:'warn',title:'Borrador válido',text:'Podrás crearlo ahora y completar las tareas pendientes después.'}
      : {kind:'danger',title:'Revisión necesaria',text:'Corrige los bloqueos esenciales antes de crear el proyecto.'};
  return `
    <section class="card wizard-panel">
      <h2>Paso 5 · Revisión</h2>
      <div class="wizard-review-banner ${status.kind}"><b>${status.title}</b><span>${status.text}</span></div>
      <div class="grid cards" style="margin-top:16px">
        ${reviewMetric(summary.days,'Días lectivos')}${reviewMetric(summary.classSlots,'Tramos lectivos')}${reviewMetric(summary.teachers,'Docentes')}${reviewMetric(summary.groups,'Grupos')}${reviewMetric(summary.activities,'Actividades')}
      </div>
      <div class="grid two" style="margin-top:16px">
        <section>
          <h3>Completado</h3>
          ${review.completed.length ? review.completed.map(message=>reviewItem('ok',message)).join('') : '<div class="empty">Todavía no hay bloques completos.</div>'}
          <h3>Falta completar</h3>
          ${review.missing.length ? review.missing.map(row=>reviewItem('warn',row,row.step)).join('') : '<div class="issue INFO">No hay omisiones detectadas.</div>'}
        </section>
        <section>
          <h3>Impide generar o crear</h3>
          ${review.blocking.length ? review.blocking.map(row=>reviewItem('danger',row,row.step)).join('') : '<div class="issue INFO">No hay bloqueos.</div>'}
          <h3>Recomendaciones</h3>
          ${review.recommendations.length ? review.recommendations.map(row=>reviewItem('info',row,row.step)).join('') : '<div class="issue INFO">No hay recomendaciones adicionales.</div>'}
        </section>
      </div>
      <section class="wizard-summary"><h3>Resumen del proyecto</h3><dl>
        <div><dt>Centro</dt><dd>${h(summary.center)}</dd></div>
        <div><dt>Curso</dt><dd>${h(summary.academicYear)}</dd></div>
        <div><dt>Materias o módulos</dt><dd>${summary.subjects}</dd></div>
        <div><dt>Espacios</dt><dd>${summary.spaces}</dd></div>
        <div><dt>Organización específica</dt><dd>${state.organization.enabled?'Activada':'Pendiente'}</dd></div>
      </dl></section>
    </section>`;
}

function reviewMetric(value,label) {
  return `<div class="card metric-card"><div class="metric">${value}</div><div class="metric-label">${h(label)}</div></div>`;
}
function reviewItem(kind,value,step) {
  const icon = kind === 'ok' ? '✓' : kind === 'danger' ? '!' : '•';
  const row=typeof value==='string'?{message:value}:value||{};
  const title=row.title?`<b>${h(row.title)}</b><br>`:'';
  const origin=row.source?.path?`<br><small>Origen: ${h(row.source.path)}</small>`:'';
  return `<div class="wizard-review-item ${kind}"><span aria-hidden="true">${icon}</span><div>${title}${h(row.message||'')}${origin}${step?` <button type="button" class="link-button" data-wizard-action="go-step" data-step="${step}">Revisar paso ${step}</button>`:''}</div></div>`;
}
function listChoice(path,value,label,isChecked) {
  return `<label class="choice-card"><input type="checkbox" data-wizard-list-path="${path}" value="${value}" ${isChecked?'checked':''}><span>${h(label)}</span></label>`;
}
function radioChoice(path,value,title,detail,current) {
  return `<label class="choice-card"><input type="radio" name="wizardPrivacy" data-wizard-path="${path}" value="${value}" ${current===value?'checked':''}><span><b>${h(title)}</b><small>${h(detail)}</small></span></label>`;
}
function options(rows,current,multiple=false) {
  const selected = new Set(multiple ? (Array.isArray(current)?current:[]) : [current]);
  return rows.map(row=>`<option value="${h(row.value)}" ${selected.has(row.value)?'selected':''}>${h(row.label)}</option>`).join('');
}
function option(value,label,current) {
  return `<option value="${h(value)}" ${value===current?'selected':''}>${h(label)}</option>`;
}
function h(value='') {
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
