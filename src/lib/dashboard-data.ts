// Funciones para obtener datos del dashboard desde Supabase
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalIndicadores: number;
  totalDimensiones: number;
  totalSubdimensiones: number;
  totalResultados: number;
  totalDatosCrudos: number;
}

export interface DimensionStats {
  nombre: string;
  peso: number;
  indicadoresCount: number;
  subdimensionesCount: number;
}

export interface IndicatorTrend {
  nombre: string;
  valores: Array<{
    periodo: number;
    valor: number;
  }>;
}

/**
 * Obtiene estadísticas generales del dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [indicadores, dimensiones, subdimensiones, resultados, datosCrudos] = await Promise.all([
      supabase.from("definicion_indicadores").select("nombre", { count: "exact", head: true }),
      supabase.from("dimensiones").select("nombre", { count: "exact", head: true }),
      supabase.from("subdimensiones").select("nombre", { count: "exact", head: true }),
      supabase.from("resultado_indicadores").select("id", { count: "exact", head: true }),
      supabase.from("datos_crudos").select("id", { count: "exact", head: true }),
    ]);

    return {
      totalIndicadores: indicadores.count || 0,
      totalDimensiones: dimensiones.count || 0,
      totalSubdimensiones: subdimensiones.count || 0,
      totalResultados: resultados.count || 0,
      totalDatosCrudos: datosCrudos.count || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalIndicadores: 0,
      totalDimensiones: 0,
      totalSubdimensiones: 0,
      totalResultados: 0,
      totalDatosCrudos: 0,
    };
  }
}

/**
 * Obtiene estadísticas por dimensión
 */
export async function getDimensionStats(): Promise<DimensionStats[]> {
  try {
    const { data: dimensiones, error } = await supabase
      .from("dimensiones")
      .select("nombre, peso")
      .order("peso", { ascending: false });

    if (error) throw error;

    const stats = await Promise.all(
      (dimensiones || []).map(async (dim) => {
        // Obtener subdimensiones de esta dimensión
        const { data: subdimensiones } = await supabase
          .from("subdimensiones")
          .select("nombre")
          .eq("nombre_dimension", dim.nombre);

        // Contar indicadores de todas las subdimensiones
        let indicadoresCount = 0;
        if (subdimensiones && subdimensiones.length > 0) {
          const counts = await Promise.all(
            subdimensiones.map((sub) =>
              supabase
                .from("definicion_indicadores")
                .select("nombre", { count: "exact", head: true })
                .eq("nombre_subdimension", sub.nombre)
            )
          );
          indicadoresCount = counts.reduce((sum, c) => sum + (c.count || 0), 0);
        }

        return {
          nombre: dim.nombre,
          peso: dim.peso,
          indicadoresCount,
          subdimensionesCount: subdimensiones?.length || 0,
        };
      })
    );

    return stats;
  } catch (error) {
    console.error("Error fetching dimension stats:", error);
    return [];
  }
}

/**
 * Obtiene los últimos valores de indicadores para mostrar en KPIs
 */
