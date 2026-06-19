export const PRODUCT_VERSION = '0.6.0-product-alpha.32.1';
export const PRODUCT_PHASE = 'P12_6_1_SANEAMENTO_UX_PUBLICA';
export const PRODUCT_NAV = Object.freeze([
  ['home','Inicio'],['data','Datos'],['organization','Organización'],['schedule','Horario'],
  ['daily','Gestión diaria'],['documents','Documentos'],['system','Sistema'],
]);
const STORAGE_KEY='ghe.product.maintenanceMode.p12_6_1';
export function readTechnicalMode(locationLike=globalThis.location,storage=globalThis.sessionStorage){
  try{
    const params=new URLSearchParams(locationLike?.search||'');
    if(params.get('mantenimiento')==='1')return true;
    if(params.get('modoTecnico')==='1')return false;
  }catch{}
  try{return storage?.getItem(STORAGE_KEY)==='1';}catch{return false;}
}
export function writeTechnicalMode(enabled,locationLike=globalThis.location,historyLike=globalThis.history,storage=globalThis.sessionStorage){
  try{if(enabled)storage?.setItem(STORAGE_KEY,'1');else storage?.removeItem(STORAGE_KEY);}catch{}
  try{const url=new URL(locationLike.href);if(enabled)url.searchParams.set('mantenimiento','1');else url.searchParams.delete('mantenimiento');url.searchParams.delete('modoTecnico');historyLike?.replaceState?.(null,'',url);}catch{}
  return Boolean(enabled);
}
export function routeForReadiness(id){
  if(id==='organization')return {page:'organization'};
  if(id==='generate')return {page:'schedule',scheduleTab:'generate'};
  if(id==='review')return {page:'schedule',scheduleTab:'validation'};
  const allowed=new Set(['project','calendar','teachers','groups','subjects','spaces','activities','availability','imports']);
  return {page:'data',dataTab:allowed.has(id)?id:'project'};
}
