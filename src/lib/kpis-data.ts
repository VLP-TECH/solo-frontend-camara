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

/** Pesos de importancia según metodología Brainnova Score (Documentación técnica) */
const PESO_IMPORTANCIA: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };
function pesoImportancia(importancia: string | null): number {
  if (!importancia) return 1;
  return PESO_IMPORTANCIA[importancia.trim()] ?? 1;
}

/** Obtiene mínimo y máximo global por indicador (todos los territorios, opcionalmente filtrado por periodo) */
async function getMinMaxPorIndicador(
  nombresIndicadores: string[],
  periodo: number,
  options?: { fallbackTodosPeriodos?: boolean }
): Promise<Map<string, { min: number; max: number }>> {
  const result = new Map<string, { min: number; max: number }>();
  if (nombresIndicadores.length === 0) return result;

  let { data, error } = await supabase
    .from("resultado_indicadores")
    .select("nombre_indicador, valor_calculado")
    .in("nombre_indicador", nombresIndicadores)
    .eq("periodo", periodo);

  if (error || !data || data.length === 0) {
    if (options?.fallbackTodosPeriodos) {
      const { data: dataAll, error: errAll } = await supabase
        .from("resultado_indicadores")
        .select("nombre_indicador, valor_calculado")
        .in("nombre_indicador", nombresIndicadores);
      if (!errAll && dataAll && dataAll.length > 0) {
        data = dataAll;
      }
    } else {
      return result;
    }
  }

  if (!data) return result;

  const byIndicator = new Map<string, number[]>();
  for (const row of data) {
    const v = Number(row.valor_calculado);
    if (isNaN(v)) continue;
    const name = row.nombre_indicador;
    if (!byIndicator.has(name)) byIndicator.set(name, []);
    byIndicator.get(name)!.push(v);
  }
  byIndicator.forEach((vals, name) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    result.set(name, { min, max });
  });
  return result;
}

/** Normalización Min-Max: (valor - min) / (max - min). Si max===min, devuelve 1 si valor>0 sino 0. */
function normalizarMinMax(valor: number, min: number, max: number): number {
  if (max === min) return valor > 0 ? 1 : 0;
  const n = (valor - min) / (max - min);
  return Math.max(0, Math.min(1, n));
}

export interface Dimension {
  nombre: string;
  peso: number;
  id: string;
}

export interface Subdimension {
  nombre: string;
  nombre_dimension: string;
  peso: number;
}

export interface Indicador {
  nombre: string;
  nombre_subdimension: string;
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
      const periodo = Number(data[0]?.periodo);
      if (isNaN(periodo)) continue;
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
      return { provincia: "Valencia", periodo: Number(cv[0].periodo) };
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
      const periodo = Number(anyRow[0].periodo);
      if (!Number.isNaN(periodo)) {
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
    const periodos = [...new Set((periodoRes.data || []).map((r) => Number(r.periodo)).filter((n) => !Number.isNaN(n)))].sort((a, b) => b - a);
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
    const { data, error } = await supabase
      .from("dimensiones")
      .select("nombre, peso")
      .order("peso", { ascending: false });

    if (error) throw error;

    return (data || []).map((dim) => ({
      nombre: dim.nombre,
      peso: dim.peso,
      id: dim.nombre.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" }[m] || m)),
    }));
  } catch (error) {
    console.error("Error fetching dimensiones:", error);
    return [];
  }
}

/**
 * Obtiene todas las subdimensiones desde Supabase
 */
