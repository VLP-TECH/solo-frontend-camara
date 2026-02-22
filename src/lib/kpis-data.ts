// Funciones para obtener datos de KPIs desde Supabase
import { supabase } from "@/integrations/supabase/client";

/** Normaliza nombre para comparación (insensible a mayúsculas y espacios) */
function normalizeName(name: string): string {
  return (name || "").trim().toLowerCase();
}

function dimensionMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

function subdimensionMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

/**
 * Indicadores que en BD pueden estar duplicados por variación de nombre (ej. Vhcn vs VHCN).
 * Clave canónica -> todos los nombres posibles en definiciones o resultado_indicadores.
 */
const INDICADOR_NOMBRES_ALIASES: Record<string, string[]> = {
  "Cobertura de redes de muy alta capacidad (VHCN)": [
    "Cobertura de redes de muy alta capacidad (VHCN)",
    "Cobertura De Redes VHCN",
    "Cobertura De Redes Vhcn",
  ],
};

function getIndicadorCanonicalKey(nombre: string): string {
  const n = normalizeName(nombre);
  for (const [canonical, aliases] of Object.entries(INDICADOR_NOMBRES_ALIASES)) {
    if (aliases.some((a) => normalizeName(a) === n)) return canonical;
  }
  return n;
}

function getIndicadorNombresParaConsulta(nombre: string): string[] {
  const key = getIndicadorCanonicalKey(nombre);
  return INDICADOR_NOMBRES_ALIASES[key] ?? [nombre];
}

/** Pesos de importancia según metodología Brainnova Score (Documentación técnica) */
const PESO_IMPORTANCIA: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };
function pesoImportancia(importancia: string | null): number {
  if (!importancia) return 1;
  return PESO_IMPORTANCIA[importancia.trim()] ?? 1;
}

/** Extrae año de periodo (date string o number) para uso en UI */
function periodoToYear(periodo: unknown): number {
  if (periodo == null) return 0;
  if (typeof periodo === "number" && !Number.isNaN(periodo)) return Math.floor(periodo);
  const s = String(periodo);
  const y = parseInt(s.slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
}

/** Valores de periodo para filtrar: BD puede tener columna integer (2024) o date (2024-01-01). */
function periodoFilterValues(periodo: number): (number | string)[] {
  return [periodo, `${periodo}-01-01`];
}

/**
 * Obtiene filas de resultado_indicadores para un indicador: primero por nombre_indicador,
 * si no hay datos y hay idIndicador, por id_indicador (vista definicion_indicadores usa definiciones_indicadores.id).
 * Acepta periodo como año (2024); filtra por 2024 o por "2024-01-01" por si la columna es date.
 */
async function fetchResultadoIndicador(
  nombresConsulta: string[],
  idIndicador: number | undefined,
  filters: { pais?: string; periodo?: number } = {}
): Promise<{ valor_calculado: unknown; periodo?: number }[]> {
  const periodos = filters.periodo != null ? periodoFilterValues(filters.periodo) : [null];
  for (const per of periodos) {
    let q = supabase
      .from("resultado_indicadores")
      .select("valor_calculado, periodo")
      .in("nombre_indicador", nombresConsulta);
    if (filters.pais != null) q = q.eq("pais", filters.pais);
    if (per != null) q = q.eq("periodo", per);
    const { data: byNombre } = await q.order("periodo", { ascending: false }).limit(10);
    if (byNombre && byNombre.length > 0) return byNombre;
  }
  if (idIndicador == null) return [];
  for (const per of periodos) {
    let qId = supabase
      .from("resultado_indicadores")
      .select("valor_calculado, periodo")
      .eq("id_indicador", idIndicador);
    if (filters.pais != null) qId = qId.eq("pais", filters.pais);
    if (per != null) qId = qId.eq("periodo", per);
    const { data: byId } = await qId.order("periodo", { ascending: false }).limit(10);
    if (byId && byId.length > 0) return byId;
  }
  return [];
}

/** Obtiene mínimo y máximo global por indicador (por nombre_indicador y opcionalmente por id_indicador).
 * Prueba periodo como entero y como fecha "YYYY-01-01" por si la columna es date. */
async function getMinMaxPorIndicador(
  nombresIndicadores: string[],
  periodo: number,
  options?: { fallbackTodosPeriodos?: boolean; indicadoresConId?: { nombre: string; id: number }[] }
): Promise<Map<string, { min: number; max: number }>> {
  const result = new Map<string, { min: number; max: number }>();
  const byIndicator = new Map<string, number[]>();
  const periodosToTry = periodoFilterValues(periodo);

  const addRows = (data: { nombre_indicador?: string | null; id_indicador?: number | null; valor_calculado: unknown }[] | null, idToNombre?: Map<number, string>) => {
    if (!data) return;
    for (const row of data) {
      const v = Number(row.valor_calculado);
      if (isNaN(v)) continue;
      const name = idToNombre ? (row.id_indicador != null ? idToNombre.get(row.id_indicador) : null) : row.nombre_indicador ?? null;
      if (name) {
        if (!byIndicator.has(name)) byIndicator.set(name, []);
        byIndicator.get(name)!.push(v);
      }
    }
  };

  if (nombresIndicadores.length > 0) {
    let data: { nombre_indicador: string | null; valor_calculado: unknown }[] | null = null;
    for (const per of periodosToTry) {
      const { data: d, error } = await supabase
        .from("resultado_indicadores")
        .select("nombre_indicador, valor_calculado")
        .in("nombre_indicador", nombresIndicadores)
        .eq("periodo", per);
      if (!error && d && d.length > 0) {
        data = d;
        break;
      }
    }
    if ((!data || data.length === 0) && options?.fallbackTodosPeriodos) {
      const { data: dataAll, error: errAll } = await supabase
        .from("resultado_indicadores")
        .select("nombre_indicador, valor_calculado")
        .in("nombre_indicador", nombresIndicadores);
      if (!errAll && dataAll && dataAll.length > 0) data = dataAll;
    }
    addRows(data ?? null);
  }

  if (options?.indicadoresConId?.length) {
    const ids = options.indicadoresConId.map((i) => i.id);
    const idToNombre = new Map(options.indicadoresConId.map((i) => [i.id, i.nombre]));
    let dataById: { id_indicador: number | null; valor_calculado: unknown }[] | null = null;
    for (const per of periodosToTry) {
      const res = await supabase
        .from("resultado_indicadores")
        .select("id_indicador, valor_calculado")
        .in("id_indicador", ids)
        .eq("periodo", per);
      if (res.data && res.data.length > 0) {
        dataById = res.data;
        break;
      }
    }
    if ((!dataById || dataById.length === 0) && options?.fallbackTodosPeriodos) {
      const res = await supabase.from("resultado_indicadores").select("id_indicador, valor_calculado").in("id_indicador", ids);
      dataById = res.data ?? null;
    }
    addRows(dataById, idToNombre);
  }

  byIndicator.forEach((vals, name) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    result.set(name, { min, max });
  });
  return result;
}

