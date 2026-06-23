// Servicio de API para Brainnova Backend
import type {
  FiltrosGlobalesResponse,
  ResultadosResponse,
  BrainnovaScoreRequest,
  BrainnovaScoreResponse,
  DesgloseDimension,
} from './brainnova-types';
import { supabase } from '@/integrations/supabase/client';
import {
  getDimensiones,
  getSubdimensiones,
  getIndicadores,
  scoreIndicadorMinMax,
  type Dimension,
  type Subdimension,
  type Indicador,
} from '@/lib/kpis-data';

/** Formato de una fila del radar para Recharts (cv = territorio, ue = Media UE, topEu = Top Europa). */
export interface RadarDataRow {
  dimension: string;
  cv: number;
  ue: number;
  topEu: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Construye la URL completa para un endpoint
 */
const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Maneja errores de la API
 */
const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `Error ${response.status}: ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || errorMessage;
  } catch {
    // Si no se puede parsear el JSON, usar el mensaje por defecto
  }
  throw new Error(errorMessage);
};

/**
 * Obtiene la lista de indicadores disponibles
 * GET /api/v1/indicadores-disponibles
 * Fallback a Supabase si el backend no está disponible
 */
export const getIndicadoresDisponibles = async (): Promise<string[]> => {
  try {
    const response = await fetch(buildUrl('/api/v1/indicadores-disponibles'), {
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si el backend devuelve datos, usarlos
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    // Si el backend devuelve array vacío, intentar desde Supabase
    throw new Error('Backend returned empty data');
  } catch (error) {
    console.warn('Error fetching indicadores from backend, trying Supabase fallback:', error);
    
    // Fallback: obtener indicadores que tienen datos desde Supabase
    try {
      
      // Obtener indicadores únicos que tienen resultados
      const { data, error: supabaseError } = await supabase
        .from('resultado_indicadores')
        .select('nombre_indicador')
        .not('nombre_indicador', 'is', null);
      
      if (supabaseError) {
        console.error('Error fetching from Supabase:', supabaseError);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Obtener nombres únicos de indicadores
      const indicadoresUnicos = Array.from(
        new Set(data.map(item => item.nombre_indicador).filter(Boolean))
      ).sort();
      
      return indicadoresUnicos;
    } catch (supabaseError) {
      console.error('Error in Supabase fallback:', supabaseError);
      return [];
    }
  }
};

// --- Cálculo en cliente (sin backend) -------------------------------------
//
// La calculadora BRAINNOVA y los filtros se resuelven directamente contra
// `resultado_indicadores` en Supabase, aplicando la metodología del doc
// (normalización Min-Max + agregación ponderada). No se usa el backend Python.

const normNombre = (s: unknown): string => (s ?? '').toString().trim().toLowerCase();

const periodoYear = (p: unknown): number => {
  if (p == null) return 0;
  if (typeof p === 'number' && !Number.isNaN(p)) return Math.floor(p);
  const y = parseInt(String(p).slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
};

const PESO_IMPORTANCIA: Record<string, number> = { alta: 3, media: 2, baja: 1 };
const pesoImportancia = (importancia: string | null): number =>
  importancia ? PESO_IMPORTANCIA[normNombre(importancia)] ?? 1 : 1;

/** Valores de `pais` basura que no deben aparecer en filtros ni puntuar como referencia. */
const PAISES_EXCLUIDOS = new Set(['desconocido']);
const esPaisValido = (p: unknown): boolean => {
  const n = normNombre(p);
  return n !== '' && !PAISES_EXCLUIDOS.has(n);
};

interface ResultadoIndRow {
  nombre_indicador: string | null;
  id_indicador: number | null;
  pais: string | null;
  provincia: string | null;
  sector: string | null;
  tamano_empresa: string | null;
  valor_calculado: unknown;
  periodo: unknown;
}

const RI_SELECT =
  'nombre_indicador, id_indicador, pais, provincia, sector, tamano_empresa, valor_calculado, periodo';

/**
 * Trae TODAS las filas que cumplan el query, paginando para superar el límite
 * por defecto de 1000 filas de PostgREST. `makeQuery` debe devolver una query
 * nueva en cada llamada (porque `.range()` la consume).
 */
async function fetchAllRows<T>(makeQuery: () => any): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const out: T[] = [];
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error || !Array.isArray(data) || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

/**
 * Carga filas de `resultado_indicadores` para un periodo (la columna puede ser
 * `integer` o `date`, por eso se consultan ambas variantes y se fusionan),
 * con filtro opcional de sector / tamaño de empresa.
 */
async function fetchRowsParaPeriodo(
  periodo: number,
  opts?: { sector?: string; tamano?: string }
): Promise<ResultadoIndRow[]> {
  const make = (periodoVal: number | string) => () => {
    let q = supabase.from('resultado_indicadores').select(RI_SELECT).eq('periodo', periodoVal);
    if (opts?.sector) q = q.eq('sector', opts.sector);
    if (opts?.tamano) q = q.eq('tamano_empresa', opts.tamano);
    return q;
  };
  const [conInt, conDate] = await Promise.all([
    fetchAllRows<ResultadoIndRow>(make(periodo)),
    fetchAllRows<ResultadoIndRow>(make(`${periodo}-01-01`)),
  ]);
  return [...conInt, ...conDate].filter((r) => periodoYear(r.periodo) === periodo);
}

type FiltrosParams = {
  nombre_indicador?: string;
  pais?: string;
  periodo?: number;
  sector?: string;
  tamano?: string;
};

/**
 * Obtiene filtros globales (país / provincia / sector / tamaño / años) desde Supabase.
 *
 * Intenta primero la RPC `get_filtros_globales` (DISTINCT en servidor, 1 sola
 * consulta). Si la función aún no existe en la BD (migración no aplicada), cae a
 * la paginación cliente. Así funciona en ambos casos y se acelera al desplegar.
 */
export const getFiltrosGlobales = async (
  params?: FiltrosParams
): Promise<FiltrosGlobalesResponse> => {
  const vacio: FiltrosGlobalesResponse = {
    paises: [],
    provincias: [],
    sectores: [],
    tamanos_empresa: [],
    anios: [],
  };
  try {
    const { data, error } = await supabase.rpc('get_filtros_globales', {
      p_nombre_indicador: params?.nombre_indicador ?? null,
      p_pais: params?.pais ?? null,
      p_anio: params?.periodo ?? null,
      p_sector: params?.sector ?? null,
      p_tamano: params?.tamano ?? null,
    });
    if (!error && data && typeof data === 'object') {
      const d = data as Partial<FiltrosGlobalesResponse>;
      return {
        paises: (d.paises ?? []).filter(esPaisValido),
        provincias: d.provincias ?? [],
        sectores: d.sectores ?? [],
        tamanos_empresa: d.tamanos_empresa ?? [],
        anios: d.anios ?? [],
      };
    }
    // RPC no disponible (función no desplegada u otro error) → fallback paginado.
    return await getFiltrosGlobalesPaginado(params);
  } catch (error) {
    console.error('Error fetching filtros globales:', error);
    return vacio;
  }
};

/** Fallback sin RPC: pagina `resultado_indicadores` y calcula los DISTINCT en cliente. */
async function getFiltrosGlobalesPaginado(
  params?: FiltrosParams
): Promise<FiltrosGlobalesResponse> {
  {
    const SELECT = 'pais, provincia, sector, tamano_empresa, periodo';
    const make = (periodoVal?: number | string) => () => {
      let q = supabase.from('resultado_indicadores').select(SELECT);
      if (params?.nombre_indicador) q = q.eq('nombre_indicador', params.nombre_indicador);
      if (params?.pais) q = q.eq('pais', params.pais);
      if (periodoVal != null) q = q.eq('periodo', periodoVal);
      if (params?.sector) q = q.eq('sector', params.sector);
      if (params?.tamano) q = q.eq('tamano_empresa', params.tamano);
      return q;
    };

    type FilaFiltro = {
      pais: string | null;
      provincia: string | null;
      sector: string | null;
      tamano_empresa: string | null;
      periodo: unknown;
    };

    let rows: FilaFiltro[];
    if (params?.periodo) {
      const [a, b] = await Promise.all([
        fetchAllRows<FilaFiltro>(make(params.periodo)),
        fetchAllRows<FilaFiltro>(make(`${params.periodo}-01-01`)),
      ]);
      rows = [...a, ...b].filter((r) => periodoYear(r.periodo) === params.periodo);
    } else {
      rows = await fetchAllRows<FilaFiltro>(make());
    }

    const uniqStr = (arr: (string | null)[]): string[] =>
      Array.from(
        new Set(arr.filter((v): v is string => v != null && String(v).trim() !== '').map(String))
      ).sort((x, y) => x.localeCompare(y, 'es'));

    return {
      paises: uniqStr(rows.map((r) => r.pais)).filter(esPaisValido),
      provincias: uniqStr(rows.map((r) => r.provincia)),
      sectores: uniqStr(rows.map((r) => r.sector)),
      tamanos_empresa: uniqStr(rows.map((r) => r.tamano_empresa)),
      anios: Array.from(new Set(rows.map((r) => periodoYear(r.periodo)).filter((y) => y > 0))).sort(
        (a, b) => b - a
      ),
    };
  }
}

/**
 * Obtiene resultados históricos para el gráfico
 * GET /api/v1/resultados
 * Fallback a Supabase si el backend no está disponible
 */
export const getResultados = async (params: {
  nombre_indicador: string;
  pais: string;
  sector?: string;
  provincia?: string;
}): Promise<ResultadosResponse[]> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('nombre_indicador', params.nombre_indicador);
    queryParams.append('pais', params.pais);
    
    if (params.sector) {
      queryParams.append('sector', params.sector);
    }
    if (params.provincia) {
      queryParams.append('provincia', params.provincia);
    }
    
    const url = buildUrl(`/api/v1/resultados?${queryParams.toString()}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si el backend devuelve datos, usarlos
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    // Si el backend devuelve array vacío, intentar desde Supabase
    throw new Error('Backend returned empty data');
  } catch (error) {
    console.warn('Error fetching resultados from backend, trying Supabase fallback:', error);
    
    // Fallback: obtener datos directamente desde Supabase
    try {
      
      let query = supabase
        .from('resultado_indicadores')
        .select('periodo, valor_calculado, pais, provincia, sector')
        .eq('nombre_indicador', params.nombre_indicador)
        .eq('pais', params.pais)
        .order('periodo', { ascending: true });
      
      if (params.provincia) {
        query = query.eq('provincia', params.provincia);
      } else {
        // Si no se especifica provincia, obtener datos nacionales (provincia null o vacía)
        query = query.or('provincia.is.null,provincia.eq.');
      }
      
      if (params.sector) {
        query = query.eq('sector', params.sector);
      }
      
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) {
        console.error('Error fetching from Supabase:', supabaseError);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Mapear datos de Supabase al formato esperado
      return data.map((item) => ({
        periodo: item.periodo,
        valor: typeof item.valor_calculado === 'number' 
          ? item.valor_calculado 
          : parseFloat(String(item.valor_calculado || 0)) || 0,
      }));
    } catch (supabaseError) {
      console.error('Error in Supabase fallback:', supabaseError);
      return [];
    }
  }
};

