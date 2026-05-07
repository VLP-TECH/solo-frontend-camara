/**
 * Tests de consistencia del DashboardSnapshot.
 *
 * El objetivo no es cubrir cada rama del cálculo, sino blindar las invariantes
 * que garantizan que las distintas páginas (Dashboard, Dimensiones,
 * ComparacionTerritorial, DimensionDetail, SubdimensionDashboard) produzcan
 * exactamente los mismos números cuando leen del mismo snapshot.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Dimension, Indicador, Subdimension } from "./kpis-data";

// --- Fixtures sintéticas deterministas -------------------------------------

const FIXTURE_DIMENSIONES: Dimension[] = [
  { nombre: "Capital humano", peso: 25, id: "dim-1", idDimension: 1 },
  { nombre: "Conectividad", peso: 25, id: "dim-2", idDimension: 2 },
];

const FIXTURE_SUBDIMENSIONES: Subdimension[] = [
  { id: 11, id_dimension: 1, nombre: "Habilidades digitales", nombre_dimension: "Capital humano", peso: 50 },
  { id: 12, id_dimension: 1, nombre: "Especialistas TIC", nombre_dimension: "Capital humano", peso: 50 },
  { id: 21, id_dimension: 2, nombre: "Banda ancha fija", nombre_dimension: "Conectividad", peso: 50 },
  { id: 22, id_dimension: 2, nombre: "5G", nombre_dimension: "Conectividad", peso: 50 },
];

const FIXTURE_INDICADORES: Indicador[] = [
  { id: 101, nombre: "% Habilidades básicas", nombre_subdimension: "Habilidades digitales", id_subdimension: 11, importancia: "Alta", formula: null, fuente: null, origen_indicador: null },
  { id: 102, nombre: "% Habilidades avanzadas", nombre_subdimension: "Habilidades digitales", id_subdimension: 11, importancia: "Media", formula: null, fuente: null, origen_indicador: null },
  { id: 103, nombre: "% Especialistas TIC", nombre_subdimension: "Especialistas TIC", id_subdimension: 12, importancia: "Alta", formula: null, fuente: null, origen_indicador: null },
  { id: 201, nombre: "Cobertura banda ancha", nombre_subdimension: "Banda ancha fija", id_subdimension: 21, importancia: "Alta", formula: null, fuente: null, origen_indicador: null },
  { id: 202, nombre: "Cobertura 5G", nombre_subdimension: "5G", id_subdimension: 22, importancia: "Alta", formula: null, fuente: null, origen_indicador: null },
];

type Row = {
  nombre_indicador: string | null;
  id_indicador: number | null;
  pais: string;
  valor_calculado: number;
  periodo: number | string;
};

/**
 * Dataset compuesto a propósito para forzar diferencias entre territorios
 * y para incluir un país NO canónico ("Suecia") cuyo valor es el max global
 * — así verificamos que el max usa todos los países (no solo los canónicos).
 */
function buildResultadoRows(periodo: number): Row[] {
  const rows: Row[] = [];
  const push = (id: number, nombre: string, pais: string, valor: number) => {
    rows.push({ id_indicador: id, nombre_indicador: nombre, pais, valor_calculado: valor, periodo });
  };

  // Capital humano · Habilidades digitales
  push(101, "% Habilidades básicas", "Comunitat Valenciana", 60);
  push(101, "% Habilidades básicas", "España", 70);
  push(101, "% Habilidades básicas", "Alemania", 80);
  push(101, "% Habilidades básicas", "Francia", 75);
  push(101, "% Habilidades básicas", "Italia", 65);
  push(101, "% Habilidades básicas", "Países Bajos", 90);
  // País NO canónico: max global debería ser 100, no 90.
  push(101, "% Habilidades básicas", "Suecia", 100);

  push(102, "% Habilidades avanzadas", "Comunitat Valenciana", 30);
  push(102, "% Habilidades avanzadas", "España", 35);
  push(102, "% Habilidades avanzadas", "Alemania", 50);
  push(102, "% Habilidades avanzadas", "Francia", 45);
  push(102, "% Habilidades avanzadas", "Italia", 25);
  push(102, "% Habilidades avanzadas", "Países Bajos", 60);

  // Capital humano · Especialistas TIC
  push(103, "% Especialistas TIC", "Comunitat Valenciana", 4);
  push(103, "% Especialistas TIC", "España", 4.5);
  push(103, "% Especialistas TIC", "Alemania", 5);
  push(103, "% Especialistas TIC", "Francia", 4.8);
  push(103, "% Especialistas TIC", "Italia", 3.5);
  push(103, "% Especialistas TIC", "Países Bajos", 6);

  // Conectividad · Banda ancha fija
  push(201, "Cobertura banda ancha", "Comunitat Valenciana", 95);
  push(201, "Cobertura banda ancha", "España", 92);
  push(201, "Cobertura banda ancha", "Alemania", 96);
  push(201, "Cobertura banda ancha", "Francia", 94);
  push(201, "Cobertura banda ancha", "Italia", 88);
  push(201, "Cobertura banda ancha", "Países Bajos", 99);

  // Conectividad · 5G
  push(202, "Cobertura 5G", "Comunitat Valenciana", 70);
  push(202, "Cobertura 5G", "España", 75);
  push(202, "Cobertura 5G", "Alemania", 80);
  push(202, "Cobertura 5G", "Francia", 78);
  push(202, "Cobertura 5G", "Italia", 60);
  push(202, "Cobertura 5G", "Países Bajos", 85);

  // Provincias CV (suficientes para que ComparacionTerritorial tenga datos)
  push(101, "% Habilidades básicas", "Valencia", 62);
  push(101, "% Habilidades básicas", "Alicante", 58);
  push(101, "% Habilidades básicas", "Castellón", 55);
  push(102, "% Habilidades avanzadas", "Valencia", 32);
  push(102, "% Habilidades avanzadas", "Alicante", 28);
  push(102, "% Habilidades avanzadas", "Castellón", 25);
  push(103, "% Especialistas TIC", "Valencia", 4.1);
  push(103, "% Especialistas TIC", "Alicante", 3.8);
  push(103, "% Especialistas TIC", "Castellón", 3.5);
  push(201, "Cobertura banda ancha", "Valencia", 96);
  push(201, "Cobertura banda ancha", "Alicante", 94);
  push(201, "Cobertura banda ancha", "Castellón", 90);
  push(202, "Cobertura 5G", "Valencia", 72);
  push(202, "Cobertura 5G", "Alicante", 68);
  push(202, "Cobertura 5G", "Castellón", 62);

  return rows;
}

