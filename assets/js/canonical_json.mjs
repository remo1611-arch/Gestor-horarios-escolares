/**
 * Serialización JSON canónica compartida.
 * Ordena las claves de todos los objetos y conserva el orden de los arrays.
 * Es la única implementación autorizada para fingerprints y checksums internos.
 */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