/** Normalización Min-Max: (valor - min) / (max - min). Usado donde se requiera rango 0-1. */
function normalizarMinMax(valor: number, min: number, max: number): number {
  if (max === min) return valor > 0 ? 1 : 0;
  const n = (valor - min) / (max - min);
  return Math.max(0, Math.min(1, n));
}

/**
 * Score por indicador según doc API Cámara: Score_i = (Valor_i / Max_i) × 100 ("más es mejor").
 * Max_i = máximo del indicador entre todos los países en ese año. Resultado en [0, 100].
 */
function scoreIndicadorPorMax(valor: number, max: number): number {
  if (max <= 0 || !Number.isFinite(max)) return 0;
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.min(100, (valor / max) * 100);
}

export interface Dimension {
  nombre: string;
  peso: number;
  id: string;
  /** Id numérico en BD (tabla dimensiones) para filtrar subdimensiones por id_dimension */
  idDimension?: number;
}

export interface Subdimension {
  id?: number;
  id_dimension?: number;
  nombre: string;
  nombre_dimension: string;
  peso: number;
}

export interface Indicador {
  id?: number;
  nombre: string;
  nombre_subdimension: string;
  id_subdimension?: number | null;
  importancia: string | null;
  formula: string | null;
  fuente: string | null;
  origen_indicador: string | null;
  activo?: boolean;
}

export interface IndicadorConDatos extends Indicador {
  dimension: string;
  subdimension: string;
  ultimoValor?: number;
  ultimoPeriodo?: number;
  totalResultados?: number;
  activo?: boolean;
}

/**
 * Obtiene la primera combinación (pais/provincia, periodo) que tenga datos en resultado_indicadores,
 * para mostrar por defecto en el dashboard (evitar provincia/año sin datos).
 * Primero prueba Valencia, Alicante, Castellón, Comunitat Valenciana; si no hay datos, devuelve
 * cualquier (pais, periodo) que exista en la base (ordenado por periodo más reciente).
 */