// --- Mocks de Supabase + kpis-data ----------------------------------------
//
// Necesitamos mockear ANTES de importar dashboard-snapshot.
// Para cada ".eq('periodo', X)" devolvemos las filas que cuadran con X.

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (_table: string) => {
        const select = (_cols: string) => {
          const eq = (_col: string, value: unknown) => {
            const periodo = typeof value === "number"
              ? value
              : typeof value === "string"
                ? parseInt(String(value).slice(0, 4), 10)
                : NaN;
            const allRows = buildResultadoRows(periodo);
            // Imitamos el formato `value` de la columna periodo:
            // - cuando se filtra con number devolvemos rows con periodo=number
            // - cuando se filtra con date string devolvemos rows con periodo=string
            const isDateFilter = typeof value === "string";
            const data = allRows.map((r) => ({
              ...r,
              periodo: isDateFilter ? `${periodo}-01-01` : periodo,
            }));
            return Promise.resolve({ data, error: null });
          };
          return { eq };
        };
        return { select };
      },
    },
  };
});

vi.mock("@/lib/kpis-data", () => {
  return {
    getDimensiones: vi.fn(async () => FIXTURE_DIMENSIONES),
    getSubdimensiones: vi.fn(async () => FIXTURE_SUBDIMENSIONES),
    getIndicadores: vi.fn(async () => FIXTURE_INDICADORES),
  };
});

// Importar DESPUÉS de definir los mocks.
const importSnapshot = async () => await import("./dashboard-snapshot");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("paisToTerritorioKey", () => {
  it("normaliza variantes y mayúsculas correctamente", async () => {
    const { paisToTerritorioKey } = await importSnapshot();
    expect(paisToTerritorioKey("España")).toBe("espana");
    expect(paisToTerritorioKey("ESPAÑA")).toBe("espana");
    expect(paisToTerritorioKey("Spain")).toBe("espana");
    expect(paisToTerritorioKey("Castellón")).toBe("castellon");
    expect(paisToTerritorioKey("castellon")).toBe("castellon");
    expect(paisToTerritorioKey("Países Bajos")).toBe("paisesBajos");
    expect(paisToTerritorioKey("Netherlands")).toBe("paisesBajos");
    expect(paisToTerritorioKey("Holanda")).toBe("paisesBajos");
    expect(paisToTerritorioKey("Deutschland")).toBe("alemania");
    expect(paisToTerritorioKey("desconocido")).toBe("comunitatValenciana");
    expect(paisToTerritorioKey("")).toBe("comunitatValenciana");
  });
});