// Países de referencia UE (nombres canónicos tal y como se guardan en BD).
const PAISES_UE_REF = ['España', 'Alemania', 'Francia', 'Italia', 'Países Bajos'];

interface ScorePaisDim {
  score: number;
  hasData: boolean;
}

/** Índice rápido de filas por indicador (por id y por nombre normalizado). */
function indexarFilasPorIndicador(rows: ResultadoIndRow[]): {
  porId: Map<number, ResultadoIndRow[]>;
  porNombre: Map<string, ResultadoIndRow[]>;
} {
  const porId = new Map<number, ResultadoIndRow[]>();
  const porNombre = new Map<string, ResultadoIndRow[]>();
  for (const r of rows) {
    if (r.id_indicador != null) {
      const arr = porId.get(r.id_indicador) ?? [];
      arr.push(r);
      porId.set(r.id_indicador, arr);
    }
    if (r.nombre_indicador) {
      const k = normNombre(r.nombre_indicador);
      const arr = porNombre.get(k) ?? [];
      arr.push(r);
      porNombre.set(k, arr);
    }
  }
  return { porId, porNombre };
}

function filasDeIndicador(
  ind: Indicador,
  porId: Map<number, ResultadoIndRow[]>,
  porNombre: Map<string, ResultadoIndRow[]>
): ResultadoIndRow[] {
  if (ind.id != null && porId.has(ind.id)) return porId.get(ind.id)!;
  return porNombre.get(normNombre(ind.nombre)) ?? [];
}

