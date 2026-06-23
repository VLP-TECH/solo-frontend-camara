/**
 * Tests del cálculo BRAINNOVA en cliente (sin backend).
 *
 * Verifican que `calculateBrainnovaScore` y `getFiltrosGlobales` calculan contra
 * Supabase usando la normalización Min-Max real + agregación ponderada del doc.
 * Los números esperados están calculados a mano (ver comentarios) para que un
 * retroceso a la fórmula vieja (Valor/Máx) haga fallar el test.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Dimension, Indicador, Subdimension } from "./kpis-data";

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
  pais: string | null;
  provincia: string | null;
  sector: string | null;
  tamano_empresa: string | null;
  valor_calculado: number;
  periodo: number;
};

function buildRows(periodo: number): Row[] {
  const rows: Row[] = [];
  const push = (id: number, nombre: string, pais: string, valor: number) => {
    rows.push({
      id_indicador: id,
      nombre_indicador: nombre,
      pais,
      provincia: null,
      sector: null,
      tamano_empresa: null,
      valor_calculado: valor,
      periodo,
    });
  };

  push(101, "% Habilidades básicas", "Comunitat Valenciana", 60);
  push(101, "% Habilidades básicas", "España", 70);
  push(101, "% Habilidades básicas", "Alemania", 80);
  push(101, "% Habilidades básicas", "Francia", 75);
  push(101, "% Habilidades básicas", "Italia", 65);
  push(101, "% Habilidades básicas", "Países Bajos", 90);
  push(101, "% Habilidades básicas", "Suecia", 100); // no canónico → fija el máx=100
  push(101, "% Habilidades básicas", "Castellón", 55); // fija el mín=55
  push(101, "% Habilidades básicas", "Desconocido", 70); // basura: dentro de [55,100], no cambia min/max

  push(102, "% Habilidades avanzadas", "España", 35);
  push(102, "% Habilidades avanzadas", "Alemania", 50);
  push(102, "% Habilidades avanzadas", "Francia", 45);
  push(102, "% Habilidades avanzadas", "Italia", 25);
  push(102, "% Habilidades avanzadas", "Países Bajos", 60);

  push(103, "% Especialistas TIC", "España", 4.5);
  push(103, "% Especialistas TIC", "Alemania", 5);
  push(103, "% Especialistas TIC", "Francia", 4.8);
  push(103, "% Especialistas TIC", "Italia", 3.5);
  push(103, "% Especialistas TIC", "Países Bajos", 6);

  push(201, "Cobertura banda ancha", "España", 92);
  push(201, "Cobertura banda ancha", "Alemania", 96);
  push(201, "Cobertura banda ancha", "Francia", 94);
  push(201, "Cobertura banda ancha", "Italia", 88);
  push(201, "Cobertura banda ancha", "Países Bajos", 99);

  push(202, "Cobertura 5G", "España", 75);
  push(202, "Cobertura 5G", "Alemania", 80);
  push(202, "Cobertura 5G", "Francia", 78);
  push(202, "Cobertura 5G", "Italia", 60);
  push(202, "Cobertura 5G", "Países Bajos", 85);

  return rows;
}

// Mock de Supabase con soporte de .eq() encadenado y .range() (paginación).
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      // RPC no desplegada en el mock → fuerza el fallback paginado.
      rpc: () => Promise.resolve({ data: null, error: { code: "PGRST202", message: "not found" } }),
      from: () => {
        const filters: [string, unknown][] = [];
        const builder: any = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push([col, val]);
            return builder;
          },
          range: (from: number, to: number) => {
            const periodoFilter = filters.find(([c]) => c === "periodo");
            const periodo = periodoFilter
              ? parseInt(String(periodoFilter[1]).slice(0, 4), 10)
              : 2024;
            let rows = buildRows(periodo);
            for (const [col, val] of filters) {
              if (col === "periodo") {
                rows = rows.filter((r) => String(r.periodo) === String(val));
              } else {
                rows = rows.filter((r) => (r as any)[col] === val);
              }
            }
            return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
          },
        };
        return builder;
      },
    },
  };
});

// Mantener la fórmula real; solo simular los metadatos.
vi.mock("@/lib/kpis-data", async (importActual) => {
  const actual = await importActual<typeof import("./kpis-data")>();
  return {
    ...actual,
    getDimensiones: vi.fn(async () => FIXTURE_DIMENSIONES),
    getSubdimensiones: vi.fn(async () => FIXTURE_SUBDIMENSIONES),
    getIndicadores: vi.fn(async () => FIXTURE_INDICADORES),
  };
});

const importApi = async () => await import("./brainnova-api");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calculateBrainnovaScore (cliente, Min-Max)", () => {
  it("calcula scores por dimensión y global para España con Min-Max real", async () => {
    const { calculateBrainnovaScore } = await importApi();
    const res = await calculateBrainnovaScore({ periodo: 2024, pais: "España" });

    expect(res.pais).toBe("España");
    expect(res.periodo).toBe(2024);

    const capHumano = res.desglose_por_dimension.find((d) => d.dimension === "Capital humano")!;
    const conectividad = res.desglose_por_dimension.find((d) => d.dimension === "Conectividad")!;

    // Capital humano (España):
    //   Habilidades digitales: ind101 (70-55)/(100-55)=33.33 [Alta=3] ;
    //                          ind102 (35-25)/(60-25)=28.57 [Media=2] → (100+57.14)/5=31
    //   Especialistas TIC:     ind103 (4.5-3.5)/(6-3.5)=40 → 40
    //   Dimensión = media(31, 40) = 35.5 → 36
    expect(capHumano.score_valencia).toBe(36);
    // Media UE = media(España 36, Alemania 61, Francia 51, Italia 13, PB 94) = 51 ; Top = 94
    expect(capHumano.score_media_eu).toBe(51);
    expect(capHumano.score_top_eu).toBe(94);

    // Conectividad (España): Banda ancha (92-88)/(99-88)=36 ; 5G (75-60)/(85-60)=60 → media=48
    expect(conectividad.score_valencia).toBe(48);

    // Índice global = media ponderada por peso (25/25) = (36+48)/2 = 42.0
    expect(res.brainnova_global_score).toBe(42);
  });

  it("sin país seleccionado devuelve índice 0 pero mantiene la referencia UE", async () => {
    const { calculateBrainnovaScore } = await importApi();
    const res = await calculateBrainnovaScore({ periodo: 2024, pais: "" });
    expect(res.brainnova_global_score).toBe(0);
    const capHumano = res.desglose_por_dimension.find((d) => d.dimension === "Capital humano")!;
    expect(capHumano.score_valencia).toBe(0);
    expect(capHumano.score_top_eu).toBe(94);
  });
});

describe("getFiltrosGlobales (cliente)", () => {
  it("devuelve países y años distintos desde Supabase", async () => {
    const { getFiltrosGlobales } = await importApi();
    const f = await getFiltrosGlobales();
    expect(f.paises).toContain("España");
    expect(f.paises).toContain("Países Bajos");
    expect(f.anios).toContain(2024);
    // "Desconocido" (país basura) no debe aparecer en el filtro.
    expect(f.paises).not.toContain("Desconocido");
  });
});
