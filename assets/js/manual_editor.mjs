import {
  normalizeProject, deepClone, createRevision, appendAudit, structuralFingerprint, uid, nowIso, compactEditCommands,
} from './core.mjs';
import { checkMove } from './generator.mjs';
import { reconcileConfirmedAbsenceCoveragesInPlace } from './daily.mjs';

export const MANUAL_EDITOR_CONTRACT_VERSION = 'manual-editor-contract-1.0';

function uniqueIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean))];
}

function editorState(project) {
  return {
    assignments: deepClone(project.assignments || []),
    locks: deepClone(project.locks || []),
  };
}

function stateFromCommand(command, side, currentProject) {
  const explicit = command?.[`${side}State`];
  if (explicit?.assignments && explicit?.locks) return deepClone(explicit);
  const legacyAssignments = command?.[side];
  if (Array.isArray(legacyAssignments)) {
    return { assignments: deepClone(legacyAssignments), locks: deepClone(currentProject.locks || []) };
  }
  throw new Error('La edición no contiene un estado recuperable.');
}

function restoreEditorState(project, state) {
  project.assignments = deepClone(state.assignments || []);
  project.locks = deepClone(state.locks || []);
}

function supersedeRedoBranch(project) {
  for (const command of project.editCommands || []) {
    if (command.status === 'UNDONE') {
      command.status = 'SUPERSEDED';
      command.supersededAt = nowIso();
    }
  }
}

function recordCommand(project, { type, label, beforeState, afterState, details = {} }) {
  project.editCommands = Array.isArray(project.editCommands) ? project.editCommands : [];
  supersedeRedoBranch(project);
  const command = {
    id: uid('editor_command'),
    contractVersion: MANUAL_EDITOR_CONTRACT_VERSION,
    type,
    label,
    createdAt: nowIso(),
    status: 'APPLIED',
    beforeState: deepClone(beforeState),
    afterState: deepClone(afterState),
    details: deepClone(details),
  };
  project.editCommands.push(command);
  compactEditCommands(project);
  return command;
}

function finalizeEdit(project, auditAction, auditDetail) {
  reconcileConfirmedAbsenceCoveragesInPlace(project,{reason:auditAction});
  appendAudit(project, auditAction, auditDetail, project.meta.responsible || 'Usuario');
  project.meta.structuralFingerprint = structuralFingerprint(project);
  return project;
}

function assignmentMap(project) {
  return new Map((project.assignments || []).map(row => [row.id, row]));
}

function activeLockMap(project) {
  const map = new Map();
  for (const lock of project.locks || []) {
    if (lock.active === false) continue;
    const list = map.get(lock.assignmentId) || [];
    list.push(lock);
    map.set(lock.assignmentId, list);
  }
  return map;
}

export function editorHistoryState(input) {
  const project = normalizeProject(input);
  const commands = (project.editCommands || []).filter(row => row.status !== 'SUPERSEDED');
  const lastAppliedIndex = [...commands].map((row, index) => ({ row, index })).reverse().find(x => x.row.status === 'APPLIED')?.index ?? -1;
  const redoIndex = commands.findIndex((row, index) => index > lastAppliedIndex && row.status === 'UNDONE');
  return {
    canUndo: lastAppliedIndex >= 0,
    canRedo: redoIndex >= 0,
    applied: commands.filter(row => row.status === 'APPLIED').length,
    undone: commands.filter(row => row.status === 'UNDONE').length,
    latestApplied: lastAppliedIndex >= 0 ? commands[lastAppliedIndex] : null,
    nextRedo: redoIndex >= 0 ? commands[redoIndex] : null,
  };
}

export function previewSingleMove(input, assignmentId, dayId, slotId, spaceId = '') {
  const project = normalizeProject(input);
  const assignment = project.assignments.find(row => row.id === assignmentId);
  if (!assignment) return { ok: false, reasons: ['No se encontró la sesión.'], moves: [] };
  if (assignment.dayId === dayId && assignment.slotId === slotId && String(assignment.spaceId || '') === String(spaceId || '')) {
    return { ok: false, reasons: ['La sesión ya está en ese destino.'], moves: [] };
  }
  const check = checkMove(project, assignmentId, dayId, slotId, spaceId);
  return {
    ok: check.ok,
    reasons: check.reasons || [],
    moves: check.ok ? [{ assignmentId, from: { dayId: assignment.dayId, slotId: assignment.slotId, spaceId: assignment.spaceId || '' }, to: { dayId, slotId, spaceId: spaceId || '' } }] : [],
  };
}