/**
 * Valor agregado del indicador para un país. Si se indica provincia, usa esas
 * filas; si no, prioriza filas nacionales (provincia vacía). Cuando hay varias
 * filas (p. ej. distintos sectores sin filtrar) se promedian.
 */
function valorAgregadoPais(
  filasInd: ResultadoIndRow[],
  pais: string,
  provincia?: string
): number | null {
  let cand = filasInd.filter((r) => normNombre(r.pais) === normNombre(pais));
  if (provincia) {
    const conProv = cand.filter((r) => normNombre(r.provincia) === normNombre(provincia));
    if (conProv.length) cand = conProv;
  } else {
    const nacional = cand.filter((r) => r.provincia == null || String(r.provincia).trim() === '');
    if (nacional.length) cand = nacional;
  }
  const valores = cand.map((r) => Number(r.valor_calculado)).filter((v) => Number.isFinite(v));
  if (!valores.length) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Mín/Máx de referencia del indicador: agregado nacional de cada país disponible. */
function refMinMaxIndicador(filasInd: ResultadoIndRow[]): { min: number; max: number } | null {
  const paises = Array.from(new Set(filasInd.map((r) => normNombre(r.pais)).filter(esPaisValido)));
  const agregados: number[] = [];
  for (const p of paises) {
    const v = valorAgregadoPais(filasInd, p);
    if (v != null) agregados.push(v);
  }
  if (!agregados.length) return null;
  return { min: Math.min(...agregados), max: Math.max(...agregados) };
}

/** Score 0-100 de una subdimensión para un país (media ponderada por importancia). */
function scoreSubdimensionPais(
  indsSub: Indicador[],
  pais: string,
  provincia: string | undefined,
  porId: Map<number, ResultadoIndRow[]>,
  porNombre: Map<string, ResultadoIndRow[]>
): ScorePaisDim {
  let sumaPonderada = 0;
  let sumaPesos = 0;
  let usados = 0;
  for (const ind of indsSub) {
    const filasInd = filasDeIndicador(ind, porId, porNombre);
    const valor = valorAgregadoPais(filasInd, pais, provincia);
    if (valor == null) continue;
    const mm = refMinMaxIndicador(filasInd);
    const max = mm ? mm.max : valor > 0 ? valor : 1;
    if (max <= 0) continue;
    const min = mm ? mm.min : 0;
    const scoreI = scoreIndicadorMinMax(valor, min, max);
    const peso = pesoImportancia(ind.importancia);
    sumaPonderada += scoreI * peso;
    sumaPesos += peso;
    usados++;
  }
  if (sumaPesos === 0 || usados === 0) return { score: 0, hasData: false };
  return { score: Math.min(100, Math.max(0, Math.round(sumaPonderada / sumaPesos))), hasData: true };
}

/** Scores por dimensión (0-100) para un país: media de subdimensiones con dato. */
function scoresDimensionesPais(
  pais: string,
  provincia: string | undefined,
  dimensiones: Dimension[],
  subdimensiones: Subdimension[],
  indicadores: Indicador[],
  porId: Map<number, ResultadoIndRow[]>,
  porNombre: Map<string, ResultadoIndRow[]>
): Map<string, ScorePaisDim> {
  const out = new Map<string, ScorePaisDim>();
  for (const dim of dimensiones) {
    const subs = subdimensiones.filter(
      (sub) =>
        normNombre(sub.nombre_dimension) === normNombre(dim.nombre) ||
        (dim.idDimension != null && sub.id_dimension != null && sub.id_dimension === dim.idDimension)
    );
    const vistos = new Set<string>();
    const subScores: number[] = [];
    for (const sub of subs) {
      const k = normNombre(sub.nombre);
      if (vistos.has(k)) continue;
      vistos.add(k);
      const indsSub = indicadores.filter(
        (ind) =>
          (ind.id_subdimension != null && sub.id != null && ind.id_subdimension === sub.id) ||
          normNombre(ind.nombre_subdimension) === normNombre(sub.nombre)
      );
      const s = scoreSubdimensionPais(indsSub, pais, provincia, porId, porNombre);
      if (s.hasData && s.score > 0) subScores.push(s.score);
    }
    if (subScores.length === 0) out.set(dim.nombre, { score: 0, hasData: false });
    else
      out.set(dim.nombre, {
        score: Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length),
        hasData: true,
      });
  }
  return out;
}

