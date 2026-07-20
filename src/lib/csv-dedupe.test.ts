import { describe, expect, it } from "vitest";
import { filterDuplicateRows, fingerprintRow, normalizeForFingerprint, type DedupeColumn } from "./csv-dedupe";

const COLS: DedupeColumn[] = [
  { name: "nombre_indicador", type: "text" },
  { name: "valor", type: "numeric", scale: 2 },
  { name: "periodo", type: "int" },
  { name: "provincia", type: "text" },
  { name: "procesado", type: "bool" },
];

describe("normalizeForFingerprint", () => {
  it("redondea numéricos a la escala de la BD", () => {
    const col: DedupeColumn = { name: "valor", type: "numeric", scale: 2 };
    expect(normalizeForFingerprint(2.54722893321189, col)).toBe("2.55");
    expect(normalizeForFingerprint(2.55, col)).toBe("2.55");
    expect(normalizeForFingerprint("2,55", { ...col })).toBe("2,55");
  });

  it("usa 2 decimales por defecto si no hay escala", () => {
    expect(normalizeForFingerprint(1.005, { name: "v", type: "numeric" })).toBe("1.00");
  });

  it("trata null, undefined y cadena vacía como iguales", () => {
    const col: DedupeColumn = { name: "provincia", type: "text" };
    expect(normalizeForFingerprint(null, col)).toBe("");
    expect(normalizeForFingerprint(undefined, col)).toBe("");
    expect(normalizeForFingerprint("", col)).toBe("");
  });

  it("normaliza periodo almacenado como date al año del CSV", () => {
    const col: DedupeColumn = { name: "periodo", type: "int" };
    expect(normalizeForFingerprint("2024-01-01", col)).toBe("2024");
    expect(normalizeForFingerprint(2024, col)).toBe("2024");
  });

  it("normaliza booleanos de BD (true) y de CSV ('t'/'true')", () => {
    const col: DedupeColumn = { name: "procesado", type: "bool" };
    expect(normalizeForFingerprint(true, col)).toBe("true");
    expect(normalizeForFingerprint("t", col)).toBe("true");
    expect(normalizeForFingerprint("true", col)).toBe("true");
    expect(normalizeForFingerprint(false, col)).toBe("false");
  });
});

describe("filterDuplicateRows", () => {
  const base = {
    nombre_indicador: "Densidad de startups",
    valor: 2.54722893321189,
    periodo: 2026,
    provincia: null,
    procesado: true,
  };

  it("omite filas que ya existen en la BD aunque el CSV traiga más decimales", () => {
    const existing = [{ ...base, valor: 2.55, provincia: "" }];
    const { fresh, skipped } = filterDuplicateRows([base], existing, COLS);
    expect(fresh).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("mantiene filas nuevas y omite solo las repetidas", () => {
    const nueva = { ...base, periodo: 2027 };
    const existing = [{ ...base, valor: 2.55 }];
    const { fresh, skipped } = filterDuplicateRows([base, nueva], existing, COLS);
    expect(fresh).toEqual([nueva]);
    expect(skipped).toBe(1);
  });

  it("deduplica filas idénticas dentro del propio CSV", () => {
    const { fresh, skipped } = filterDuplicateRows([base, { ...base }], [], COLS);
    expect(fresh).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it("no confunde filas iguales salvo el valor (p. ej. tasas a 3 y 5 años)", () => {
    const tres = { ...base, valor: 75.82910069 };
    const cinco = { ...base, valor: 72.22920783 };
    const { fresh, skipped } = filterDuplicateRows([tres, cinco], [], COLS);
    expect(fresh).toHaveLength(2);
    expect(skipped).toBe(0);
  });

  it("fingerprintRow es estable entre representación CSV y BD", () => {
    const csvRow = { ...base };
    const dbRow = { ...base, valor: 2.55, periodo: "2026-01-01", provincia: "" };
    expect(fingerprintRow(csvRow, COLS)).toBe(fingerprintRow(dbRow, COLS));
  });
});
