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
  const paisVariants: (string | null)[] =
    filters.pais != null && String(filters.pais).trim() !== ""
      ? variacionesPaisConsulta(filters.pais)
      : [null];

  for (const paisVar of paisVariants) {
    for (const per of periodos) {
      let q = supabase
        .from("resultado_indicadores")
        .select("valor_calculado, periodo")
        .in("nombre_indicador", nombresConsulta);
      if (paisVar != null) q = q.eq("pais", paisVar);
      if (per != null) q = q.eq("periodo", per);
      const { data: byNombre } = await q.order("periodo", { ascending: false }).limit(10);
      if (byNombre && byNombre.length > 0) return byNombre;
    }
  }
  if (idIndicador == null) return [];
  for (const paisVar of paisVariants) {
    for (const per of periodos) {
      let qId = supabase
        .from("resultado_indicadores")
        .select("valor_calculado, periodo")
        .eq("id_indicador", idIndicador);
      if (paisVar != null) qId = qId.eq("pais", paisVar);
      if (per != null) qId = qId.eq("periodo", per);
      const { data: byId } = await qId.order("periodo", { ascending: false }).limit(10);
      if (byId && byId.length > 0) return byId;
    }
  }
  return [];
}

/** Variantes de `pais` en BD para un territorio mostrado en la UI (CV, Comunidad vs Comunitat, etc.). */
function variacionesPaisConsulta(pais: string): string[] {
  const t = String(pais || "").trim();
  if (!t) return [];
  const norm = normalizeName(t);
  if (norm === "comunitat valenciana" || norm === "comunidad valenciana" || norm === "cv") {
    return ["Comunitat Valenciana", "Comunidad Valenciana", "CV"];
  }
  if (norm === "valencia") return ["Valencia", "Comunitat Valenciana", "Comunidad Valenciana"];
  if (norm === "alicante") return ["Alicante"];
  if (norm === "castellon" || norm === "castellón") return ["Castellón", "Castellon"];
  if (norm === "espana" || norm === "españa" || norm === "spain") return ["España", "Spain"];
  return [t];
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

/**
 * Normalización Min-Max a escala 0-100 (metodología BRAINNOVA, doc 3.2.1):
 *   Score_i = ((Valor_i − Mín_i) / (Máx_i − Mín_i)) × 100
 * Mín_i / Máx_i = mínimo y máximo del indicador en el conjunto de referencia
 * (territorios/países disponibles para ese indicador y periodo). "Más es mejor".
 * Si Máx = Mín (un único dato o todos iguales), devuelve 100 si hay valor, 0 si no.
 * NOTA: los indicadores inversos ("más es peor") aún no se invierten; ver doc 3.2.1.
 */
export function scoreIndicadorMinMax(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max <= min) return valor > 0 ? 100 : 0;
  const n = ((valor - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, n));
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

/** Caché en memoria (sesión) para dimensiones / subdimensiones / definición de indicadores.
 * Evita miles de lecturas repetidas al calcular el índice global por varios años y territorios. */
let _cacheDimensiones: Dimension[] | undefined;
let _cacheSubdimensiones: Subdimension[] | undefined;
let _cacheIndicadores: Indicador[] | undefined;

/** Invalida caché de metadatos (p. ej. tras editar dimensiones en admin). */
export function clearKpisMetadataCache(): void {
  _cacheDimensiones = undefined;
  _cacheSubdimensiones = undefined;
  _cacheIndicadores = undefined;
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
  if (_cacheDimensiones !== undefined) return _cacheDimensiones;
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
      const out = (data || []).map((dim) => ({
        nombre: dim.nombre,
        peso: dim.peso,
        id: dim.nombre.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[m] || m)),
        idDimension: undefined,
      }));
      _cacheDimensiones = out;
      return out;
    }

    if (error) throw error;

    const out = (data || []).map((dim) => ({
      nombre: dim.nombre,
      peso: dim.peso,
      id: dim.nombre.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[m] || m)),
      idDimension: (dim as { id?: number }).id,
    }));
    _cacheDimensiones = out;
    return out;
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
  if (_cacheSubdimensiones !== undefined) return _cacheSubdimensiones;
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
      const out = (fallback.data || []).map((s) => ({ ...s, id_dimension: undefined }));
      _cacheSubdimensiones = out;
      return out;
    }

    if (error) throw error;
    const out = data || [];
    _cacheSubdimensiones = out;
    return out;
  } catch (error) {
    console.error("Error fetching subdimensiones:", error);
    return [];
  }
}