/**
 * Calcula el Brainnova Score en cliente (sin backend), siguiendo la metodología
 * del doc: Min-Max por indicador → media ponderada a subdimensión → media a
 * dimensión → media ponderada por peso de dimensión al índice global.
 */
export const calculateBrainnovaScore = async (
  data: BrainnovaScoreRequest
): Promise<BrainnovaScoreResponse> => {
  const periodo = Number(data.periodo);
  const paisSel = (data.pais ?? '').trim();
  const provinciaSel = (data.provincia ?? '').trim() || undefined;

  const [dimensiones, subdimensiones, indicadores, rows] = await Promise.all([
    getDimensiones(),
    getSubdimensiones(),
    getIndicadores(),
    fetchRowsParaPeriodo(periodo, { sector: data.sector || undefined, tamano: data.tamano_empresa || undefined }),
  ]);

  const { porId, porNombre } = indexarFilasPorIndicador(rows);

  // Scores por dimensión del país seleccionado (si no hay país, queda todo a 0).
  const scoresSel = paisSel
    ? scoresDimensionesPais(paisSel, provinciaSel, dimensiones, subdimensiones, indicadores, porId, porNombre)
    : new Map<string, ScorePaisDim>();

  // Scores por dimensión de cada país UE de referencia (para media y top).
  const scoresUEPorPais = PAISES_UE_REF.map((p) =>
    scoresDimensionesPais(p, undefined, dimensiones, subdimensiones, indicadores, porId, porNombre)
  );

  const desglose_por_dimension: DesgloseDimension[] = dimensiones.map((dim) => {
    const sSel = scoresSel.get(dim.nombre)?.score ?? 0;
    const ueScores = scoresUEPorPais
      .map((m) => m.get(dim.nombre))
      .filter((s): s is ScorePaisDim => !!s && s.hasData && s.score > 0)
      .map((s) => s.score);
    const media_eu = ueScores.length ? Math.round(ueScores.reduce((a, b) => a + b, 0) / ueScores.length) : 0;
    const top_eu = ueScores.length ? Math.max(...ueScores) : 0;
    return {
      dimension: dim.nombre,
      score_valencia: sSel,
      score_media_eu: media_eu,
      score_top_eu: top_eu,
      peso_configurado: Number(dim.peso) || 0,
    };
  });

  // Índice global = media ponderada por peso de dimensión (solo dimensiones con dato).
  let sumPond = 0;
  let sumPesos = 0;
  for (const dim of dimensiones) {
    const s = scoresSel.get(dim.nombre);
    const peso = Number(dim.peso) > 0 ? Number(dim.peso) : 1;
    if (s?.hasData && s.score > 0) {
      sumPond += s.score * peso;
      sumPesos += peso;
    }
  }
  const brainnova_global_score = sumPesos > 0 ? Math.round((sumPond / sumPesos) * 10) / 10 : 0;

  return {
    brainnova_global_score,
    pais: paisSel,
    periodo,
    desglose_por_dimension,
  };
};

/**
 * Obtiene datos del radar (telaraña) desde el backend.
 * POST /api/v1/brainnova-score con solo periodo; devuelve desglose_por_dimension.
 *
 * La lógica interna del cálculo (Doc API punto 5) es responsabilidad del backend:
 * Benchmark Max_i(t), Normalización Score_i = (Valor_i/Max_i)×100, Agregación a
 * dimensión Score_D, Media europea Score_EU_D, Top Europa = 100. El frontend
 * solo consume los scores ya calculados (score_valencia, score_media_eu, score_top_eu).
 *
 * Mantiene 0.0 como número (no null) para que la línea del radar no se rompa (punto 8).
 */
export const getBrainnovaScoresRadar = async (
  periodo: number
): Promise<RadarDataRow[]> => {
  const res = await calculateBrainnovaScore({
    periodo,
    pais: '',
    provincia: '',
    sector: '',
    tamano_empresa: '',
  });
  const desglose: DesgloseDimension[] = res.desglose_por_dimension ?? [];
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
  return desglose.map((d) => ({
    dimension: d.dimension ?? '',
    cv: clamp(d.score_valencia),
    ue: clamp(d.score_media_eu),
    topEu: clamp(d.score_top_eu),
  }));
};