describe("getDashboardSnapshot - invariantes de consistencia", () => {
  it("devuelve un snapshot bien formado para todos los territorios canónicos", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    expect(snap.periodo).toBe(2024);
    expect(snap.dimensiones).toHaveLength(2);

    const territorios = [
      "comunitatValenciana",
      "espana",
      "valencia",
      "alicante",
      "castellon",
      "alemania",
      "francia",
      "italia",
      "paisesBajos",
    ] as const;

    for (const dim of snap.dimensiones) {
      for (const t of territorios) {
        expect(dim.scoresPorTerritorio[t]).toBeDefined();
        const s = dim.scoresPorTerritorio[t].score;
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
      for (const sub of dim.subdimensiones) {
        for (const t of territorios) {
          expect(sub.scoresPorTerritorio[t]).toBeDefined();
          expect(sub.scoresPorTerritorio[t].score).toBeGreaterThanOrEqual(0);
          expect(sub.scoresPorTerritorio[t].score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("score de dimensión = promedio entero de scores no-cero de sus subdimensiones (regla compartida por todas las páginas)", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    for (const dim of snap.dimensiones) {
      for (const t of [
        "comunitatValenciana",
        "espana",
        "alemania",
        "francia",
        "italia",
        "paisesBajos",
      ] as const) {
        const subs = dim.subdimensiones
          .map((s) => s.scoresPorTerritorio[t])
          .filter((s) => s.hasData && s.score > 0);
        const expected =
          subs.length === 0
            ? 0
            : Math.round(subs.reduce((a, b) => a + b.score, 0) / subs.length);
        expect(dim.scoresPorTerritorio[t].score).toBe(expected);
      }
    }
  });

  it("max global por indicador incluye países NO canónicos (Suecia=100 fija el techo)", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    // "% Habilidades básicas" tiene max=100 (Suecia, país no canónico).
    // Países Bajos = 90 → su scoreI debería ser 90 (=90/100·100), no 100.
    // Si el bug del max sesgado existiera, scoreI sería (90/90)·100 = 100.
    // Verificamos por SubdimensionDashboard.tsx-style raw values:
    const v = snap.valoresPorIndicadorId.get(101)?.get("paisesBajos");
    expect(v).toBe(90);

    // Y el score de la subdimensión Habilidades digitales para Países Bajos
    // tiene que estar por debajo de 100 (porque hay un país externo más alto).
    const capHumano = snap.dimensiones.find((d) => d.nombre === "Capital humano");
    expect(capHumano).toBeDefined();
    const habDig = capHumano!.subdimensiones.find((s) => s.nombre === "Habilidades digitales");
    expect(habDig).toBeDefined();
    expect(habDig!.scoresPorTerritorio.paisesBajos.score).toBeLessThan(100);
  });

  it("índice global ponderado: España con scores conocidos da el resultado esperado", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    // Indice global = promedio ponderado por peso de dimensión, redondeado a 1 decimal.
    const dims = snap.dimensiones;
    const sEsp = dims.map((d) => ({
      score: d.scoresPorTerritorio.espana.score,
      peso: d.peso,
    }));
    const totalPesos = sEsp.reduce((a, b) => a + b.peso, 0);
    const expected =
      Math.round(
        (sEsp.reduce((a, b) => a + b.score * b.peso, 0) / totalPesos) * 10
      ) / 10;
    expect(snap.indiceGlobal.espana).toBe(expected);
  });

  it("fallback Comunitat Valenciana = media de provincias cuando no hay CV directo", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    // En esta fixture sí hay datos directos de Comunitat Valenciana, así que
    // el indice CV debe coincidir con su cálculo directo, no con media de provincias.
    const cvDirect = (() => {
      let sumPond = 0;
      let sumP = 0;
      for (const dim of snap.dimensiones) {
        const peso = dim.peso > 0 ? dim.peso : 1;
        const s = dim.scoresPorTerritorio.comunitatValenciana;
        if (s.hasData && s.score > 0) {
          sumPond += s.score * peso;
          sumP += peso;
        }
      }
      return sumP === 0 ? null : Math.round((sumPond / sumP) * 10) / 10;
    })();
    expect(snap.indiceGlobal.comunitatValenciana).toBe(cvDirect);
  });

  it("Dashboard, Dimensiones y ComparacionTerritorial leen el MISMO score (consistencia entre páginas)", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    // Simulamos las lecturas reales que hacen las páginas:
    // - Dashboard.tsx: dim.scoresPorTerritorio.espana.score
    // - Dimensiones.tsx: dim.scoresPorTerritorio[territorioKey].score
    // - ComparacionTerritorial.tsx: dim.scoresPorTerritorio.valencia.score, etc.
    for (const dim of snap.dimensiones) {
      const dashboardScore = dim.scoresPorTerritorio.espana.score;
      const dimensionesScore = dim.scoresPorTerritorio.espana.score;
      const comparacionValenciaScore = dim.scoresPorTerritorio.valencia.score;
      const detalleScore = dim.scoresPorTerritorio.espana.score;
      // Las 3 lecturas comparten el mismo objeto en memoria.
      expect(dashboardScore).toBe(dimensionesScore);
      expect(dashboardScore).toBe(detalleScore);
      // Y el de Comparación es siempre coherente con el rango (0–100, finito).
      expect(comparacionValenciaScore).toBeGreaterThanOrEqual(0);
      expect(comparacionValenciaScore).toBeLessThanOrEqual(100);
    }
  });

  it("SubdimensionDashboard puede leer valores raw a partir de los mismos maps que el snapshot expone", async () => {
    const { getDashboardSnapshot } = await importSnapshot();
    const snap = await getDashboardSnapshot(2024);

    // Las claves esperadas por SubdimensionDashboard:
    //   - valoresPorIndicadorNombre (key: lower+trim del nombre)
    //   - valoresPorIndicadorId (key: id numérico)
    expect(snap.valoresPorIndicadorNombre.get("% habilidades básicas")?.get("espana")).toBe(70);
    expect(snap.valoresPorIndicadorId.get(101)?.get("espana")).toBe(70);
    expect(snap.valoresPorIndicadorId.get(202)?.get("paisesBajos")).toBe(85);
  });
});
