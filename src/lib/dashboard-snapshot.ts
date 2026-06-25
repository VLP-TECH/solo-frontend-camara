/**
 * Snapshot agregado del dashboard.
 *
 * Conecta directamente a Supabase: 1 sola query a `resultado_indicadores`
 * filtrada por (periodo, países canónicos) + metadatos cacheados de
 * dimensiones / subdimensiones / indicadores. Todo el cálculo (índice global
 * por territorio, score por dimensión, top UE, comparativa de provincias,
 * datos del radar) se hace en memoria a partir de esa única query.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getDimensiones,
  getSubdimensiones,
  getIndicadores,
  type Dimension,
  type Subdimension,
  type Indicador,
} from "@/lib/kpis-data";

export type TerritorioKey =
  | "comunitatValenciana"
  | "espana"
  | "valencia"
  | "alicante"
  | "castellon"
  | "alemania"
  | "francia"
  | "italia"
  | "paisesBajos";

const TERRITORIOS_VARIANTES: Record<TerritorioKey, string[]> = {
  comunitatValenciana: ["Comunitat Valenciana", "Comunidad Valenciana", "CV"],
  espana: ["España", "Spain", "Esp"],
  valencia: ["Valencia"],
  alicante: ["Alicante"],
  castellon: ["Castellón", "Castellon"],
  alemania: ["Alemania", "Germany", "Deutschland"],
  francia: ["Francia", "France"],
  italia: ["Italia", "Italy"],
  paisesBajos: ["Países Bajos", "Netherlands", "Holanda"],
};

const TERRITORIO_DISPLAY: Record<TerritorioKey, string> = {
  comunitatValenciana: "Comunitat Valenciana",
  espana: "España",
  valencia: "Valencia",
  alicante: "Alicante",
  castellon: "Castellón",
  alemania: "Alemania",
  francia: "Francia",
  italia: "Italia",
  paisesBajos: "Países Bajos",
};

const TERRITORIOS_UE: TerritorioKey[] = [
  "espana",
  "alemania",
  "francia",
  "italia",
  "paisesBajos",
];

/**
 * Mapeo único y centralizado entre el "país" guardado en BD/UI y la
 * `TerritorioKey` canónica que usan los snapshots.
 *
 * Esta función es la única fuente de verdad para que TODAS las páginas
 * (Dashboard, Dimensiones, Comparación, DimensionDetail, Subdimensión)
 * resuelvan el mismo territorio a partir del mismo input.
 */
export const paisToTerritorioKey = (pais: string): TerritorioKey => {
  const v = (pais || "").trim().toLowerCase();
  if (v === "españa" || v === "spain" || v === "esp") return "espana";
  if (v === "valencia") return "valencia";
  if (v === "alicante") return "alicante";
  if (v === "castellón" || v === "castellon") return "castellon";
  if (v === "alemania" || v === "germany" || v === "deutschland") return "alemania";
  if (v === "francia" || v === "france") return "francia";
  if (v === "italia" || v === "italy") return "italia";
  if (
    v === "países bajos" ||
    v === "paises bajos" ||
    v === "netherlands" ||
    v === "holanda"
  ) {
    return "paisesBajos";
  }
  return "comunitatValenciana";
};

const PESO_IMPORTANCIA: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };
const pesoImportancia = (importancia: string | null): number =>
  importancia ? PESO_IMPORTANCIA[importancia.trim()] ?? 1 : 1;

const normalizeName = (s: string): string => (s || "").trim().toLowerCase();
const subdimensionMatch = (a: string, b: string) =>
  normalizeName(a) === normalizeName(b);