export async function getSubdimensiones(): Promise<Subdimension[]> {
  try {
    const { data, error } = await supabase
      .from("subdimensiones")
      .select("nombre, nombre_dimension, peso")
      .order("nombre_dimension, peso");

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
    // Intentar obtener con el campo activo, pero si falla, obtener sin él
    let { data, error } = await supabase
      .from("definicion_indicadores")
      .select("nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador, activo")
      .order("nombre");

    // Si hay error relacionado con el campo activo, intentar sin él
    if (error && error.message?.includes("activo")) {
      const { data: dataWithoutActivo, error: errorWithoutActivo } = await supabase
        .from("definicion_indicadores")
        .select("nombre, nombre_subdimension, importancia, formula, fuente, origen_indicador")
        .order("nombre");
      
      if (errorWithoutActivo) throw errorWithoutActivo;
      return (dataWithoutActivo || []).map(ind => ({ ...ind, activo: undefined }));
    }

    if (error) throw error;
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
    
    // Filtrar por dimensión si se especifica
    if (nombreDimension) {
      const subdimensiones = await getSubdimensiones();
      const subdimensionesFiltradas = subdimensiones
        .filter((sub) => dimensionMatch(sub.nombre_dimension, nombreDimension))
        .map((sub) => sub.nombre);
      
      indicadores = indicadores.filter((ind) =>
        subdimensionesFiltradas.some((s) => subdimensionMatch(s, ind.nombre_subdimension))
      );
    }

    // Obtener subdimensiones para mapear a dimensiones (búsqueda por nombre normalizada)
    const subdimensiones = await getSubdimensiones();
    const getDimensionForSubdimension = (nombreSub: string) =>
      subdimensiones.find((s) => subdimensionMatch(s.nombre, nombreSub))?.nombre_dimension || "";

    console.log("📊 Mapeo de subdimensiones a dimensiones:", 
      subdimensiones.slice(0, 10).map((s) => `${s.nombre} → ${s.nombre_dimension}`)
    );

    // Obtener datos de resultados para cada indicador
    const indicadoresConDatos = await Promise.all(
      indicadores.map(async (ind) => {
        // Obtener último valor y total de resultados
        const { data: resultados, error } = await supabase
          .from("resultado_indicadores")
          .select("valor_calculado, periodo")
          .eq("nombre_indicador", ind.nombre)
          .order("periodo", { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from("resultado_indicadores")
          .select("id", { count: "exact", head: true })
          .eq("nombre_indicador", ind.nombre);

        const ultimoValor = resultados?.[0]?.valor_calculado
          ? Number(resultados[0].valor_calculado)
          : undefined;
        
        // Si tiene datos pero no está activo en BD, el trigger lo activará automáticamente
        // Por ahora usamos el campo activo de la BD o determinamos por ultimoValor
        const tieneDatos = ultimoValor !== undefined;
        const activo = ind.activo !== undefined ? ind.activo : tieneDatos;

        const dimension = getDimensionForSubdimension(ind.nombre_subdimension);
        
        if (!dimension && ind.nombre_subdimension) {
          console.warn(`⚠️ No se encontró dimensión para subdimensión: "${ind.nombre_subdimension}" (Indicador: ${ind.nombre})`);
        }

        return {
          ...ind,
          dimension,
          subdimension: ind.nombre_subdimension,
          ultimoValor,
          ultimoPeriodo: resultados?.[0]?.periodo || undefined,
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
      periodo: item.periodo || 0,
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
    const subdimensiones = await getSubdimensiones();
    const subdimensionesFiltradas = subdimensiones.filter(
      (sub) => dimensionMatch(sub.nombre_dimension, nombreDimension)
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
    const subdimensiones = await getSubdimensiones();
    const subdimensionesFiltradas = subdimensiones.filter(
      (sub) => dimensionMatch(sub.nombre_dimension, nombreDimension)
    );
    // #region agent log
    logSub("after filter", { totalSubdimensiones: subdimensiones.length, filtradasLength: subdimensionesFiltradas.length, filtradasNombres: subdimensionesFiltradas.map((s) => s.nombre), nombreDimensionEnBD: subdimensiones.slice(0, 5).map((s) => s.nombre_dimension) });
    // #endregion
    console.log("Subdimensiones filtradas:", subdimensionesFiltradas.length, subdimensionesFiltradas.map(s => s.nombre));

    const todosIndicadores = await getIndicadores();

    const datos = await Promise.all(
      subdimensionesFiltradas.map(async (sub) => {
        // Indicadores de esta subdimensión (comparación insensible a mayúsculas)
        const indicadores = todosIndicadores.filter((ind) =>
          subdimensionMatch(ind.nombre_subdimension, sub.nombre)
        );

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

        // Obtener valores promedio de los indicadores para el territorio seleccionado
        const valoresTerritorio = await Promise.all(
          indicadores.map(async (ind) => {
            // Mapeo de nombres de país comunes
            const paisVariations: Record<string, string[]> = {
              "Comunitat Valenciana": ["Comunitat Valenciana", "Comunidad Valenciana", "Valencia", "CV"],
              "España": ["España", "Spain", "Esp"],
              "Valencia": ["Valencia", "Comunitat Valenciana"],
              "Alicante": ["Alicante"],
              "Castellón": ["Castellón", "Castellon"],
            };
            
            const variations = paisVariations[pais] || [pais];
            let data = null;
            
            // Intentar con cada variación del nombre del país
            for (const paisVar of variations) {
              // Primero intentar con el periodo exacto
              let { data: periodData } = await supabase
                .from("resultado_indicadores")
                .select("valor_calculado, periodo")
                .eq("nombre_indicador", ind.nombre)
                .eq("pais", paisVar)
                .eq("periodo", periodo)
                .limit(1);
              
              if (periodData && periodData.length > 0) {
                data = periodData;
                break;
              }
              
              // Si no hay datos para ese periodo, buscar el último periodo disponible
              const { data: lastData } = await supabase
                .from("resultado_indicadores")
                .select("valor_calculado, periodo")
                .eq("nombre_indicador", ind.nombre)
                .eq("pais", paisVar)
                .order("periodo", { ascending: false })
                .limit(1);
              
              if (lastData && lastData.length > 0) {
                data = lastData;
                break;
              }
            }
            
            if (!data || data.length === 0) {
              console.log(`⚠️ No se encontraron datos para indicador "${ind.nombre}" en país "${pais}" (variaciones probadas: ${variations.join(", ")})`);
            } else {
              const valor = data[0].valor_calculado;
              console.log(`✓ Datos encontrados para "${ind.nombre}": valor=${valor}, periodo=${data[0].periodo}`);
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

        // Obtener valores promedio para España
        const valoresEspana = await Promise.all(
          indicadores.map(async (ind) => {
            // Primero intentar con el periodo exacto
            let { data } = await supabase
              .from("resultado_indicadores")
              .select("valor_calculado, periodo")
              .eq("nombre_indicador", ind.nombre)
              .eq("pais", "España")
              .eq("periodo", periodo)
              .limit(1);
            
            // Si no hay datos para ese periodo, buscar el último periodo disponible
            if (!data || data.length === 0) {
              const { data: lastData } = await supabase
                .from("resultado_indicadores")
                .select("valor_calculado, periodo")
                .eq("nombre_indicador", ind.nombre)
                .eq("pais", "España")
                .order("periodo", { ascending: false })
                .limit(1);
              data = lastData;
            }
            
            const valor = data?.[0]?.valor_calculado;
            if (valor !== null && valor !== undefined) {
              const numValor = Number(valor);
              if (isNaN(numValor)) {
                return null;
              }
              return numValor;
            }
            return null;
          })
        );

        // Obtener valores promedio para UE (usando un país de referencia o promedio)
        const valoresUE = await Promise.all(
          indicadores.map(async (ind) => {
            const { data } = await supabase
              .from("resultado_indicadores")
              .select("valor_calculado")
              .eq("nombre_indicador", ind.nombre)
              .eq("periodo", periodo)
              .in("pais", ["Alemania", "Francia", "Italia", "Países Bajos"])
              .limit(4);
            if (data && data.length > 0) {
              const promedio = data.reduce((sum, d) => sum + Number(d.valor_calculado || 0), 0) / data.length;
              return promedio;
            }
            return null;
          })
        );

        // Min-Max global por indicador (mismo periodo; si no hay datos, todos los periodos) para normalización
        let minMaxGlobal = await getMinMaxPorIndicador(
          indicadores.map((i) => i.nombre),
          periodo,
          { fallbackTodosPeriodos: true }
        );
        // Indicadores con valor pero sin min/max en este periodo: usar min/max de todos los periodos
        const conValorSinMinMax = indicadores
          .map((ind, idx) => (valoresTerritorio[idx] != null ? ind.nombre : null))
          .filter((n): n is string => n != null && !minMaxGlobal.has(n));
        if (conValorSinMinMax.length > 0) {
          const minMaxFallback = await getMinMaxPorIndicador(conValorSinMinMax, periodo, { fallbackTodosPeriodos: true });
          minMaxFallback.forEach((v, k) => minMaxGlobal.set(k, v));
        }

        /** Score según metodología Brainnova: normalización Min-Max + ponderación por importancia.
         * Solo se cuentan indicadores con valor calculable y distinto de cero; los que no se pueden calcular o son 0 no entran en el promedio.
         */
        const calcularScorePonderado = (valores: (number | null)[]): number => {
          let sumaPonderada = 0;
          let sumaPesos = 0;
          indicadores.forEach((ind, idx) => {
            const valor = valores[idx];
            if (valor === null || valor === undefined || isNaN(valor) || valor === 0) return;
            const mm = minMaxGlobal.get(ind.nombre);
            if (!mm) return;
            const norm = normalizarMinMax(valor, mm.min, mm.max);
            const peso = pesoImportancia(ind.importancia);
            sumaPonderada += norm * peso;
            sumaPesos += peso;
          });
          if (sumaPesos === 0) return 0;
          return Math.round((sumaPonderada / sumaPesos) * 100);
        };

        const score = Math.min(100, Math.max(0, calcularScorePonderado(valoresTerritorio)));
        const espana = Math.min(100, Math.max(0, calcularScorePonderado(valoresEspana)));
        const ue = Math.min(100, Math.max(0, calcularScorePonderado(valoresUE)));

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
    const subdimensiones = await getSubdimensiones();
    const subdimensionesFiltradas = subdimensiones.filter(
      (sub) => dimensionMatch(sub.nombre_dimension, nombreDimension)
    );

    const indicadores = await getIndicadoresConDatos();
    
    const distribucion = await Promise.all(
      subdimensionesFiltradas.map(async (sub) => {
        const indicadoresSub = indicadores.filter(ind => subdimensionMatch(ind.subdimension, sub.nombre));
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