/**
 * Obtiene todos los indicadores desde Supabase
 */
export async function getIndicadores(): Promise<Indicador[]> {
  if (_cacheIndicadores !== undefined) return _cacheIndicadores;
  try {
    let { data, error } = await supabase
      .from("definicion_indicadores")
      .select("id, id_subdimension, nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador, activo")
      .order("nombre");

    let out: Indicador[];

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
        out = (last || []).map(ind => ({ ...ind, activo: undefined, id_subdimension: (ind as { id_subdimension?: number }).id_subdimension }));
      } else {
        const hasIdSub = fallbackSelect.includes("id_subdimension");
        out = (dataFallback || []).map(ind => ({ ...ind, id_subdimension: hasIdSub ? (ind as { id_subdimension?: number }).id_subdimension : undefined }));
      }
    } else {
      out = data || [];
    }
    _cacheIndicadores = out;
    return out;
  } catch (error) {
    console.error("Error fetching indicadores:", error);
    return [];
  }
}

/**
 * Obtiene indicadores con datos agregados (valores, resultados, etc.)
 * @param opts Si se indica `pais` y/o `periodo`, el último valor y el conteo se limitan a ese contexto (misma lógica que resultados por territorio/año).
 */
export async function getIndicadoresConDatos(
  nombreDimension?: string,
  opts?: { pais?: string; periodo?: number }
): Promise<IndicadorConDatos[]> {
  try {
    const resultadoFilters: { pais?: string; periodo?: number } = {};
    if (opts?.pais != null && String(opts.pais).trim() !== "") {
      resultadoFilters.pais = String(opts.pais).trim();
    }
    if (opts?.periodo != null && !Number.isNaN(Number(opts.periodo))) {
      resultadoFilters.periodo = Math.floor(Number(opts.periodo));
    }
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
        // El "Último Valor" se toma de España (referencia nacional) por defecto.
        // Sin filtro de país cogía la 1ª fila del último año = un país arbitrario
        // (p. ej. "Uso regular de Internet" mostraba 21.01 —máx UE— en vez de 11.37).
        const valorFilters = { ...resultadoFilters, pais: resultadoFilters.pais ?? "España" };
        let resultadosRows = await fetchResultadoIndicador(
          nombresConsulta,
          ind.id,
          valorFilters
        );
        // Fallback: si no hay dato de España, usar el último disponible (cualquier país)
        // para no marcar como vacío un indicador que sí tiene datos en otros territorios.
        if (resultadosRows.length === 0 && resultadoFilters.pais == null) {
          resultadosRows = await fetchResultadoIndicador(nombresConsulta, ind.id, resultadoFilters);
        }
        const resultados = resultadosRows.length > 0 ? [resultadosRows[0]] : null;

        let count: number | null = null;
        let countQ = supabase
          .from("resultado_indicadores")
          .select("id", { count: "exact", head: true })
          .in("nombre_indicador", nombresConsulta);
        if (resultadoFilters.pais != null) {
          countQ = countQ.in("pais", variacionesPaisConsulta(resultadoFilters.pais));
        }
        if (resultadoFilters.periodo != null) {
          countQ = countQ.in("periodo", periodoFilterValues(resultadoFilters.periodo));
        }
        const { count: countByNombre } = await countQ;
        count = countByNombre ?? 0;
        if (count === 0 && ind.id != null) {
          let countIdQ = supabase
            .from("resultado_indicadores")
            .select("id", { count: "exact", head: true })
            .eq("id_indicador", ind.id);
          if (resultadoFilters.pais != null) {
            countIdQ = countIdQ.in("pais", variacionesPaisConsulta(resultadoFilters.pais));
          }
          if (resultadoFilters.periodo != null) {
            countIdQ = countIdQ.in("periodo", periodoFilterValues(resultadoFilters.periodo));
          }
          const { count: countById } = await countIdQ;
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
    const nombres = getIndicadorNombresParaConsulta(nombreIndicador);
    for (const paisVar of variacionesPaisConsulta(pais)) {
      // Descendente + reverse: los `limit` registros MÁS RECIENTES en orden
      // ascendente. Con ascending+limit, un indicador con histórico largo
      // devolvía solo los años antiguos y las gráficas recientes salían vacías.
      const { data, error } = await supabase
        .from("resultado_indicadores")
        .select("periodo, valor_calculado")
        .in("nombre_indicador", nombres)
        .eq("pais", paisVar)
        .order("periodo", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (data && data.length > 0) {
        return data
          .map((item) => ({
            periodo: periodoToYear(item.periodo),
            valor: Number(item.valor_calculado) || 0,
          }))
          .reverse();
      }
    }
    return [];
  } catch (error) {
    console.error("Error fetching datos históricos:", error);
    return [];
  }
}

export type IndicadorComparativaTerritorial = {
  /** Valor del territorio seleccionado (Comunitat Valenciana por defecto, o una provincia). */
  territorio: number | null;
  espana: number | null;
  topUE: number | null;
  /** Score Min-Max (0-100) del territorio y de España, normalizado contra el
   * mínimo/máximo del indicador entre todos los países en el año de referencia. */
  scoreTerritorio: number | null;
  scoreEspana: number | null;
  /** Unidad del valor mostrado (ej. "EUR", "% Empresas", "Nº de Empresas"). */
  unidad: string | null;
  /** True si el indicador solo tiene dato provincial (no hay valor nacional de
   * España). En ese caso España se muestra como "—" con explicación. */
  espanaSoloProvincial: boolean;
  /** Nº de países distintos con dato en el año de referencia del benchmark.
   * Si es 1, el Min-Max no tiene rango (máx=mín → 100%) y el score no es
   * comparable: la UI lo señala sin alterar el cálculo. */
  paisesBenchmark: number;
};

/** Territorios disponibles para la comparativa de KPIs: comunidad completa o cada provincia. */
export type ComparativaTerritorioKPIs =
  | "Comunitat Valenciana"
  | "Valencia"
  | "Castellón"
  | "Alicante";

export const COMPARATIVA_TERRITORIOS_KPIS: ComparativaTerritorioKPIs[] = [
  "Comunitat Valenciana",
  "Valencia",
  "Castellón",
  "Alicante",
];

/** Variaciones de nombre de país/provincia en BD para cada territorio de la comparativa. */
const COMPARATIVA_TERRITORIO_VARIATIONS: Record<string, string[]> = {
  "Comunitat Valenciana": ["Comunitat Valenciana", "Comunidad Valenciana", "CV"],
  Valencia: ["Valencia"],
  "Castellón": ["Castellón", "Castellon"],
  Alicante: ["Alicante"],
};

function variacionesTerritorioComparativa(territorio: string): string[] {
  return COMPARATIVA_TERRITORIO_VARIATIONS[territorio] ?? [territorio];
}

/**
 * Obtiene, para un conjunto de indicadores, el último valor disponible en el territorio
 * seleccionado (Comunitat Valenciana por defecto, o una provincia) y en España.
 * TOP UE se calcula como el máximo entre los países UE de referencia en el mismo período.
 */
export async function getComparativaIndicadoresKPIs(
  nombresIndicadores: string[],
  territorio: string = "Comunitat Valenciana"
): Promise<Record<string, IndicadorComparativaTerritorial>> {
  const out: Record<string, IndicadorComparativaTerritorial> = {};
  if (!nombresIndicadores?.length) return out;

  const uniqueNames = [...new Set(nombresIndicadores.filter(Boolean))];
  const chunkSize = 40; // evita querystrings excesivas en PostgREST
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueNames.length; i += chunkSize) {
    chunks.push(uniqueNames.slice(i, i + chunkSize));
  }

  const territorioVars = variacionesTerritorioComparativa(territorio);
  const territorioVarsNorm = territorioVars.map((v) => normalizeName(v));
  // Países UE (según seed/migraciones del proyecto; no usamos “Unión Europea” agregado).
  const paisesUE = ["Alemania", "Francia", "Italia", "Países Bajos"] as const;

  const esTerritorio = (pais: string) => territorioVarsNorm.includes(normalizeName(pais));
  const esEspana = (pais: string) => normalizeName(pais) === normalizeName("España");

  // Carga TODOS los países (sin filtro) para poder calcular el benchmark Min-Max
  // (mín/máx del indicador entre todos los países). Paginamos: PostgREST capa a 1000.
  const fetchChunkTodos = async (namesChunk: string[]) => {
    const PAGE = 1000;
    const acc: { nombre_indicador: string | null; pais: string | null; provincia: string | null; periodo: unknown; valor_calculado: unknown; unidad_display: string | null }[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("resultado_indicadores")
        .select("nombre_indicador, pais, provincia, periodo, valor_calculado, unidad_display")
        .in("nombre_indicador", namesChunk)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const batch = (data ?? []) as unknown as typeof acc;
      acc.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }
    return acc;
  };

  try {
    const rowsAll = await Promise.all(chunks.map(fetchChunkTodos));

    const byIndicador = new Map<
      string,
      Array<{ pais: string; provincia: string; year: number; value: number; unidad: string }>
    >();
    for (const rows of rowsAll) {
      for (const row of rows) {
        const indicador = String(row.nombre_indicador || "").trim();
        const pais = String(row.pais || "").trim();
        const provincia = String(row.provincia || "").trim();
        const year = periodoToYear(row.periodo);
        const value = Number(row.valor_calculado);
        if (!indicador || !Number.isFinite(value) || year <= 0) continue;
        const unidad = String(row.unidad_display || "").trim();
        const prev = byIndicador.get(indicador) ?? [];
        prev.push({ pais, provincia, year, value, unidad });
        byIndicador.set(indicador, prev);
      }
    }
    // Una provincia "real" (no nacional) es la que tiene provincia y no es "Desconocido".
    const esProvincial = (p: string) => {
      const n = normalizeName(p);
      return n !== "" && n !== "desconocido";
    };

    for (const name of uniqueNames) {
      const rows = byIndicador.get(name) ?? [];
      if (!rows.length) {
        out[name] = { territorio: null, espana: null, topUE: null, scoreTerritorio: null, scoreEspana: null, unidad: null, espanaSoloProvincial: false, paisesBenchmark: 0 };
        continue;
      }

      // “Período” de referencia del indicador en la comparativa:
      // tomamos el año máximo entre territorio/España (para que TOP UE sea el máximo UE
      // en el mismo período que el que estás comparando).
      const yearsVE = rows
        .filter((r) => esTerritorio(r.pais) || esEspana(r.pais))
        .map((r) => r.year);
      const chosenYear = yearsVE.length ? Math.max(...yearsVE) : 0;
      if (chosenYear <= 0) {
        out[name] = { territorio: null, espana: null, topUE: null, scoreTerritorio: null, scoreEspana: null, unidad: null, espanaSoloProvincial: false, paisesBenchmark: 0 };
        continue;
      }
      const terrRow = rows.filter((r) => esTerritorio(r.pais) && r.year === chosenYear);
      const espRow = rows.filter((r) => esEspana(r.pais) && r.year === chosenYear);
      const ueRows = rows.filter(
        (r) => (paisesUE as readonly string[]).includes(r.pais) && r.year === chosenYear
      );

      const territorioValor = terrRow.length ? Math.max(...terrRow.map((r) => r.value)) : null;
      // "España" = valor NACIONAL (sin provincia o "Desconocido"). Si el indicador
      // solo tiene desglose provincial (p. ej. banda ancha), NO usamos el máximo
      // provincial (sería engañoso, p. ej. Madrid): dejamos España en null y marcamos
      // que solo hay dato provincial, para mostrar "—" con explicación.
      const espNacional = espRow.filter((r) => !esProvincial(r.provincia));
      const espRowMax = espNacional.length
        ? espNacional.reduce((a, b) => (b.value > a.value ? b : a))
        : null;
      const espana = espRowMax ? espRowMax.value : null;
      const espanaSoloProvincial = !espRowMax && espRow.some((r) => esProvincial(r.provincia));
      const topUE = ueRows.length ? Math.max(...ueRows.map((r) => r.value)) : null;
      // Unidad del valor mostrado (la de España; si no hay, la del territorio o
      // cualquier fila del año de referencia). Ej.: "EUR", "% Empresas", "Nº de Empresas".
      const unidad =
        espRowMax?.unidad ||
        terrRow.find((r) => r.unidad)?.unidad ||
        rows.find((r) => r.year === chosenYear && r.unidad)?.unidad ||
        null;

      // Benchmark Min-Max: mín/máx del indicador entre TODOS los países en el año de referencia.
      const valoresAnio = rows.filter((r) => r.year === chosenYear).map((r) => r.value);
      const minB = valoresAnio.length ? Math.min(...valoresAnio) : NaN;
      const maxB = valoresAnio.length ? Math.max(...valoresAnio) : NaN;
      const scoreTerritorio =
        territorioValor != null ? scoreIndicadorMinMax(territorioValor, minB, maxB) : null;
      const scoreEspana = espana != null ? scoreIndicadorMinMax(espana, minB, maxB) : null;
      const paisesBenchmark = new Set(
        rows.filter((r) => r.year === chosenYear && r.pais).map((r) => normalizeName(r.pais)),
      ).size;

      out[name] = { territorio: territorioValor, espana, topUE, scoreTerritorio, scoreEspana, unidad, espanaSoloProvincial, paisesBenchmark };
    }
    return out;
  } catch (error) {
    console.error("Error fetching comparativa indicadores KPIs:", error);
    for (const name of uniqueNames) {
      out[name] = { territorio: null, espana: null, topUE: null, scoreTerritorio: null, scoreEspana: null, unidad: null, espanaSoloProvincial: false, paisesBenchmark: 0 };
    }
    return out;
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
    const [subdimensiones, dimensionId] = await Promise.all([
      getSubdimensiones(),
      getDimensionIdByName(nombreDimension),
    ]);
    const subdimensionesFiltradas = filterSubdimensionesByDimension(
      subdimensiones,
      nombreDimension,
      dimensionId
    );
    const seenSub = new Set<string>();
    const subdimensionesUnicas = subdimensionesFiltradas.filter((sub) => {
      const key = normalizeName(sub.nombre ?? "");
      if (seenSub.has(key)) return false;
      seenSub.add(key);
      return true;
    });

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
          return {
            nombre: sub.nombre,
            score: 0,
            espana: 0,
            ue: 0,
            indicadores: 0,
          };
        }

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

            const valor = data?.[0]?.valor_calculado;
            if (valor !== null && valor !== undefined) {
              const numValor = Number(valor);
              if (isNaN(numValor)) return null;
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

        /** Score Min-Max (doc BRAINNOVA 3.2.1): Score_i = ((Valor_i − Mín_i)/(Máx_i − Mín_i))×100;
         * Score_D = Σ(Score_i × peso_i) / Σ(peso). Indicadores sin datos se excluyen.
         * Si no hay Mín/Máx de referencia (solo un territorio), Máx = valor y Mín = 0 → Score_i=100.
         */
        const calcularScorePonderado = (valores: (number | null)[]): number => {
          let sumaPonderada = 0;
          let sumaPesos = 0;
          indicadores.forEach((ind, idx) => {
            const valor = valores[idx];
            if (valor === null || valor === undefined || isNaN(valor)) return;
            const mm = minMaxGlobal.get(ind.nombre);
            const max = mm ? mm.max : (valor > 0 ? valor : 1);
            const min = mm ? mm.min : 0;
            const scoreI = scoreIndicadorMinMax(valor, min, max);
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
  try {
    const subdimensiones = await getSubdimensionesConScores(nombreDimension, pais, periodo);
    const conScore = subdimensiones.filter((sub) => sub.score != null && !isNaN(sub.score) && sub.score > 0);
    if (conScore.length === 0) return 0;

    const promedio = conScore.reduce((sum, sub) => sum + sub.score, 0) / conScore.length;
    return Math.round(promedio);
  } catch (error) {
    console.error("Error fetching dimension score:", error);
    return 0;
  }
}

export type TerritorioEvolucionDimensiones =
  | "Valencia"
  | "Castellón"
  | "Alicante"
  | "Comunitat Valenciana"
  | "España"
  | "Top UE";

export type DimensionesHistoricoEvolucionResult = {
  dimensionNombres: string[];
  rows: Array<{ year: number } & Record<string, number | null>>;
};

type ResultadoBulkRow = {
  id?: number | null;
  nombre_indicador: string | null;
  id_indicador: number | null;
  pais: string | null;
  periodo: unknown;
  valor_calculado: unknown;
};

const PAIS_VARIATIONS_DIM: Record<string, string[]> = {
  "Comunitat Valenciana": ["Comunitat Valenciana", "Comunidad Valenciana", "Valencia", "CV"],
  "Comunidad Valenciana": ["Comunitat Valenciana", "Comunidad Valenciana", "Valencia", "CV"],
  "España": ["España", "Spain", "Esp"],
  Valencia: ["Valencia", "Comunitat Valenciana"],
  Alicante: ["Alicante"],
  "Castellón": ["Castellón", "Castellon"],
  Alemania: ["Alemania", "Germany", "Deutschland"],
  Francia: ["Francia", "France"],
  Italia: ["Italia", "Italy"],
  "Países Bajos": ["Países Bajos", "Netherlands", "Holanda"],
};

const UE_SCORE_PAIS_GROUPS: readonly (readonly string[])[] = [
  ["España", "Spain", "Esp"],
  ["Alemania", "Germany", "Deutschland"],
  ["Francia", "France"],
  ["Italia", "Italy"],
  ["Países Bajos", "Netherlands", "Holanda"],
] as const;

function variacionesPaisDim(pais: string): string[] {
  const t = String(pais || "").trim();
  if (PAIS_VARIATIONS_DIM[t]) return PAIS_VARIATIONS_DIM[t];
  const norm = normalizeName(t);
  for (const [key, vars] of Object.entries(PAIS_VARIATIONS_DIM)) {
    if (normalizeName(key) === norm) return vars;
    if (vars.some((v) => normalizeName(v) === norm)) return vars;
  }
  return variacionesPaisConsulta(t);
}

function filaCoincideIndicador(row: ResultadoBulkRow, ind: Indicador): boolean {
  const aliases = getIndicadorNombresParaConsulta(ind.nombre);
  const nm = String(row.nombre_indicador ?? "").trim();
  if (nm && aliases.some((a) => normalizeName(a) === normalizeName(nm))) return true;
  if (ind.id != null && row.id_indicador != null) {
    const rid = Number(row.id_indicador);
    const iid = Number(ind.id);
    if (Number.isFinite(rid) && Number.isFinite(iid) && rid === iid) return true;
  }
  return false;
}

function pickValorTerritorio(
  rows: ResultadoBulkRow[],
  ind: Indicador,
  paisCandidates: string[],
  year: number
): number | null {
  const pool = rows.filter(
    (r) =>
      filaCoincideIndicador(r, ind) &&
      periodoToYear(r.periodo) === year &&
      paisCandidates.some((pv) => normalizeName(String(r.pais ?? "")) === normalizeName(pv))
  );
  pool.sort((a, b) => String(b.periodo ?? "").localeCompare(String(a.periodo ?? "")));
  for (const r of pool) {
    const v = Number(r.valor_calculado);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function minMaxIndicadorAno(rows: ResultadoBulkRow[], ind: Indicador, year: number): { min: number; max: number } | null {
  const vals: number[] = [];
  for (const r of rows) {
    if (periodoToYear(r.periodo) !== year) continue;
    if (!filaCoincideIndicador(r, ind)) continue;
    const v = Number(r.valor_calculado);
    if (Number.isFinite(v)) vals.push(v);
  }
  if (vals.length === 0) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function minMaxIndicadorTodosPeriodos(rows: ResultadoBulkRow[], ind: Indicador): { min: number; max: number } | null {
  const vals: number[] = [];
  for (const r of rows) {
    if (!filaCoincideIndicador(r, ind)) continue;
    const v = Number(r.valor_calculado);
    if (Number.isFinite(v)) vals.push(v);
  }
  if (vals.length === 0) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

const BULK_PAGE_SIZE = 2500;

async function fetchResultadosIndicadoresBulk(
  years: number[],
  _nombresIndicadores: string[],
  _idsIndicadores: number[]
): Promise<ResultadoBulkRow[]> {
  const sortedY = [...new Set(years)].filter((y) => Number.isFinite(y) && y > 0).sort((a, b) => a - b);
  if (sortedY.length === 0) return [];
  const yearSet = new Set(sortedY);
  const minY = sortedY[0];
  const maxY = sortedY[sortedY.length - 1];
  const rangeStart = `${minY}-01-01`;
  const rangeEnd = `${maxY}-12-31`;

  const acc: ResultadoBulkRow[] = [];

  const pullPaged = async (useDateStrings: boolean): Promise<boolean> => {
    acc.length = 0;
    // PostgREST/Supabase suele capar respuestas (p. ej. max-rows=1000). Hay que avanzar el offset
    // por las filas realmente devueltas; si no, se corta tras la primera página y faltan países
    // (p. ej. Valencia) aunque existan en la tabla.
    const MAX_PAGES = 500;
    for (let offset = 0, page = 0; page < MAX_PAGES; page += 1) {
      const to = offset + BULK_PAGE_SIZE - 1;
      let q = supabase
        .from("resultado_indicadores")
        .select("id, nombre_indicador, id_indicador, pais, periodo, valor_calculado")
        .not("nombre_indicador", "is", null)
        .neq("nombre_indicador", "")
        .order("id", { ascending: true })
        .range(offset, to);
      q = useDateStrings ? q.gte("periodo", rangeStart).lte("periodo", rangeEnd) : q.gte("periodo", minY).lte("periodo", maxY);
      const { data, error } = await q;
      if (error) {
        console.error(
          `fetchResultadosIndicadoresBulk (${useDateStrings ? "periodo fecha" : "periodo num"}):`,
          error.message
        );
        return false;
      }
      if (!data?.length) break;
      for (const r of data as ResultadoBulkRow[]) {
        if (!yearSet.has(periodoToYear(r.periodo))) continue;
        acc.push(r);
      }
      offset += data.length;
    }
    return acc.length > 0;
  };

  let ok = await pullPaged(true);
  if (!ok) {
    await pullPaged(false);
  }

  const seen = new Set<string>();
  const out: ResultadoBulkRow[] = [];
  for (const r of acc) {
    const k = `${r.id ?? ""}\0${r.nombre_indicador ?? ""}\0${r.id_indicador ?? ""}\0${r.pais ?? ""}\0${String(r.periodo)}\0${r.valor_calculado}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function scoreSubdimensionDesdeBulk(
  rows: ResultadoBulkRow[],
  indicadores: Indicador[],
  paisVarsTerritorio: string[],
  year: number
): number {
  if (!indicadores.length) return 0;

  const valoresTerritorio = indicadores.map((ind) =>
    pickValorTerritorio(rows, ind, paisVarsTerritorio, year)
  );

  const minMaxGlobal = new Map<string, { min: number; max: number }>();
  for (const ind of indicadores) {
    const mm = minMaxIndicadorAno(rows, ind, year);
    if (mm) minMaxGlobal.set(ind.nombre, mm);
  }
  const conValorSinMinMax = indicadores.filter(
    (ind, idx) => valoresTerritorio[idx] != null && !minMaxGlobal.has(ind.nombre)
  );
  for (const ind of conValorSinMinMax) {
    const mm = minMaxIndicadorTodosPeriodos(rows, ind);
    if (mm) minMaxGlobal.set(ind.nombre, mm);
  }

  const calcularScorePonderado = (valores: (number | null)[]): number => {
    let sumaPonderada = 0;
    let sumaPesos = 0;
    indicadores.forEach((ind, idx) => {
      const valor = valores[idx];
      if (valor === null || valor === undefined || isNaN(valor)) return;
      const mm = minMaxGlobal.get(ind.nombre);
      const max = mm ? mm.max : valor > 0 ? valor : 1;
      const min = mm ? mm.min : 0;
      const scoreI = scoreIndicadorMinMax(valor, min, max);
      const peso = pesoImportancia(ind.importancia);
      sumaPonderada += scoreI * peso;
      sumaPesos += peso;
    });
    if (sumaPesos === 0) return 0;
    return Math.round(sumaPonderada / sumaPesos);
  };

  const score = Math.min(100, Math.max(0, calcularScorePonderado(valoresTerritorio)));
  return score;
}

function dimensionScoreDesdeBulk(
  nombreDimension: string,
  paisTerritorio: string,
  year: number,
  rows: ResultadoBulkRow[],
  todosIndicadores: Indicador[],
  subdimensiones: Subdimension[],
  dimensionId: number | undefined
): number {
  const subsFiltradas = filterSubdimensionesByDimension(
    subdimensiones,
    nombreDimension,
    dimensionId
  );
  const seenSub = new Set<string>();
  const subdimensionesUnicas = subsFiltradas.filter((sub) => {
    const key = normalizeName(sub.nombre ?? "");
    if (seenSub.has(key)) return false;
    seenSub.add(key);
    return true;
  });

  const paisVars = variacionesPaisDim(paisTerritorio);
  const subScores: number[] = [];
  for (const sub of subdimensionesUnicas) {
    let indicadores = todosIndicadores.filter(
      (ind) =>
        (ind.id_subdimension != null && sub.id != null && ind.id_subdimension === sub.id) ||
        subdimensionMatch(ind.nombre_subdimension, sub.nombre)
    );
    const byCanonicalSub = new Map<string, Indicador>();
    for (const ind of indicadores) {
      const key = getIndicadorCanonicalKey(ind.nombre);
      if (!byCanonicalSub.has(key)) byCanonicalSub.set(key, ind);
    }
    indicadores = Array.from(byCanonicalSub.values());
    if (!indicadores.length) continue;
    const s = scoreSubdimensionDesdeBulk(rows, indicadores, paisVars, year);
    if (s > 0) subScores.push(s);
  }
  if (subScores.length === 0) return 0;
  return Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length);
}

/**
 * Scores por dimensión (0–100) para cada año, según territorio o Top UE (máximo entre países de referencia).
 * Una carga paginada de `resultado_indicadores` por rango de periodo (sin `.in` masivo de nombres).
 */
export async function getDimensionesHistoricoEvolucion(
  territorio: TerritorioEvolucionDimensiones,
  years: number[]
): Promise<DimensionesHistoricoEvolucionResult> {
  const dimensiones = await getDimensiones();
  const sortedYears = [...new Set(years)].sort((a, b) => a - b);
  const dimensionNombres = dimensiones.map((d) => d.nombre);

  if (!dimensiones.length) {
    return {
      dimensionNombres: [],
      rows: sortedYears.map((y) => ({ year: y })),
    };
  }

  const [subdimensiones, todosIndicadores, dimensionIds] = await Promise.all([
    getSubdimensiones(),
    getIndicadores(),
    Promise.all(dimensiones.map((d) => getDimensionIdByName(d.nombre))),
  ]);

  const bulkRows = await fetchResultadosIndicadoresBulk(sortedYears, [], []);

  const scoreDimAno = (nombreDim: string, pais: string, year: number): number => {
    const dimIdx = dimensiones.findIndex((d) => dimensionMatch(d.nombre, nombreDim));
    const dimId = dimIdx >= 0 ? dimensionIds[dimIdx] : undefined;
    return dimensionScoreDesdeBulk(nombreDim, pais, year, bulkRows, todosIndicadores, subdimensiones, dimId);
  };

  const rows = sortedYears.map((year) => {
    const entries = dimensiones.map((dim) => {
      const name = dim.nombre;
      if (territorio === "Top UE") {
        const scores = UE_SCORE_PAIS_GROUPS.map((grp) => scoreDimAno(name, grp[0], year));
        const pos = scores.filter((s) => s > 0);
        return [name, pos.length > 0 ? Math.max(...pos) : null] as const;
      }
      const s = scoreDimAno(name, territorio, year);
      return [name, s > 0 ? s : null] as const;
    });
    return { year, ...Object.fromEntries(entries) } as { year: number } & Record<string, number | null>;
  });

  return { dimensionNombres, rows };
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

/** Fila para gráfico de evolución: provincias CV, España y Top UE (máx. entre referencia UE por año). */
export type IndiceGlobalHistoricoComparativoRow = {
  year: number;
  /** Índice global para Comunitat Valenciana */
  comunitatValenciana: number | null;
  /** Índice global para provincia de Valencia */
  valencia: number | null;
  /** Índice global para provincia de Alicante */
  alicante: number | null;
  /** Índice global para provincia de Castellón */
  castellon: number | null;
  /** Índice global para España */
  espana: number | null;
  /** Índice global para Unión Europea (si no hay dato, se intenta Alemania como proxy) */
  europa: number | null;
  /** Mejor valor entre referencia UE (España, Alemania, Francia, Italia, Países Bajos) en ese año */
  topUE: number | null;
};

// getIndiceGlobalHistoricoComparativo vive ahora en dashboard-snapshot.ts:
// la serie del índice global se calcula con getDashboardSnapshot por año
// (Min-Max real), no con la media de valores brutos que mezclaba unidades.

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


// ── Indicadores con resultados ───────────────────────────────────────────────
let _cacheNombresConResultados: Set<string> | undefined;

/** Conjunto (nombres normalizados) de indicadores con al menos una fila en
 * resultado_indicadores. Una sola carga paginada por sesión (cacheada). */
export async function getNombresIndicadoresConResultados(): Promise<Set<string>> {
  if (_cacheNombresConResultados) return _cacheNombresConResultados;
  const PAGE = 1000;
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("resultado_indicadores")
      .select("nombre_indicador")
      .range(from, from + PAGE - 1);
    if (error) break;
    for (const r of (data || []) as { nombre_indicador: string | null }[]) {
      const n = normalizeName(String(r.nombre_indicador ?? ""));
      if (n) out.add(n);
    }
    if (!data || data.length < PAGE) break;
  }
  _cacheNombresConResultados = out;
  return out;
}

/** True si el indicador (o alguno de sus alias) tiene filas en resultado_indicadores. */
export function indicadorTieneResultados(nombre: string, conResultados: Set<string>): boolean {
  return getIndicadorNombresParaConsulta(nombre).some((n) => conResultados.has(normalizeName(n)));
}
