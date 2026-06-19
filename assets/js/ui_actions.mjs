export const ENTITY_TYPES = Object.freeze(['teacher','group','subject','space','activity']);
export const ENTITY_OPERATIONS = Object.freeze(['add','edit','delete']);

export const EXACT_UI_ACTIONS = Object.freeze([
  'new-project','open-project','load-demo','add-slot','edit-slot','clear-availability',
  'add-presence-rule','delete-presence-rule','add-break-zone','delete-break-zone',
  'add-position','delete-position','add-reduction','delete-reduction',
  'add-organization-service','delete-organization-service','add-anchored-segment','delete-anchored-segment',
  'add-organization-rule','toggle-organization-rule','delete-organization-rule',
  'download-template','apply-import','cancel-import','revalidate-import','edit-staged-row',
  'select-all-staged','select-none-staged','cancel-generation','export-cp-sat-request','import-cp-sat-response','export-generation-run','accept-proposal','reject-proposal',
  'undo','redo','select-assignment','apply-move','editor-apply-destination','editor-select-visible','editor-clear-selection',
  'editor-shift','editor-lock-selection','editor-unlock-selection','editor-unplace-selection','save-scenario','apply-scenario',
  'compare-scenarios','add-lock','unlock','finalize','recommend-coverage',
  'assign-coverage','uncovered','coverage-complete','coverage-communicate','coverage-reopen','confirm-absence','cancel-absence','finish-absence',
  'create-recovery','schedule-recovery','recovery-complete','recovery-cancel','impact-suspend','impact-cancel','impact-recovery','resolve-impact','add-temporary-substitution',
  'finish-temporary-substitution','cancel-temporary-substitution','download-excel',
  'export-project','backup','list-backups','restore-backup','restore-history',
  'next-course','clear-project','refresh-diagnostics','clear-local-errors','clear-runtime-cache','activate-update',
  'semantic-add-site','semantic-edit-site','semantic-delete-site','semantic-add-travel','semantic-edit-travel','semantic-delete-travel',
  'semantic-add-resource','semantic-edit-resource','semantic-delete-resource','semantic-configure-activity',
  'semantic-add-relation','semantic-edit-relation','semantic-delete-relation','semantic-add-split','semantic-edit-split','semantic-delete-split',
]);

const EXACT_SET = new Set(EXACT_UI_ACTIONS);
const ENTITY_SET = new Set(ENTITY_TYPES);
const OPERATION_SET = new Set(ENTITY_OPERATIONS);

export function resolveUiAction(rawAction) {
  const action = String(rawAction || '').trim();
  if (!action) return { kind: 'unknown', action: '' };
  if (EXACT_SET.has(action)) return { kind: 'exact', action };

  const match = /^(add|edit|delete)-([a-z][a-z0-9_-]*)$/.exec(action);
  if (match && OPERATION_SET.has(match[1]) && ENTITY_SET.has(match[2])) {
    return { kind: 'entity', action, operation: match[1], entityType: match[2] };
  }
  return { kind: 'unknown', action };
}

export function assertKnownUiAction(rawAction) {
  const route = resolveUiAction(rawAction);
  if (route.kind === 'unknown') throw new Error(`Acción de interfaz no registrada: ${route.action || '(vacía)'}.`);
  return route;
}