export function previewSelectionShift(input, assignmentIds, deltaDay, deltaSlot) {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  if (!ids.length) return { ok: false, reasons: ['Selecciona al menos una sesión.'], moves: [], issues: [] };
  const byId = assignmentMap(project);
  const locks = activeLockMap(project);
  const issues = [];
  const planned = [];
  const selected = [];

  for (const id of ids) {
    const assignment = byId.get(id);
    if (!assignment) {
      issues.push({ assignmentId: id, reasons: ['No se encontró la sesión.'] });
      continue;
    }
    if (locks.has(id)) {
      issues.push({ assignmentId: id, reasons: ['La sesión está bloqueada.'] });
      continue;
    }
    const dayIndex = project.calendar.days.findIndex(row => row.id === assignment.dayId);
    const slotIndex = project.calendar.slots.findIndex(row => row.id === assignment.slotId);
    const targetDay = project.calendar.days[dayIndex + Number(deltaDay || 0)];
    const targetSlot = project.calendar.slots[slotIndex + Number(deltaSlot || 0)];
    if (!targetDay || !targetSlot) {
      issues.push({ assignmentId: id, reasons: ['El desplazamiento sale de los límites del horario.'] });
      continue;
    }
    selected.push(assignment);
    planned.push({
      assignmentId: id,
      from: { dayId: assignment.dayId, slotId: assignment.slotId, spaceId: assignment.spaceId || '' },
      to: { dayId: targetDay.id, slotId: targetSlot.id, spaceId: assignment.spaceId || '' },
    });
  }

  if (issues.length) return { ok: false, reasons: [...new Set(issues.flatMap(row => row.reasons))], moves: [], issues };

  const selectedSet = new Set(ids);
  const baseAssignments = project.assignments.filter(row => !selectedSet.has(row.id));
  const accepted = [];
  for (const move of planned) {
    const original = selected.find(row => row.id === move.assignmentId);
    const temporary = normalizeProject({ ...project, assignments: [...deepClone(baseAssignments), ...deepClone(accepted), deepClone(original)] });
    const check = checkMove(temporary, original.id, move.to.dayId, move.to.slotId, move.to.spaceId);
    if (!check.ok) {
      issues.push({ assignmentId: original.id, reasons: check.reasons || ['Destino incompatible.'] });
      continue;
    }
    accepted.push({ ...deepClone(original), ...move.to, source: 'MANUAL' });
  }

  return {
    ok: issues.length === 0,
    reasons: [...new Set(issues.flatMap(row => row.reasons))],
    moves: issues.length ? [] : planned,
    issues,
    deltaDay: Number(deltaDay || 0),
    deltaSlot: Number(deltaSlot || 0),
  };
}

export function previewSelectionToCell(input, assignmentIds, anchorAssignmentId, targetDayId, targetSlotId) {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  const anchor = project.assignments.find(row => row.id === anchorAssignmentId) || project.assignments.find(row => ids.includes(row.id));
  if (!anchor) return { ok: false, reasons: ['No se encontró la sesión de referencia.'], moves: [], issues: [] };
  const sourceDay = project.calendar.days.findIndex(row => row.id === anchor.dayId);
  const sourceSlot = project.calendar.slots.findIndex(row => row.id === anchor.slotId);
  const targetDay = project.calendar.days.findIndex(row => row.id === targetDayId);
  const targetSlot = project.calendar.slots.findIndex(row => row.id === targetSlotId);
  if ([sourceDay, sourceSlot, targetDay, targetSlot].some(index => index < 0)) {
    return { ok: false, reasons: ['El origen o el destino no pertenece al calendario actual.'], moves: [], issues: [] };
  }
  return previewSelectionShift(project, ids, targetDay - sourceDay, targetSlot - sourceSlot);
}

export function listSingleMoveDestinations(input, assignmentId) {
  const project = normalizeProject(input);
  const assignment = project.assignments.find(row => row.id === assignmentId);
  if (!assignment) throw new Error('No se encontró la sesión.');
  const allowed = [];
  const rejected = [];
  const spaces = [{ id: '', name: 'Sin espacio' }, ...(project.spaces || [])];
  for (let dayIndex = 0; dayIndex < project.calendar.days.length; dayIndex += 1) {
    const day = project.calendar.days[dayIndex];
    for (let slotIndex = 0; slotIndex < project.calendar.slots.length; slotIndex += 1) {
      const slot = project.calendar.slots[slotIndex];
      for (const space of spaces) {
        const current = day.id === assignment.dayId && slot.id === assignment.slotId && String(space.id || '') === String(assignment.spaceId || '');
        if (current) continue;
        const check = checkMove(project, assignmentId, day.id, slot.id, space.id || '');
        if (check.ok) {
          const distance = Math.abs(dayIndex - project.calendar.days.findIndex(row => row.id === assignment.dayId)) + Math.abs(slotIndex - project.calendar.slots.findIndex(row => row.id === assignment.slotId));
          allowed.push({ dayId: day.id, slotId: slot.id, spaceId: space.id || '', score: Math.max(0, 100 - distance), reasons: [] });
        } else {
          rejected.push({ dayId: day.id, slotId: slot.id, spaceId: space.id || '', reasons: check.reasons || [] });
        }
      }
    }
  }
  allowed.sort((a, b) => b.score - a.score || a.dayId.localeCompare(b.dayId) || a.slotId.localeCompare(b.slotId) || a.spaceId.localeCompare(b.spaceId));
  return { allowed, rejected, total: allowed.length + rejected.length };
}

