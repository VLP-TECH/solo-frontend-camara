// Años ofrecidos por los selectores del dashboard.
// Los selectores combinan un rango garantizado (para que los años nuevos sean
// seleccionables aunque los datos aún no hayan llegado a resultado_indicadores)
// con los años realmente presentes en los datos.

export const ANIO_MIN = 2020;
export const ANIO_MAX = 2026;

/** Opciones de año para los selectores: unión del rango garantizado
 *  [ANIO_MIN..ANIO_MAX] con los años de los datos, ordenada descendente. */
export function buildAnioOptions(dataYears?: ReadonlyArray<number | string> | null): string[] {
  const set = new Set<number>();
  for (let y = ANIO_MIN; y <= ANIO_MAX; y++) set.add(y);
  for (const y of dataYears ?? []) {
    const n = Number(y);
    if (Number.isFinite(n) && n >= 1900 && n <= 2100) set.add(n);
  }
  return [...set].sort((a, b) => b - a).map(String);
}