const periodoToYear = (p: unknown): number => {
  if (p == null) return 0;
  if (typeof p === "number" && !Number.isNaN(p)) return Math.floor(p);
  const y = parseInt(String(p).slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
};

interface ScoreDimensionTerritorio {
  /** Score 0-100 ponderado por importancia */
  score: number;
  /** True si pudimos calcular el score con al menos un indicador */
  hasData: boolean;
}

export interface DashboardSubdimensionRow {
  nombre: string;
  /** Número de indicadores agregados (con o sin valor) */
  indicadores: number;
  scoresPorTerritorio: Record<TerritorioKey, ScoreDimensionTerritorio>;
  /** Media UE de los scores por país UE */
  scoreUE: number;
  /** País UE con mayor score en esta subdimensión (display name) */
  topUEPais: string;
}

export interface DashboardDimensionRow {
  nombre: string;
  peso: number;
  scoresPorTerritorio: Record<TerritorioKey, ScoreDimensionTerritorio>;
  /** Score de Media UE: media aritmética de los scores de los 5 países UE */
  scoreUE: number;
  /** País UE con mayor score en esta dimensión (display name) */
  topUEPais: string;
  /** Score del país líder (TOP) entre la referencia UE en esta dimensión */
  topUEScore: number;
  /** Subdimensiones de la dimensión, con scores por territorio + UE */
  subdimensiones: DashboardSubdimensionRow[];
}

export interface DashboardSnapshot {
  periodo: number;
  dimensiones: DashboardDimensionRow[];
  /** Índice global ponderado por peso de dimensión, por territorio */
  indiceGlobal: Record<TerritorioKey, number | null>;
  /**
   * Valores RAW (no scores) leídos directamente de resultado_indicadores para
   * el periodo dado. Índices por nombre de indicador (lowercased+trim) y por
   * id_indicador. Útil para páginas que muestran valores absolutos.
   */
  valoresPorIndicadorNombre: Map<string, Map<TerritorioKey, number>>;
  valoresPorIndicadorId: Map<number, Map<TerritorioKey, number>>;
}

/** Mapa territorio→país-canónico (display) para usar como índice rápido */
function buildPaisCanonicoMap(): Map<string, TerritorioKey> {
  const m = new Map<string, TerritorioKey>();
  (Object.keys(TERRITORIOS_VARIANTES) as TerritorioKey[]).forEach((key) => {
    for (const variante of TERRITORIOS_VARIANTES[key]) {
      m.set(normalizeName(variante), key);
    }
  });
  return m;
}

type ResultadoRow = {
  nombre_indicador: string | null;
  id_indicador: number | null;
  pais: string | null;
  provincia: string | null;
  valor_calculado: unknown;
  periodo: unknown;
};

/**
 * Carga TODAS las filas de resultado_indicadores para el periodo (no filtramos
 * por país, así el max global por indicador cubre cualquier país que pueda haber
 * en la BD; esto preserva la consistencia con la lógica histórica de
 * `getMinMaxPorIndicador` y mantiene los scores idénticos a las páginas que ya
 * calculaban con todos los países).
 *
 * La columna `periodo` puede ser `integer` o `date`. Si solo una de las dos
 * queries devuelve datos, usamos la que funcionó.
 */
async function loadResultados(periodo: number): Promise<{
  porIndicadorTerritorio: Map<string, Map<TerritorioKey, number>>;
  porIdTerritorio: Map<number, Map<TerritorioKey, number>>;
  maxPorIndicadorNombre: Map<string, number>;
  maxPorIndicadorId: Map<number, number>;
  minPorIndicadorNombre: Map<string, number>;
  minPorIndicadorId: Map<number, number>;
}> {
  const paisToTerritorio = buildPaisCanonicoMap();
  const SELECT = "nombre_indicador, id_indicador, pais, provincia, valor_calculado, periodo";

  // PostgREST limita cada respuesta a 1000 filas. Algunos periodos (p. ej. 2024)
  // superan ese número, por lo que una única query truncaría datos silenciosamente
  // y el cálculo de min/max e índices saldría mal. Paginamos hasta agotar el periodo.
  const fetchAllByPeriodo = async (
    periodoFilter: number | string
  ): Promise<{ data: ResultadoRow[]; error: { message: string } | null }> => {
    const PAGE = 1000;
    const acc: ResultadoRow[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("resultado_indicadores")
        .select(SELECT)
        .eq("periodo", periodoFilter)
        .range(from, from + PAGE - 1);
      if (error) return { data: acc, error };
      const batch = (data as ResultadoRow[]) ?? [];
      acc.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }
    return { data: acc, error: null };
  };

  const [resInt, resDate] = await Promise.all([
    fetchAllByPeriodo(periodo),
    fetchAllByPeriodo(`${periodo}-01-01`),
  ]);

  const porIndicadorTerritorio = new Map<string, Map<TerritorioKey, number>>();
  const porIdTerritorio = new Map<number, Map<TerritorioKey, number>>();
  const maxPorIndicadorNombre = new Map<string, number>();
  const maxPorIndicadorId = new Map<number, number>();
  const minPorIndicadorNombre = new Map<string, number>();
  const minPorIndicadorId = new Map<number, number>();

  const rowsCombinadas: ResultadoRow[] = [];
  if (!resInt.error && Array.isArray(resInt.data)) {
    rowsCombinadas.push(...(resInt.data as ResultadoRow[]));
  }
  if (!resDate.error && Array.isArray(resDate.data)) {
    rowsCombinadas.push(...(resDate.data as ResultadoRow[]));
  }

  if (rowsCombinadas.length === 0) {
    if (resInt.error) console.warn("[dashboard-snapshot] periodo int error:", resInt.error.message);
    if (resDate.error) console.warn("[dashboard-snapshot] periodo date error:", resDate.error.message);
  }

  for (const row of rowsCombinadas) {
    const valor = Number(row.valor_calculado);
    if (!Number.isFinite(valor)) continue;
    if (periodoToYear(row.periodo) !== periodo) continue;

    const nombre = row.nombre_indicador
      ? normalizeName(String(row.nombre_indicador))
      : null;
    const id = row.id_indicador;

    if (nombre) {
      const prevMax = maxPorIndicadorNombre.get(nombre);
      if (prevMax == null || valor > prevMax) maxPorIndicadorNombre.set(nombre, valor);
      const prevMin = minPorIndicadorNombre.get(nombre);
      if (prevMin == null || valor < prevMin) minPorIndicadorNombre.set(nombre, valor);
    }
    if (id != null) {
      const prevMax = maxPorIndicadorId.get(id);
      if (prevMax == null || valor > prevMax) maxPorIndicadorId.set(id, valor);
      const prevMin = minPorIndicadorId.get(id);
      if (prevMin == null || valor < prevMin) minPorIndicadorId.set(id, valor);
    }

    // Los datos provinciales valencianos se guardan con pais='España' y
    // provincia='Valencia'/'Alicante'/'Castellón'. Si la provincia es uno de
    // esos territorios, atribuimos el dato a la provincia; si no, usamos el país.
    const provinciaTerr = paisToTerritorio.get(
      normalizeName(String(row.provincia ?? ""))
    );
    const territorio =
      provinciaTerr ?? paisToTerritorio.get(normalizeName(String(row.pais ?? "")));
    if (!territorio) continue;

    if (nombre) {
      let m = porIndicadorTerritorio.get(nombre);
      if (!m) {
        m = new Map();
        porIndicadorTerritorio.set(nombre, m);
      }
      const prev = m.get(territorio);
      if (prev == null || valor > prev) m.set(territorio, valor);
    }
    if (id != null) {
      let m = porIdTerritorio.get(id);
      if (!m) {
        m = new Map();
        porIdTerritorio.set(id, m);
      }
      const prev = m.get(territorio);
      if (prev == null || valor > prev) m.set(territorio, valor);
    }
  }

  return {
    porIndicadorTerritorio,
    porIdTerritorio,
    maxPorIndicadorNombre,
    maxPorIndicadorId,
    minPorIndicadorNombre,
    minPorIndicadorId,
  };
}

function getValorIndicador(
  ind: Indicador,
  territorio: TerritorioKey,
  porNombre: Map<string, Map<TerritorioKey, number>>,
  porId: Map<number, Map<TerritorioKey, number>>
): number | null {
  const byNombre = porNombre.get(normalizeName(ind.nombre));
  const v1 = byNombre?.get(territorio);
  if (v1 != null && Number.isFinite(v1)) return v1;
  if (ind.id != null) {
    const byId = porId.get(ind.id);
    const v2 = byId?.get(territorio);
    if (v2 != null && Number.isFinite(v2)) return v2;
  }
  return null;
}

function getMaxIndicador(
  ind: Indicador,
  maxPorNombre: Map<string, number>,
  maxPorId: Map<number, number>
): number | null {
  const v1 = maxPorNombre.get(normalizeName(ind.nombre));
  if (v1 != null && Number.isFinite(v1)) return v1;
  if (ind.id != null) {
    const v2 = maxPorId.get(ind.id);
    if (v2 != null && Number.isFinite(v2)) return v2;
  }
  return null;
}

function getMinIndicador(
  ind: Indicador,
  minPorNombre: Map<string, number>,
  minPorId: Map<number, number>
): number | null {
  const v1 = minPorNombre.get(normalizeName(ind.nombre));
  if (v1 != null && Number.isFinite(v1)) return v1;
  if (ind.id != null) {
    const v2 = minPorId.get(ind.id);
    if (v2 != null && Number.isFinite(v2)) return v2;
  }
  return null;
}

/**
 * Normalización Min-Max a 0-100 (metodología BRAINNOVA, doc 3.2.1):
 *   Score_i = ((Valor − Mín)/(Máx − Mín)) × 100. "Más es mejor".
 * Si Máx = Mín, devuelve 100 si hay valor, 0 si no.
 */
function scoreMinMax(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max <= min) return valor > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, ((valor - min) / (max - min)) * 100));
}