export function applyMovePreview(input, preview, label = '') {
  if (!preview?.ok || !Array.isArray(preview.moves) || !preview.moves.length) {
    throw new Error((preview?.reasons || ['El movimiento no es válido.']).join(' '));
  }
  const project = normalizeProject(input);
  const beforeState = editorState(project);
  const moves = new Map(preview.moves.map(row => [row.assignmentId, row.to]));
  createRevision(project, label || (moves.size > 1 ? 'Antes de mover varias sesiones' : 'Antes de mover una sesión'));
  project.assignments = project.assignments.map(row => moves.has(row.id) ? { ...row, ...moves.get(row.id), source: 'MANUAL' } : row);
  const afterState = editorState(project);
  const command = recordCommand(project, {
    type: moves.size > 1 ? 'MOVE_ASSIGNMENTS_BATCH' : 'MOVE_ASSIGNMENT',
    label: label || (moves.size > 1 ? `Mover ${moves.size} sesiones` : 'Mover sesión'),
    beforeState,
    afterState,
    details: { moves: deepClone(preview.moves) },
  });
  return finalizeEdit(project, 'EDITOR_MOVE_APPLIED', `${command.label}.`);
}

export function unplaceAssignments(input, assignmentIds, reason = '') {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  if (!ids.length) throw new Error('Selecciona al menos una sesión.');
  const existing = new Set(project.assignments.map(row => row.id));
  const missing = ids.filter(id => !existing.has(id));
  if (missing.length) throw new Error('La selección contiene sesiones inexistentes.');
  const locked = activeLockMap(project);
  if (ids.some(id => locked.has(id))) throw new Error('No se pueden retirar sesiones bloqueadas.');
  const beforeState = editorState(project);
  createRevision(project, `Antes de retirar ${ids.length} sesión(es) del horario`);
  project.assignments = project.assignments.filter(row => !ids.includes(row.id));
  const afterState = editorState(project);
  recordCommand(project, {
    type: 'UNPLACE_ASSIGNMENTS',
    label: `Retirar ${ids.length} sesión(es)`,
    beforeState,
    afterState,
    details: { assignmentIds: ids, reason: String(reason || '').trim() },
  });
  return finalizeEdit(project, 'EDITOR_ASSIGNMENTS_UNPLACED', `${ids.length} sesión(es) retiradas. ${String(reason || '').trim()}`.trim());
}

export function lockAssignments(input, assignmentIds, { reason = '', responsible = '' } = {}) {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  const cleanReason = String(reason || '').trim();
  const cleanResponsible = String(responsible || project.meta.responsible || '').trim();
  if (!ids.length) throw new Error('Selecciona al menos una sesión.');
  if (!cleanReason) throw new Error('El motivo del bloqueo es obligatorio.');
  if (!cleanResponsible) throw new Error('El responsable del bloqueo es obligatorio.');
  const existing = new Set(project.assignments.map(row => row.id));
  if (ids.some(id => !existing.has(id))) throw new Error('La selección contiene sesiones inexistentes.');
  const active = activeLockMap(project);
  const targets = ids.filter(id => !active.has(id));
  if (!targets.length) throw new Error('Todas las sesiones seleccionadas ya están bloqueadas.');
  const beforeState = editorState(project);
  createRevision(project, `Antes de bloquear ${targets.length} sesión(es)`);
  for (const assignmentId of targets) {
    project.locks.push({ id: uid('lock'), assignmentId, reason: cleanReason, createdBy: cleanResponsible, createdAt: nowIso(), active: true });
  }
  const afterState = editorState(project);
  recordCommand(project, {
    type: 'LOCK_ASSIGNMENTS', label: `Bloquear ${targets.length} sesión(es)`, beforeState, afterState,
    details: { assignmentIds: targets, reason: cleanReason, responsible: cleanResponsible },
  });
  return finalizeEdit(project, 'EDITOR_ASSIGNMENTS_LOCKED', `${targets.length} sesión(es): ${cleanReason}`);
}