export async function getFirstAvailableProvinciaPeriodo(): Promise<{ provincia: string; periodo: number } | null> {
  try {
    const provincias: { key: string; display: string }[] = [
      { key: "Valencia", display: "Valencia" },
      { key: "Alicante", display: "Alicante" },
      { key: "Castellón", display: "Castellón" },
      { key: "Castellon", display: "Castellón" },
    ];
    for (const { key, display } of provincias) {
      const { data, error } = await supabase
        .from("resultado_indicadores")
        .select("periodo")
        .eq("pais", key)
        .not("nombre_indicador", "is", null)
        .neq("nombre_indicador", "")
        .order("periodo", { ascending: false })
        .limit(1);
      if (error || !data?.length) continue;
      const periodo = periodoToYear(data[0]?.periodo);
      if (periodo === 0) continue;
      return { provincia: display, periodo };
    }
    const { data: cv } = await supabase
      .from("resultado_indicadores")
      .select("periodo")
      .eq("pais", "Comunitat Valenciana")
      .not("nombre_indicador", "is", null)
      .neq("nombre_indicador", "")
      .order("periodo", { ascending: false })
      .limit(1);
    if (cv?.length && cv[0]?.periodo != null) {
      const p = periodoToYear(cv[0].periodo);
      if (p > 0) return { provincia: "Valencia", periodo: p };
    }
    // Cualquier (pais, periodo) que tenga datos, el más reciente primero
    const { data: anyRow, error: errAny } = await supabase
      .from("resultado_indicadores")
      .select("pais, periodo")
      .not("nombre_indicador", "is", null)
      .neq("nombre_indicador", "")
      .order("periodo", { ascending: false })
      .limit(1);
    if (!errAny && anyRow?.length && anyRow[0]?.pais != null && anyRow[0]?.periodo != null) {
      const periodo = periodoToYear(anyRow[0].periodo);
      if (periodo > 0) {
        return { provincia: String(anyRow[0].pais).trim(), periodo };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching first available provincia/periodo:", error);
    return null;
  }
}

/**
 * Obtiene listas de pais y periodo que existen en resultado_indicadores (con nombre_indicador relleno),
 * para rellenar los desplegables del dashboard con opciones que tengan datos.
 */
export async function getAvailablePaisYPeriodo(): Promise<{ paises: string[]; periodos: number[] }> {
  try {
    const [paisRes, periodoRes] = await Promise.all([
      supabase.from("resultado_indicadores").select("pais").not("nombre_indicador", "is", null).neq("nombre_indicador", ""),
      supabase.from("resultado_indicadores").select("periodo").not("nombre_indicador", "is", null).neq("nombre_indicador", ""),
    ]);
    const paises = [...new Set((paisRes.data || []).map((r) => String(r.pais).trim()).filter(Boolean))].sort();
    const periodos = [...new Set((periodoRes.data || []).map((r) => periodoToYear(r.periodo)).filter((n) => n > 0))].sort((a, b) => b - a);
    return { paises, periodos };
  } catch (error) {
    console.error("Error fetching available pais/periodo:", error);
    return { paises: [], periodos: [] };
  }
}

/**
 * Obtiene todas las dimensiones desde Supabase
 */
export async function getDimensiones(): Promise<Dimension[]> {
  try {
    let { data, error } = await supabase
      .from("dimensiones")
      .select("id, nombre, peso")
      .order("peso", { ascending: false });

    if (error && (error.message?.includes("id") || error.message?.includes("column"))) {
      const fallback = await supabase
        .from("dimensiones")
        .select("nombre, peso")
        .order("peso", { ascending: false });
      if (fallback.error) throw fallback.error;
      data = fallback.data;
      return (data || []).map((dim) => ({
        nombre: dim.nombre,
        peso: dim.peso,
        id: dim.nombre.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[m] || m)),
        idDimension: undefined,
      }));
    }

    if (error) throw error;

    return (data || []).map((dim) => ({
      nombre: dim.nombre,
      peso: dim.peso,
      id: dim.nombre.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[m] || m)),
      idDimension: (dim as { id?: number }).id,
    }));
  } catch (error) {
    console.error("Error fetching dimensiones:", error);
    return [];
  }
}

/**
 * Devuelve el id numérico de la dimensión en BD a partir del nombre (para filtrar subdimensiones por id_dimension).
 */
async function getDimensionIdByName(nombreDimension: string): Promise<number | undefined> {
  const dimensiones = await getDimensiones();
  const dim = dimensiones.find((d) => dimensionMatch(d.nombre, nombreDimension));
  return dim?.idDimension;
}

/**
 * Filtra subdimensiones que pertenecen a la dimensión indicada (por nombre_dimension o id_dimension).
 */
function filterSubdimensionesByDimension(
  subdimensiones: Subdimension[],
  nombreDimension: string,
  dimensionId: number | undefined
): Subdimension[] {
  return subdimensiones.filter(
    (sub) =>
      dimensionMatch(sub.nombre_dimension ?? "", nombreDimension) ||
      (dimensionId != null && sub.id_dimension != null && sub.id_dimension === dimensionId)
  );
}

/**
 * Obtiene todas las subdimensiones desde Supabase
 */
export async function getSubdimensiones(): Promise<Subdimension[]> {
  try {
    let { data, error } = await supabase
      .from("subdimensiones")
      .select("id, id_dimension, nombre, nombre_dimension, peso")
      .order("nombre_dimension, peso");

    if (error && (error.message?.includes("id_dimension") || error.message?.includes("column"))) {
      const fallback = await supabase
        .from("subdimensiones")
        .select("id, nombre, nombre_dimension, peso")
        .order("nombre_dimension, peso");
      if (fallback.error) throw fallback.error;
      return (fallback.data || []).map((s) => ({ ...s, id_dimension: undefined }));
    }

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching subdimensiones:", error);
    return [];
  }
}

/**
 * Obtiene todos los indicadores desde Supabase
 */