function calcularScoreSubdimensionPorTerritorio(
  indicadores: Indicador[],
  territorio: TerritorioKey,
  porNombre: Map<string, Map<TerritorioKey, number>>,
  porId: Map<number, Map<TerritorioKey, number>>,
  maxPorNombre: Map<string, number>,
  maxPorId: Map<number, number>,
  minPorNombre: Map<string, number>,
  minPorId: Map<number, number>
): ScoreDimensionTerritorio {
  let sumaPonderada = 0;
  let sumaPesos = 0;
  let usadosConDato = 0;
  for (const ind of indicadores) {
    const valor = getValorIndicador(ind, territorio, porNombre, porId);
    if (valor == null || !Number.isFinite(valor)) continue;
    const max = getMaxIndicador(ind, maxPorNombre, maxPorId) ?? (valor > 0 ? valor : 1);
    if (max <= 0) continue;
    const min = getMinIndicador(ind, minPorNombre, minPorId) ?? 0;
    const scoreI = scoreMinMax(valor, min, max);
    const peso = pesoImportancia(ind.importancia);
    sumaPonderada += scoreI * peso;
    sumaPesos += peso;
    usadosConDato++;
  }
  if (sumaPesos === 0 || usadosConDato === 0) {
    return { score: 0, hasData: false };
  }
  return {
    score: Math.min(100, Math.max(0, Math.round(sumaPonderada / sumaPesos))),
    hasData: true,
  };
}