export async function getLatestIndicatorValues(pais: string = "España", periodo?: number): Promise<Array<{
  nombre: string;
  valor: number;
  periodo: number;
}>> {
  try {
    let query = supabase
      .from("resultado_indicadores")
      .select("nombre_indicador, valor_calculado, periodo")
      .eq("pais", pais)
      .order("periodo", { ascending: false })
      .limit(100);

    if (periodo) {
      query = query.eq("periodo", periodo);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agrupar por indicador y tomar el valor más reciente
    const latestValues = new Map<string, { nombre: string; valor: number; periodo: number }>();

    (data || []).forEach((item) => {
      const key = item.nombre_indicador;
      const existing = latestValues.get(key);
      
      if (!existing || item.periodo > existing.periodo) {
        latestValues.set(key, {
          nombre: item.nombre_indicador || "",
          valor: Number(item.valor_calculado) || 0,
          periodo: item.periodo || 0,
        });
      }
    });

    return Array.from(latestValues.values());
  } catch (error) {
    console.error("Error fetching latest indicator values:", error);
    return [];
  }
}

/**
 * Obtiene tendencias de un indicador específico
 */
export async function getIndicatorTrend(
  nombreIndicador: string,
  pais: string = "España",
  limit: number = 10
): Promise<IndicatorTrend | null> {
  try {
    const { data, error } = await supabase
      .from("resultado_indicadores")
      .select("periodo, valor_calculado")
      .eq("nombre_indicador", nombreIndicador)
      .eq("pais", pais)
      .order("periodo", { ascending: true })
      .limit(limit);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    return {
      nombre: nombreIndicador,
      valores: data.map((item) => ({
        periodo: item.periodo || 0,
        valor: Number(item.valor_calculado) || 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching indicator trend:", error);
    return null;
  }
}

/**
 * Obtiene los indicadores más importantes (por importancia)
 */
export async function getTopIndicators(limit: number = 10): Promise<Array<{
  nombre: string;
  importancia: string;
  dimension: string;
  subdimension: string;
}>> {
  try {
    const { data: indicadores, error } = await supabase
      .from("definicion_indicadores")
      .select("nombre, importancia, nombre_subdimension")
      .in("importancia", ["Alta", "EXTRAIDO"])
      .limit(limit);

    if (error) throw error;

    // Obtener dimensiones para cada indicador
    const indicadoresConDimension = await Promise.all(
      (indicadores || []).map(async (ind) => {
        const { data: subdim } = await supabase
          .from("subdimensiones")
          .select("nombre_dimension")
          .eq("nombre", ind.nombre_subdimension)
          .single();

        return {
          nombre: ind.nombre,
          importancia: ind.importancia || "Media",
          dimension: subdim?.nombre_dimension || "",
          subdimension: ind.nombre_subdimension,
        };
      })
    );

    return indicadoresConDimension;
  } catch (error) {
    console.error("Error fetching top indicators:", error);
    return [];
  }
}

/**
 * Obtiene KPIs destacados con sus valores más recientes para el dashboard
 */
export async function getFeaturedKPIs(
  pais: string = "España",
  limit: number = 3
): Promise<Array<{
  nombre: string;
  valor: number;
  periodo: number;
  dimension: string;
  subdimension: string;
  importancia: string;
  formula: string | null;
  unidad?: string;
}>> {
  try {
    // Obtener subdimensiones para mapear a dimensiones
    const { data: subdimensiones } = await supabase
      .from("subdimensiones")
      .select("nombre, nombre_dimension");

    const subdimMap = new Map(
      (subdimensiones || []).map((sub) => [sub.nombre, sub.nombre_dimension])
    );

    // Estrategia directa: obtener directamente desde resultado_indicadores
    // Esto garantiza que siempre obtengamos KPIs con datos reales
    // Primero intentar con el país específico
    const { data: resultadosPais, error: resultadosPaisError } = await supabase
      .from("resultado_indicadores")
      .select("nombre_indicador, valor_calculado, periodo, pais")
      .eq("pais", pais)
      .order("periodo", { ascending: false })
      .limit(100);

    // Si no hay suficientes, obtener de todos los países
    let resultadosDirectos = resultadosPais || [];
    if (!resultadosPaisError && (!resultadosPais || resultadosPais.length < limit * 2)) {
      const { data: resultadosTodos, error: resultadosTodosError } = await supabase
        .from("resultado_indicadores")
        .select("nombre_indicador, valor_calculado, periodo, pais")
        .order("periodo", { ascending: false })
        .limit(200);
      
      if (!resultadosTodosError && resultadosTodos) {
        // Combinar resultados, priorizando los del país específico
        const nombresPais = new Set((resultadosPais || []).map(r => r.nombre_indicador));
        const resultadosOtros = resultadosTodos.filter(r => !nombresPais.has(r.nombre_indicador));
        resultadosDirectos = [...(resultadosPais || []), ...resultadosOtros];
      }
    }

    const resultadosError = resultadosPaisError;

    if (resultadosError) {
      console.error("Error fetching resultados:", resultadosError);
      return [];
    }

    if (!resultadosDirectos || resultadosDirectos.length === 0) {
      return [];
    }

    // Agrupar por indicador y tomar el más reciente (priorizando el país especificado)
    const indicadoresUnicos = new Map<string, typeof resultadosDirectos[0] & { esPaisCorrecto: boolean }>();
    
    resultadosDirectos.forEach((r) => {
      const key = r.nombre_indicador || "";
      if (!key) return; // Saltar si no hay nombre
      
      const existente = indicadoresUnicos.get(key);
      const esPaisCorrecto = (r.pais || "").toLowerCase() === pais.toLowerCase();
      
      if (!existente) {
        indicadoresUnicos.set(key, { ...r, esPaisCorrecto });
      } else {
        // Priorizar el país correcto, luego el más reciente
        if (esPaisCorrecto && !existente.esPaisCorrecto) {
          indicadoresUnicos.set(key, { ...r, esPaisCorrecto });
        } else if (esPaisCorrecto === existente.esPaisCorrecto && (r.periodo || 0) > (existente.periodo || 0)) {
          indicadoresUnicos.set(key, { ...r, esPaisCorrecto });
        }
      }
    });

    // Obtener información de los indicadores
    const nombresIndicadores = Array.from(indicadoresUnicos.keys());
    const { data: infoIndicadores } = await supabase
      .from("definicion_indicadores")
      .select("nombre, importancia, nombre_subdimension, formula")
      .in("nombre", nombresIndicadores);

    const infoMap = new Map(
      (infoIndicadores || []).map((ind) => [ind.nombre, ind])
    );

    // Función para determinar la unidad basándose en el nombre del indicador o la fórmula
    const determinarUnidad = (nombre: string, formula: string | null): string => {
      const nombreLower = nombre.toLowerCase();
      // Si el nombre contiene "porcentaje", "%", o la fórmula contiene "%"
      if (nombreLower.includes('porcentaje') || nombreLower.includes('%') || 
          formula?.includes('%') || formula?.includes('porcentaje')) {
        return '%';
      }
      // Si el nombre contiene "empresas" o "personas", probablemente es un porcentaje
      if (nombreLower.includes('empresas') || nombreLower.includes('personas') || 
          nombreLower.includes('uso') || nombreLower.includes('utilizan')) {
        return '%';
      }
      // Si el valor es menor a 100 y parece un porcentaje
      return '';
    };

    // Convertir a array y ordenar
    let kpis = Array.from(indicadoresUnicos.entries())
      .map(([nombre, resultado]) => {
        const info = infoMap.get(nombre);
        const valor = Number(resultado.valor_calculado) || 0;
        const unidad = determinarUnidad(nombre, info?.formula || null);
        return {
          nombre,
          valor,
          periodo: resultado.periodo || 0,
          dimension: info ? (subdimMap.get(info.nombre_subdimension) || "") : "",
          subdimension: info?.nombre_subdimension || "",
          importancia: info?.importancia || "Media",
          formula: info?.formula || null,
          unidad,
          esPaisCorrecto: resultado.esPaisCorrecto,
        };
      })
      .filter((kpi) => kpi.nombre && kpi.nombre.trim() !== "") // Filtrar nombres vacíos
      .sort((a, b) => {
        // Priorizar país correcto
        if (a.esPaisCorrecto && !b.esPaisCorrecto) return -1;
        if (!a.esPaisCorrecto && b.esPaisCorrecto) return 1;
        // Priorizar alta importancia
        if (a.importancia === "Alta" && b.importancia !== "Alta") return -1;
        if (b.importancia === "Alta" && a.importancia !== "Alta") return 1;
        // Luego por valor descendente
        return b.valor - a.valor;
      });

    // Asegurar que tenemos al menos 'limit' KPIs diferentes
    // Si no hay suficientes con país correcto, agregar de otros países
    if (kpis.length < limit) {
      // Ya tenemos todos los disponibles, devolver lo que hay
      return kpis.slice(0, limit).map(({ esPaisCorrecto, ...kpi }) => kpi);
    }

    // Devolver exactamente 'limit' KPIs
    return kpis.slice(0, limit).map(({ esPaisCorrecto, ...kpi }) => kpi);
  } catch (error) {
    console.error("Error fetching featured KPIs:", error);
    return [];
  }
}