export async function getIndicadores(): Promise<Indicador[]> {
  try {
    let { data, error } = await supabase
      .from("definicion_indicadores")
      .select("id, id_subdimension, nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador, activo")
      .order("nombre");

    if (error) {
      const fallbackSelect = error.message?.includes("activo")
        ? "id, id_subdimension, nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador"
        : "id, nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador, activo";
      const { data: dataFallback, error: errFallback } = await supabase
        .from("definicion_indicadores")
        .select(fallbackSelect)
        .order("nombre");
      if (errFallback) {
        const lastSelect = "id, nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador";
        const { data: last, error: lastErr } = await supabase
          .from("definicion_indicadores")
          .select(lastSelect)
          .order("nombre");
        if (lastErr) throw lastErr;
        return (last || []).map(ind => ({ ...ind, activo: undefined, id_subdimension: (ind as { id_subdimension?: number }).id_subdimension }));
      }
      const hasIdSub = fallbackSelect.includes("id_subdimension");
      return (dataFallback || []).map(ind => ({ ...ind, id_subdimension: hasIdSub ? (ind as { id_subdimension?: number }).id_subdimension : undefined }));
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching indicadores:", error);
    return [];
  }
}

/**
 * Obtiene indicadores con datos agregados (valores, resultados, etc.)
 */
export async function getIndicadoresConDatos(
  nombreDimension?: string
): Promise<IndicadorConDatos[]> {
  try {
    // Obtener indicadores
    let indicadores = await getIndicadores();
    
    // Filtrar por dimensión si se especifica (por nombre de subdimensión o por id_subdimension)
    if (nombreDimension) {
      const [subdimensiones, dimensionId] = await Promise.all([
        getSubdimensiones(),
        getDimensionIdByName(nombreDimension),
      ]);
      const subdimensionesFiltradas = filterSubdimensionesByDimension(
        subdimensiones,
        nombreDimension,
        dimensionId
      );
      const nombresSub = subdimensionesFiltradas.map((s) => s.nombre);
      const idsSub = new Set(subdimensionesFiltradas.map((s) => s.id).filter((id): id is number => id != null));

      indicadores = indicadores.filter(
        (ind) =>
          nombresSub.some((s) => subdimensionMatch(s, ind.nombre_subdimension)) ||
          (ind.id_subdimension != null && idsSub.has(ind.id_subdimension))
      );
    }

    // Deduplicar indicadores por nombre canónico (ej. "Cobertura De Redes Vhcn" y "Cobertura De Redes VHCN" → uno solo)
    const byCanonical = new Map<string, typeof indicadores>();
    for (const ind of indicadores) {
      const key = getIndicadorCanonicalKey(ind.nombre);
      if (!byCanonical.has(key)) byCanonical.set(key, []);
      byCanonical.get(key)!.push(ind);
    }
    const indicadoresUnicos = Array.from(byCanonical.values()).map((group) => {
      const canonicalKey = getIndicadorCanonicalKey(group[0].nombre);
      const preferido = group.find((i) => i.nombre === canonicalKey) ?? group[0];
      return { ...preferido, _nombresConsulta: getIndicadorNombresParaConsulta(preferido.nombre) };
    });

    // Obtener subdimensiones para mapear a dimensiones (búsqueda por nombre normalizada)
    const subdimensiones = await getSubdimensiones();
    const getDimensionForSubdimension = (nombreSub: string) =>
      subdimensiones.find((s) => subdimensionMatch(s.nombre, nombreSub))?.nombre_dimension || "";

    console.log("📊 Mapeo de subdimensiones a dimensiones:", 
      subdimensiones.slice(0, 10).map((s) => `${s.nombre} → ${s.nombre_dimension}`)
    );

    // Obtener datos de resultados para cada indicador (por nombre_indicador o por id_indicador si la vista usa definiciones_indicadores)
    const indicadoresConDatos = await Promise.all(
      indicadoresUnicos.map(async (ind) => {
        const nombresConsulta = (ind as { _nombresConsulta?: string[] })._nombresConsulta ?? [ind.nombre];
        const resultadosRows = await fetchResultadoIndicador(nombresConsulta, ind.id, {});
        const resultados = resultadosRows.length > 0 ? [resultadosRows[0]] : null;

        let count: number | null = null;
        const { count: countByNombre } = await supabase
          .from("resultado_indicadores")
          .select("id", { count: "exact", head: true })
          .in("nombre_indicador", nombresConsulta);
        count = countByNombre ?? 0;
        if (count === 0 && ind.id != null) {
          const { count: countById } = await supabase
            .from("resultado_indicadores")
            .select("id", { count: "exact", head: true })
            .eq("id_indicador", ind.id);
          count = countById ?? 0;
        }

        const ultimoValor = resultados?.[0]?.valor_calculado != null
          ? Number(resultados[0].valor_calculado)
          : undefined;
        const ultimoPeriodo = resultados?.[0]?.periodo;

        const tieneDatos = ultimoValor !== undefined;
        const activo = ind.activo !== undefined ? ind.activo : tieneDatos;

        let dimension = getDimensionForSubdimension(ind.nombre_subdimension);
        if (!dimension && ind.id_subdimension != null) {
          const sub = subdimensiones.find((s) => s.id === ind.id_subdimension);
          dimension = sub?.nombre_dimension ?? (nombreDimension ?? "");
        }
        if (!dimension && nombreDimension) dimension = nombreDimension;

        if (!dimension && ind.nombre_subdimension) {
          console.warn(`⚠️ No se encontró dimensión para subdimensión: "${ind.nombre_subdimension}" (Indicador: ${ind.nombre})`);
        }

        const { _nombresConsulta: _, ...rest } = ind as typeof ind & { _nombresConsulta?: string[] };
        const canonicalKey = getIndicadorCanonicalKey(ind.nombre);
        const nombreDisplay = canonicalKey in INDICADOR_NOMBRES_ALIASES ? canonicalKey : ind.nombre;
        return {
          ...rest,
          nombre: nombreDisplay,
          dimension,
          subdimension: ind.nombre_subdimension,
          ultimoValor,
          ultimoPeriodo: ultimoPeriodo != null ? periodoToYear(ultimoPeriodo) : undefined,
          totalResultados: count || 0,
          activo,
        };
      })
    );

    // Agrupar por dimensión para verificar
    const indicadoresPorDimension = new Map<string, number>();
    indicadoresConDatos.forEach(ind => {
      if (ind.dimension) {
        indicadoresPorDimension.set(ind.dimension, (indicadoresPorDimension.get(ind.dimension) || 0) + 1);
      }
    });
    console.log("📈 Indicadores por dimensión:", Array.from(indicadoresPorDimension.entries()));

    // Ordenar: primero los activos (con datos), luego los inactivos
    indicadoresConDatos.sort((a, b) => {
      const aActivo = a.activo || a.ultimoValor !== undefined;
      const bActivo = b.activo || b.ultimoValor !== undefined;
      if (aActivo && !bActivo) return -1;
      if (!aActivo && bActivo) return 1;
      return 0;
    });

    return indicadoresConDatos;
  } catch (error) {
    console.error("Error fetching indicadores con datos:", error);
    return [];
  }
}

/**
 * Obtiene datos históricos de un indicador para gráficos
 */
export async function getDatosHistoricosIndicador(
  nombreIndicador: string,
  pais: string = "España",
  limit: number = 10
): Promise<Array<{ periodo: number; valor: number }>> {
  try {
    const { data, error } = await supabase
      .from("resultado_indicadores")
      .select("periodo, valor_calculado")
      .eq("nombre_indicador", nombreIndicador)
      .eq("pais", pais)
      .order("periodo", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((item) => ({
      periodo: periodoToYear(item.periodo),
      valor: Number(item.valor_calculado) || 0,
    }));
  } catch (error) {
    console.error("Error fetching datos históricos:", error);
    return [];
  }
}

/**
 * Obtiene datos agregados por subdimensión para una dimensión
 */
export async function getDatosPorSubdimension(
  nombreDimension: string,
  pais: string = "España"
): Promise<Array<{ subdimension: string; totalIndicadores: number; indicadoresConDatos: number }>> {
  try {
    const [subdimensiones, dimensionId] = await Promise.all([
      getSubdimensiones(),
      getDimensionIdByName(nombreDimension),
    ]);
    const subdimensionesFiltradas = filterSubdimensionesByDimension(
      subdimensiones,
      nombreDimension,
      dimensionId
    );

    const datos = await Promise.all(
      subdimensionesFiltradas.map(async (sub) => {
        const { count: totalIndicadores } = await supabase
          .from("definicion_indicadores")
          .select("nombre", { count: "exact", head: true })
          .eq("nombre_subdimension", sub.nombre);

        // Contar indicadores que tienen datos
        const { data: indicadores } = await supabase
          .from("definicion_indicadores")
          .select("nombre")
          .eq("nombre_subdimension", sub.nombre);

        let indicadoresConDatos = 0;
        if (indicadores) {
          const counts = await Promise.all(
            indicadores.map((ind) =>
              supabase
                .from("resultado_indicadores")
                .select("id", { count: "exact", head: true })
                .eq("nombre_indicador", ind.nombre)
                .eq("pais", pais)
            )
          );
          indicadoresConDatos = counts.filter((c) => (c.count || 0) > 0).length;
        }

        return {
          subdimension: sub.nombre,
          totalIndicadores: totalIndicadores || 0,
          indicadoresConDatos,
        };
      })
    );

    return datos;
  } catch (error) {
    console.error("Error fetching datos por subdimension:", error);
    return [];
  }
}

/**
 * Obtiene datos detallados de subdimensiones con scores y comparativas
 */
export async function getSubdimensionesConScores(
  nombreDimension: string,
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<Array<{
  nombre: string;
  score: number;
  espana: number;
  ue: number;
  indicadores: number;
}>> {
  try {
    console.log("getSubdimensionesConScores - nombreDimension:", nombreDimension, "pais:", pais, "periodo:", periodo);
    // #region agent log
    const logSub = (msg: string, data: Record<string, unknown>) => {
      const payload = { location: "kpis-data.ts:getSubdimensionesConScores", message: msg, data, timestamp: Date.now(), hypothesisId: "H2" };
      console.warn("[DEBUG]", JSON.stringify(payload));
      fetch("http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    };
    logSub("entry", { nombreDimension, pais, periodo });
    // #endregion
    const [subdimensiones, dimensionId] = await Promise.all([
      getSubdimensiones(),
      getDimensionIdByName(nombreDimension),
    ]);
    const subdimensionesFiltradas = filterSubdimensionesByDimension(
      subdimensiones,
      nombreDimension,
      dimensionId
    );
    // Unificar duplicados: misma subdimensión (mismo nombre normalizado) → una sola, mismo identificador lógico
    const seenSub = new Set<string>();
    const subdimensionesUnicas = subdimensionesFiltradas.filter((sub) => {
      const key = normalizeName(sub.nombre ?? "");
      if (seenSub.has(key)) return false;
      seenSub.add(key);
      return true;
    });
    // #region agent log
    logSub("after filter", { totalSubdimensiones: subdimensiones.length, filtradasLength: subdimensionesFiltradas.length, unicasLength: subdimensionesUnicas.length, filtradasNombres: subdimensionesUnicas.map((s) => s.nombre), nombreDimensionEnBD: subdimensiones.slice(0, 5).map((s) => s.nombre_dimension) });
    // #endregion
    console.log("Subdimensiones filtradas (únicas):", subdimensionesUnicas.length, subdimensionesUnicas.map(s => s.nombre));

    const todosIndicadores = await getIndicadores();

    const datos = await Promise.all(
      subdimensionesUnicas.map(async (sub) => {
        // Indicadores de esta subdimensión: por id_subdimension cuando exista, si no por nombre (insensible a mayúsculas)
        let indicadores = todosIndicadores.filter((ind) =>
          (ind.id_subdimension != null && sub.id != null && ind.id_subdimension === sub.id) ||
          subdimensionMatch(ind.nombre_subdimension, sub.nombre)
        );

        // Deduplicar por nombre canónico (ej. "Cobertura De Redes Vhcn" y "Cobertura De Redes VHCN" → uno)
        const byCanonicalSub = new Map<string, (typeof todosIndicadores)[0]>();
        for (const ind of indicadores) {
          const key = getIndicadorCanonicalKey(ind.nombre);
          if (!byCanonicalSub.has(key)) byCanonicalSub.set(key, ind);
        }
        indicadores = Array.from(byCanonicalSub.values());

        if (!indicadores || indicadores.length === 0) {
          // #region agent log
          logSub("sub sin indicadores", { subNombre: sub.nombre, nombresSubdimensionEnIndicadores: todosIndicadores.filter((ind) => ind.nombre_subdimension).map((i) => i.nombre_subdimension).slice(0, 10) });
          // #endregion
          console.log("No hay indicadores para subdimensión:", sub.nombre, "(nombres en BD:", todosIndicadores.filter(ind => ind.nombre_subdimension).map(i => i.nombre_subdimension).slice(0, 5), ")");
          return {
            nombre: sub.nombre,
            score: 0,
            espana: 0,
            ue: 0,
            indicadores: 0,
          };
        }

        console.log(`Subdimensión ${sub.nombre}: ${indicadores.length} indicadores encontrados`);

        // Obtener valores de los indicadores para el territorio (por nombre_indicador o id_indicador)
        const paisVariations: Record<string, string[]> = {
          "Comunitat Valenciana": ["Comunitat Valenciana", "Comunidad Valenciana", "Valencia", "CV"],
          "España": ["España", "Spain", "Esp"],
          "Valencia": ["Valencia", "Comunitat Valenciana"],
          "Alicante": ["Alicante"],
          "Castellón": ["Castellón", "Castellon"],
        };
        const variations = paisVariations[pais] || [pais];
        const valoresTerritorio = await Promise.all(
          indicadores.map(async (ind) => {
            const nombresInd = getIndicadorNombresParaConsulta(ind.nombre);
            let data: { valor_calculado: unknown; periodo?: number }[] = [];
            for (const paisVar of variations) {
              data = await fetchResultadoIndicador(nombresInd, ind.id, { pais: paisVar, periodo });
              if (data.length > 0) break;
            }

            if (data.length === 0) {
              console.log(`⚠️ No se encontraron datos para indicador "${ind.nombre}" en país "${pais}" (variaciones probadas: ${variations.join(", ")})`);
            } else {
              console.log(`✓ Datos encontrados para "${ind.nombre}": valor=${data[0].valor_calculado}, periodo=${data[0].periodo}`);
            }

            const valor = data?.[0]?.valor_calculado;
            if (valor !== null && valor !== undefined) {
              const numValor = Number(valor);
              if (isNaN(numValor)) {
                console.warn(`⚠️ Valor no numérico para "${ind.nombre}": ${valor}`);
                return null;
              }
              return numValor;
            }
            return null;
          })
        );

        // Obtener valores para España (por nombre_indicador o id_indicador)
        const espanaVariations = ["España", "Spain", "Esp"];
        const valoresEspana = await Promise.all(
          indicadores.map(async (ind) => {
            const nombresInd = getIndicadorNombresParaConsulta(ind.nombre);
            let data: { valor_calculado: unknown; periodo?: number }[] = [];
            for (const paisVar of espanaVariations) {
              data = await fetchResultadoIndicador(nombresInd, ind.id, { pais: paisVar, periodo });
              if (data.length > 0) break;
            }
            const valor = data?.[0]?.valor_calculado;
            if (valor !== null && valor !== undefined) {
              const numValor = Number(valor);
              if (isNaN(numValor)) return null;
              return numValor;
            }
            return null;
          })
        );

        // Min-Max global por indicador (por nombre y por id_indicador para vista definicion_indicadores)
        const todosNombresMinMax = [...new Set(indicadores.flatMap((i) => getIndicadorNombresParaConsulta(i.nombre)))];
        const indicadoresConId = indicadores.filter((i): i is typeof i & { id: number } => i.id != null).map((i) => ({ nombre: i.nombre, id: i.id! }));
        let minMaxRaw = await getMinMaxPorIndicador(todosNombresMinMax, periodo, {
          fallbackTodosPeriodos: true,
          indicadoresConId: indicadoresConId.length > 0 ? indicadoresConId : undefined,
        });
        const minMaxGlobal = new Map<string, { min: number; max: number }>();
        for (const ind of indicadores) {
          const aliases = getIndicadorNombresParaConsulta(ind.nombre);
          const mm = aliases.map((n) => minMaxRaw.get(n)).find(Boolean) ?? minMaxRaw.get(ind.nombre);
          if (mm) minMaxGlobal.set(ind.nombre, mm);
        }
        const conValorSinMinMax = indicadores
          .map((ind, idx) => (valoresTerritorio[idx] != null && !minMaxGlobal.has(ind.nombre) ? getIndicadorNombresParaConsulta(ind.nombre) : []))
          .flat();
        if (conValorSinMinMax.length > 0) {
          const minMaxFallback = await getMinMaxPorIndicador(conValorSinMinMax, periodo, {
            fallbackTodosPeriodos: true,
            indicadoresConId: indicadoresConId.length > 0 ? indicadoresConId : undefined,
          });
          for (const ind of indicadores) {
            const aliases = getIndicadorNombresParaConsulta(ind.nombre);
            const mm = aliases.map((n) => minMaxFallback.get(n)).find(Boolean);
            if (mm && !minMaxGlobal.has(ind.nombre)) minMaxGlobal.set(ind.nombre, mm);
          }
        }

        /** Score según doc API Cámara: Score_i = (Valor_i / Max_i)×100; Score_D = Σ(Score_i × peso_i) / Σ(peso).
         * Indicadores sin datos se excluyen. Si no hay Max_i (solo un territorio), se usa valor como max → Score_i=100.
         */
        const calcularScorePonderado = (valores: (number | null)[]): number => {
          let sumaPonderada = 0;
          let sumaPesos = 0;
          indicadores.forEach((ind, idx) => {
            const valor = valores[idx];
            if (valor === null || valor === undefined || isNaN(valor)) return;
            const mm = minMaxGlobal.get(ind.nombre);
            const max = mm ? mm.max : (valor > 0 ? valor : 1);
            const scoreI = scoreIndicadorPorMax(valor, max);
            const peso = pesoImportancia(ind.importancia);
            sumaPonderada += scoreI * peso;
            sumaPesos += peso;
          });
          if (sumaPesos === 0) return 0;
          return Math.round(sumaPonderada / sumaPesos);
        };

        const score = Math.min(100, Math.max(0, calcularScorePonderado(valoresTerritorio)));
        const espana = Math.min(100, Math.max(0, calcularScorePonderado(valoresEspana)));

        // Media UE según doc: Score_EU_D = media aritmética de los Score_D de cada país (score por país, luego media)
        const paisesUEConVariaciones: { variaciones: string[] }[] = [
          { variaciones: ["España", "Spain", "Esp"] },
          { variaciones: ["Alemania", "Germany", "Deutschland"] },
          { variaciones: ["Francia", "France"] },
          { variaciones: ["Italia", "Italy"] },
          { variaciones: ["Países Bajos", "Netherlands", "Holanda"] },
        ];
        const scoresPorPais: number[] = [];
        for (const { variaciones } of paisesUEConVariaciones) {
          const valoresPais = await Promise.all(
            indicadores.map(async (ind) => {
              const nombresInd = getIndicadorNombresParaConsulta(ind.nombre);
              let data: { valor_calculado: unknown }[] = [];
              for (const paisVar of variaciones) {
                data = await fetchResultadoIndicador(nombresInd, ind.id, { pais: paisVar, periodo });
                if (data.length > 0) break;
              }
              const valor = data?.[0]?.valor_calculado;
              if (valor !== null && valor !== undefined) {
                const numValor = Number(valor);
                return isNaN(numValor) ? null : numValor;
              }
              return null;
            })
          );
          const scorePais = calcularScorePonderado(valoresPais);
          if (scorePais > 0) scoresPorPais.push(scorePais);
        }
        const ue =
          scoresPorPais.length > 0
            ? Math.min(100, Math.max(0, Math.round(scoresPorPais.reduce((a, b) => a + b, 0) / scoresPorPais.length)))
            : 0;

        // #region agent log
        const nonNullTerritorio = valoresTerritorio.filter((v) => v != null).length;
        logSub("sub score computed", { subNombre: sub.nombre, indicadoresCount: indicadores.length, valoresTerritorioNonNull: nonNullTerritorio, score, espana, ue });
        // #endregion
        console.log(`Resultado para ${sub.nombre}: score=${score}, espana=${espana}, ue=${ue} (metodología Min-Max + ponderación importancia)`);

        return {
          nombre: sub.nombre,
          score,
          espana,
          ue,
          indicadores: indicadores.length,
        };
      })
    );

    return datos;
  } catch (error) {
    console.error("Error fetching subdimensiones con scores:", error);
    return [];
  }
}

/**
 * Obtiene el score global de una dimensión.
 * Solo se promedian las subdimensiones con score > 0; las que no se pueden calcular o son 0 no cuentan para el score de la dimensión.
 */
export async function getDimensionScore(
  nombreDimension: string,
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<number> {
  // #region agent log
  const log = (msg: string, data: Record<string, unknown>) => {
    const payload = { location: "kpis-data.ts:getDimensionScore", message: msg, data, timestamp: Date.now(), hypothesisId: "H1" };
    console.warn("[DEBUG]", JSON.stringify(payload));
    fetch("http://127.0.0.1:7242/ingest/a8e4c967-55a9-4bdb-a1c8-6bca4e1372c3", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
  };
  log("getDimensionScore entry", { nombreDimension, pais, periodo });
  // #endregion
  try {
    const subdimensiones = await getSubdimensionesConScores(nombreDimension, pais, periodo);
    const conScore = subdimensiones.filter((sub) => sub.score != null && !isNaN(sub.score) && sub.score > 0);
    // #region agent log
    log("getDimensionScore after subdimensiones", { totalSubdimensiones: subdimensiones.length, conScoreLength: conScore.length, scores: subdimensiones.map((s) => ({ n: s.nombre, score: s.score })) });
    // #endregion
    if (conScore.length === 0) return 0;

    const promedio = conScore.reduce((sum, sub) => sum + sub.score, 0) / conScore.length;
    return Math.round(promedio);
  } catch (error) {
    console.error("Error fetching dimension score:", error);
    return 0;
  }
}

/**
 * Obtiene el índice global BRAINNOVA para un territorio y periodo (consultando Supabase).
 * Es la media ponderada de los scores de las 7 dimensiones; si no hay pesos, usa media simple.
 * Para "Comunitat Valenciana", si no hay datos directos, usa la media de los índices de Valencia, Alicante y Castellón.
 */
export async function getIndiceGlobalTerritorio(
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<number | null> {
  try {
    const dimensiones = await getDimensiones();
    if (!dimensiones?.length) return null;
    const scores = await Promise.all(
      dimensiones.map((dim) => getDimensionScore(dim.nombre, pais, periodo))
    );
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const pesos = dimensiones.map((d) => (d.peso != null && Number(d.peso) > 0 ? Number(d.peso) : 1));
    const sumPesos = pesos.reduce((a, b) => a + b, 0);
    let ponderado = sumPesos > 0
      ? scores.reduce((acc, s, i) => acc + s * pesos[i], 0) / sumPesos
      : totalScore / dimensiones.length;
    // Si no hay datos para el territorio (ej. CV), usar media regional (media de las 3 provincias)
    if (ponderado === 0 && (pais === "Comunitat Valenciana" || pais === "Comunidad Valenciana" || pais === "CV")) {
      const provincias = ["Valencia", "Alicante", "Castellón"] as const;
      let sumaIndices = 0;
      let count = 0;
      for (const prov of provincias) {
        const s = await Promise.all(
          dimensiones.map((dim) => getDimensionScore(dim.nombre, prov, periodo))
        );
        const total = s.reduce((a, b) => a + b, 0);
        if (total > 0) {
          const idx = sumPesos > 0
            ? s.reduce((acc, v, i) => acc + v * pesos[i], 0) / sumPesos
            : total / dimensiones.length;
          sumaIndices += idx;
          count++;
        }
      }
      ponderado = count > 0 ? sumaIndices / count : 0;
    }
    if (ponderado === 0) return null;
    return Math.round(ponderado * 10) / 10;
  } catch (error) {
    console.error("Error fetching indice global territorio:", error);
    return null;
  }
}

/**
 * Obtiene los indicadores de una subdimensión específica
 */
export async function getIndicadoresPorSubdimension(
  nombreSubdimension: string,
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<IndicadorConDatos[]> {
  try {
    const indicadores = await getIndicadoresConDatos();
    return indicadores.filter(ind => ind.subdimension === nombreSubdimension);
  } catch (error) {
    console.error("Error fetching indicadores por subdimension:", error);
    return [];
  }
}

/**
 * Obtiene la distribución de indicadores por subdimensión dentro de una dimensión
 */
export async function getDistribucionPorSubdimension(
  nombreDimension: string,
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<Array<{
  nombre: string;
  porcentaje: number;
  totalIndicadores: number;
}>> {
  try {
    const [subdimensiones, dimensionId] = await Promise.all([
      getSubdimensiones(),
      getDimensionIdByName(nombreDimension),
    ]);
    const subdimensionesFiltradas = filterSubdimensionesByDimension(
      subdimensiones,
      nombreDimension,
      dimensionId
    );
    // Unificar duplicados por nombre normalizado (ej. "Acceso a Infraestructuras" y "Acceso a infraestructuras" → una)
    const seenKey = new Set<string>();
    const subdimensionesUnicas = subdimensionesFiltradas.filter((sub) => {
      const key = normalizeName(sub.nombre ?? "");
      if (seenKey.has(key)) return false;
      seenKey.add(key);
      return true;
    });

    const indicadores = await getIndicadoresConDatos();
    // Para cada subdimensión única, contar indicadores que coincidan con cualquiera de sus variantes (duplicados)
    const distribucion = await Promise.all(
      subdimensionesUnicas.map(async (sub) => {
        const nombresVariantes = subdimensionesFiltradas
          .filter((s) => normalizeName(s.nombre ?? "") === normalizeName(sub.nombre ?? ""))
          .map((s) => s.nombre);
        const indicadoresSub = indicadores.filter((ind) =>
          nombresVariantes.some((nom) => subdimensionMatch(ind.subdimension, nom))
        );
        return {
          nombre: sub.nombre,
          totalIndicadores: indicadoresSub.length,
          porcentaje: 0 // Se calculará después
        };
      })
    );

    const totalIndicadores = distribucion.reduce((sum, sub) => sum + sub.totalIndicadores, 0);
    
    return distribucion.map(sub => ({
      ...sub,
      porcentaje: totalIndicadores > 0 ? Math.round((sub.totalIndicadores / totalIndicadores) * 100) : 0
    }));
  } catch (error) {
    console.error("Error fetching distribucion por subdimension:", error);
    return [];
  }
}