/** Promedia scores de subdimensiones (solo las que tienen datos) → score dimensión */
function aggSubdimensionesADimension(
  scoresSub: ScoreDimensionTerritorio[]
): ScoreDimensionTerritorio {
  const conDato = scoresSub.filter((s) => s.hasData && s.score > 0);
  if (conDato.length === 0) return { score: 0, hasData: false };
  const promedio = conDato.reduce((a, b) => a + b.score, 0) / conDato.length;
  return { score: Math.round(promedio), hasData: true };
}

/**
 * Score de "Comunitat Valenciana" agregado a partir de sus provincias
 * (Valencia / Alicante / Castellón). En los datos no hay filas con
 * pais/provincia = "Comunitat Valenciana"; el territorio CV se reconstruye como
 * la media de las provincias con dato (igual criterio que el índice global).
 */
function aggProvinciasACV(
  scores: Record<TerritorioKey, ScoreDimensionTerritorio>
): ScoreDimensionTerritorio {
  const provincias: TerritorioKey[] = ["valencia", "alicante", "castellon"];
  const conDato = provincias
    .map((p) => scores[p])
    .filter((s) => s?.hasData && s.score > 0);
  if (conDato.length === 0) return { score: 0, hasData: false };
  const promedio = conDato.reduce((a, b) => a + b.score, 0) / conDato.length;
  return { score: Math.round(promedio), hasData: true };
}