export function unlockAssignments(input, assignmentIds, { reason = '', responsible = '' } = {}) {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  const cleanReason = String(reason || '').trim();
  const cleanResponsible = String(responsible || project.meta.responsible || '').trim();
  if (!ids.length) throw new Error('Selecciona al menos una sesión.');
  if (!cleanReason) throw new Error('El motivo del desbloqueo es obligatorio.');
  if (!cleanResponsible) throw new Error('El responsable del desbloqueo es obligatorio.');
  const active = (project.locks || []).filter(row => row.active !== false && ids.includes(row.assignmentId));
  if (!active.length) throw new Error('Ninguna sesión seleccionada está bloqueada.');
  const beforeState = editorState(project);
  createRevision(project, `Antes de desbloquear ${active.length} sesión(es)`);
  const when = nowIso();
  for (const lock of active) {
    lock.active = false;
    lock.unlockedAt = when;
    lock.unlockReason = cleanReason;
    lock.unlockedBy = cleanResponsible;
  }
  const afterState = editorState(project);
  recordCommand(project, {
    type: 'UNLOCK_ASSIGNMENTS', label: `Desbloquear ${active.length} sesión(es)`, beforeState, afterState,
    details: { assignmentIds: uniqueIds(active.map(row => row.assignmentId)), reason: cleanReason, responsible: cleanResponsible },
  });
  return finalizeEdit(project, 'EDITOR_ASSIGNMENTS_UNLOCKED', `${active.length} bloqueo(s): ${cleanReason}`);
}

export function undoEditorCommand(input) {
  const project = normalizeProject(input);
  project.editCommands = Array.isArray(project.editCommands) ? project.editCommands : [];
  const command = [...project.editCommands].reverse().find(row => row.status === 'APPLIED');
  if (!command) throw new Error('No hay una edición que deshacer.');
  const state = stateFromCommand(command, 'before', project);
  createRevision(project, `Antes de deshacer: ${command.label || command.type}`);
  restoreEditorState(project, state);
  reconcileConfirmedAbsenceCoveragesInPlace(project,{reason:'EDITOR_COMMAND_UNDONE'});
  command.status = 'UNDONE';
  command.undoneAt = nowIso();
  appendAudit(project, 'EDITOR_COMMAND_UNDONE', command.label || command.type, project.meta.responsible || 'Usuario');
  project.meta.structuralFingerprint = structuralFingerprint(project);
  return project;
}

export function redoEditorCommand(input) {
  const project = normalizeProject(input);
  project.editCommands = Array.isArray(project.editCommands) ? project.editCommands : [];
  const activeCommands = project.editCommands.filter(row => row.status !== 'SUPERSEDED');
  const lastAppliedIndex = [...activeCommands].map((row, index) => ({ row, index })).reverse().find(x => x.row.status === 'APPLIED')?.index ?? -1;
  const command = activeCommands.find((row, index) => index > lastAppliedIndex && row.status === 'UNDONE');
  if (!command) throw new Error('No hay una edición que rehacer.');
  const state = stateFromCommand(command, 'after', project);
  createRevision(project, `Antes de rehacer: ${command.label || command.type}`);
  restoreEditorState(project, state);
  reconcileConfirmedAbsenceCoveragesInPlace(project,{reason:'EDITOR_COMMAND_REDONE'});
  command.status = 'APPLIED';
  command.redoneAt = nowIso();
  appendAudit(project, 'EDITOR_COMMAND_REDONE', command.label || command.type, project.meta.responsible || 'Usuario');
  project.meta.structuralFingerprint = structuralFingerprint(project);
  return project;
}

export function assignmentSelectionSummary(input, assignmentIds) {
  const project = normalizeProject(input);
  const ids = uniqueIds(assignmentIds);
  const selected = project.assignments.filter(row => ids.includes(row.id));
  const locks = activeLockMap(project);
  return {
    requested: ids.length,
    selected: selected.length,
    locked: selected.filter(row => locks.has(row.id)).length,
    unlocked: selected.filter(row => !locks.has(row.id)).length,
    teacherIds: uniqueIds(selected.flatMap(row => project.activities.find(activity => activity.id === row.activityId)?.teacherIds || [])),
    groupIds: uniqueIds(selected.flatMap(row => project.activities.find(activity => activity.id === row.activityId)?.groupIds || [])),
  };
}
