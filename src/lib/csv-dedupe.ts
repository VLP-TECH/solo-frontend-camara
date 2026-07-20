// Deduplicación de filas para la carga de CSV (DataUpload) en modo INSERT.
// Una fila es duplicada si todas sus columnas de datos coinciden con una fila
// ya existente en la tabla. Los numéricos se comparan a la escala con la que
// los almacena la BD (p. ej. valor numeric(20,2) → 2 decimales), para que una
// re-subida del mismo CSV se detecte aunque el fichero traiga más decimales.

export type DedupeColType = "text" | "int" | "numeric" | "date" | "bool";

export interface DedupeColumn {
  name: string;
  type: DedupeColType;
  /** Decimales con los que la BD almacena la columna (solo tipo numeric). */
  scale?: number;
}

/** Normaliza un valor (del CSV o leído de la BD) a su forma canónica de comparación. */
export function normalizeForFingerprint(value: unknown, col: DedupeColumn): string {
  if (value === null || value === undefined || value === "") return "";
  switch (col.type) {
    case "numeric": {
      const n = Number(value);
      return Number.isFinite(n) ? n.toFixed(col.scale ?? 2) : String(value).trim();
    }
    case "int": {
      const s = String(value);
      // periodo puede venir de la BD como date ("2024-01-01") y del CSV como 2024
      const asDate = /^(\d{4})-\d{2}-\d{2}/.exec(s);
      if (asDate) return asDate[1];
      const n = Number(s);
      return Number.isFinite(n) ? String(Math.trunc(n)) : s.trim();
    }
    case "bool":
      return value === true || value === "true" || value === "t" || value === 1 ? "true" : "false";
    case "date":
      return String(value).slice(0, 10);
    default:
      return String(value).trim();
  }
}

/** Huella estable de una fila sobre las columnas indicadas. */
export function fingerprintRow(row: Record<string, unknown>, columns: DedupeColumn[]): string {
  return columns.map((c) => normalizeForFingerprint(row[c.name], c)).join("");
}

export interface DedupeResult {
  /** Filas del CSV que no existen aún en la tabla (y sin repetidos exactos dentro del propio CSV). */
  fresh: Record<string, unknown>[];
  /** Número de filas omitidas por estar ya en la BD o repetidas idénticas en el CSV. */
  skipped: number;
}

/** Separa las filas nuevas de las duplicadas comparando contra las existentes. */
export function filterDuplicateRows(
  payload: Record<string, unknown>[],
  existing: Record<string, unknown>[],
  columns: DedupeColumn[],
): DedupeResult {
  const seen = new Set(existing.map((r) => fingerprintRow(r, columns)));
  const fresh: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const row of payload) {
    const fp = fingerprintRow(row, columns);
    if (seen.has(fp)) {
      skipped += 1;
      continue;
    }
    seen.add(fp);
    fresh.push(row);
  }
  return { fresh, skipped };
}