/**
 * Calcula índice global ponderado por peso de dimensión.
 * Si para Comunitat Valenciana no hay datos directos, cae a la media de Valencia, Alicante, Castellón.
 */
function calcularIndiceGlobal(
  dimensiones: DashboardDimensionRow[],
  territorio: TerritorioKey
): number | null {
  let sumPesos = 0;
  let sumPonderada = 0;
  let conDato = 0;
  for (const dim of dimensiones) {
    const peso = dim.peso > 0 ? dim.peso : 1;
    const s = dim.scoresPorTerritorio[territorio];
    if (s?.hasData && s.score > 0) {
      sumPonderada += s.score * peso;
      sumPesos += peso;
      conDato++;
    }
  }
  if (conDato === 0 || sumPesos === 0) return null;
  return Math.round((sumPonderada / sumPesos) * 10) / 10;
}

/**
 * 1 sola query agregada a Supabase + cálculo en cliente con metadatos cacheados.
 */
export async function getDashboardSnapshot(periodo: number): Promise<DashboardSnapshot> {
  const [dimensiones, subdimensiones, indicadores, resultados] = await Promise.all([
    getDimensiones(),
    getSubdimensiones(),
    getIndicadores(),
    loadResultados(periodo),
  ]);

  const {
    porIndicadorTerritorio,
    porIdTerritorio,
    maxPorIndicadorNombre,
    maxPorIndicadorId,
    minPorIndicadorNombre,
    minPorIndicadorId,
  } = resultados;

  const dimensionesRows: DashboardDimensionRow[] = dimensiones.map((dim: Dimension) => {
    const subsDeDim: Subdimension[] = subdimensiones.filter(
      (sub) =>
        normalizeName(sub.nombre_dimension) === normalizeName(dim.nombre) ||
        (dim.idDimension != null &&
          sub.id_dimension != null &&
          sub.id_dimension === dim.idDimension)
    );
    const seen = new Set<string>();
    const subsUnicas = subsDeDim.filter((s) => {
      const k = normalizeName(s.nombre);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const subRows: DashboardSubdimensionRow[] = subsUnicas.map((sub) => {
      const indsSub = indicadores.filter(
        (ind) =>
          (ind.id_subdimension != null &&
            sub.id != null &&
            ind.id_subdimension === sub.id) ||
          subdimensionMatch(ind.nombre_subdimension, sub.nombre)
      );
      const scoresPorTerritorio: Record<TerritorioKey, ScoreDimensionTerritorio> = {} as Record<TerritorioKey, ScoreDimensionTerritorio>;
      (Object.keys(TERRITORIOS_VARIANTES) as TerritorioKey[]).forEach((key) => {
        scoresPorTerritorio[key] = calcularScoreSubdimensionPorTerritorio(
          indsSub,
          key,
          porIndicadorTerritorio,
          porIdTerritorio,
          maxPorIndicadorNombre,
          maxPorIndicadorId,
          minPorIndicadorNombre,
          minPorIndicadorId
        );
      });
      // Comunitat Valenciana = media de sus provincias cuando no hay dato directo.
      if (!scoresPorTerritorio.comunitatValenciana?.hasData) {
        scoresPorTerritorio.comunitatValenciana = aggProvinciasACV(scoresPorTerritorio);
      }
      const ueScoresSub = TERRITORIOS_UE.map((k) => scoresPorTerritorio[k]).filter(
        (s) => s.hasData && s.score > 0
      );
      const scoreUESub =
        ueScoresSub.length > 0
          ? Math.round(ueScoresSub.reduce((a, b) => a + b.score, 0) / ueScoresSub.length)
          : 0;
      let topUEPaisSub = "";
      let topUEScoreSub = -1;
      for (const k of TERRITORIOS_UE) {
        const s = scoresPorTerritorio[k];
        if (s?.hasData && s.score > topUEScoreSub) {
          topUEScoreSub = s.score;
          topUEPaisSub = TERRITORIO_DISPLAY[k];
        }
      }
      return {
        nombre: sub.nombre,
        indicadores: indsSub.length,
        scoresPorTerritorio,
        scoreUE: scoreUESub,
        topUEPais: topUEPaisSub,
      };
    });

    const scoresPorTerritorio: Record<TerritorioKey, ScoreDimensionTerritorio> =
      {} as Record<TerritorioKey, ScoreDimensionTerritorio>;
    (Object.keys(TERRITORIOS_VARIANTES) as TerritorioKey[]).forEach((key) => {
      scoresPorTerritorio[key] = aggSubdimensionesADimension(
        subRows.map((row) => row.scoresPorTerritorio[key])
      );
    });
    // Comunitat Valenciana = media de sus provincias cuando no hay dato directo.
    if (!scoresPorTerritorio.comunitatValenciana?.hasData) {
      scoresPorTerritorio.comunitatValenciana = aggProvinciasACV(scoresPorTerritorio);
    }

    const ueScores = TERRITORIOS_UE.map((k) => scoresPorTerritorio[k]).filter(
      (s) => s.hasData && s.score > 0
    );
    const scoreUE =
      ueScores.length > 0
        ? Math.round(ueScores.reduce((a, b) => a + b.score, 0) / ueScores.length)
        : 0;

    let topUEPais = "";
    let topUEScoreDim = -1;
    for (const k of TERRITORIOS_UE) {
      const s = scoresPorTerritorio[k];
      if (s?.hasData && s.score > topUEScoreDim) {
        topUEScoreDim = s.score;
        topUEPais = TERRITORIO_DISPLAY[k];
      }
    }

    return {
      nombre: dim.nombre,
      peso: Number(dim.peso) || 0,
      scoresPorTerritorio,
      scoreUE,
      topUEPais,
      topUEScore: topUEScoreDim >= 0 ? topUEScoreDim : 0,
      subdimensiones: subRows,
    };
  });

  const indiceGlobal = {} as Record<TerritorioKey, number | null>;
  (Object.keys(TERRITORIOS_VARIANTES) as TerritorioKey[]).forEach((key) => {
    indiceGlobal[key] = calcularIndiceGlobal(dimensionesRows, key);
  });

  if (indiceGlobal.comunitatValenciana == null) {
    const provincias: TerritorioKey[] = ["valencia", "alicante", "castellon"];
    const valores = provincias
      .map((p) => indiceGlobal[p])
      .filter((v): v is number => v != null);
    if (valores.length > 0) {
      indiceGlobal.comunitatValenciana =
        Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
    }
  }

  return {
    periodo,
    dimensiones: dimensionesRows,
    indiceGlobal,
    valoresPorIndicadorNombre: porIndicadorTerritorio,
    valoresPorIndicadorId: porIdTerritorio,
  };
}
