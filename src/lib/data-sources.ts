// Funciones para obtener información sobre fuentes de datos desde Supabase
import { supabase } from "@/integrations/supabase/client";

export interface DataSource {
  nombre: string;
  tipo: string;
  status: "active" | "maintenance";
  ultimaActualizacion: string;
  frecuencia: string;
  indicadores: string[];
  totalIndicadores: number;
  totalResultados: number;
}

/**
 * Obtiene las fuentes de datos reales desde la base de datos
 */
export async function getDataSources(): Promise<DataSource[]> {
  try {
    // Obtener todos los indicadores con sus fuentes
    const { data: indicadores, error: indicadoresError } = await supabase
      .from("definicion_indicadores")
      .select("nombre, fuente, origen_indicador");

    if (indicadoresError) throw indicadoresError;

    // Obtener resultados para calcular última actualización
    const { data: resultados, error: resultadosError } = await supabase
      .from("resultado_indicadores")
      .select("nombre_indicador, periodo")
      .order("periodo", { ascending: false })
      .limit(1000);

    if (resultadosError) throw resultadosError;

    // Agrupar por fuente
    const fuentesMap = new Map<string, {
      indicadores: Set<string>;
      origenes: Set<string>;
      ultimoPeriodo: number;
    }>();

    (indicadores || []).forEach((ind) => {
      const fuente = ind.fuente || "Desconocida";
      const origen = ind.origen_indicador || "Desconocido";
      
      if (!fuentesMap.has(fuente)) {
        fuentesMap.set(fuente, {
          indicadores: new Set(),
          origenes: new Set(),
          ultimoPeriodo: 0,
        });
      }

      const fuenteData = fuentesMap.get(fuente)!;
      fuenteData.indicadores.add(ind.nombre);
      fuenteData.origenes.add(origen);
    });

    // Calcular última actualización por fuente
    (resultados || []).forEach((resultado) => {
      const indicador = indicadores?.find((ind) => ind.nombre === resultado.nombre_indicador);
      if (indicador) {
        const fuente = indicador.fuente || "Desconocida";
        const fuenteData = fuentesMap.get(fuente);
        if (fuenteData && (resultado.periodo || 0) > fuenteData.ultimoPeriodo) {
          fuenteData.ultimoPeriodo = resultado.periodo || 0;
        }
      }
    });

    // Convertir a array y formatear
    const dataSources: DataSource[] = Array.from(fuentesMap.entries())
      .map(([fuente, data]) => {
        // Determinar tipo basándose en el nombre de la fuente
        let tipo = "Oficial";
        if (fuente.toLowerCase().includes("eurostat") || fuente.toLowerCase().includes("europeo")) {
          tipo = "Europeo";
        } else if (fuente.toLowerCase().includes("gva") || fuente.toLowerCase().includes("valencia") || fuente.toLowerCase().includes("autonómico")) {
          tipo = "Autonómico";
        } else if (fuente.toLowerCase().includes("red.es") || fuente.toLowerCase().includes("banda ancha")) {
          tipo = "Gubernamental";
        }

        // Determinar frecuencia (estimada basándose en los datos)
        const frecuencia = data.ultimoPeriodo > 0 ? "Anual" : "Desconocida";

        // Obtener total de resultados para esta fuente
        const indicadoresFuente = Array.from(data.indicadores);
        const resultadosFuente = (resultados || []).filter((r) =>
          indicadoresFuente.includes(r.nombre_indicador)
        ).length;

        return {
          nombre: fuente,
          tipo,
          status: data.ultimoPeriodo > 0 ? "active" as const : "maintenance" as const,
          ultimaActualizacion: data.ultimoPeriodo > 0 
            ? `${data.ultimoPeriodo}-01-01` 
            : new Date().toISOString().split('T')[0],
          frecuencia,
          indicadores: indicadoresFuente.slice(0, 5), // Primeros 5 indicadores
          totalIndicadores: indicadoresFuente.length,
          totalResultados: resultadosFuente,
        };
      })
      .sort((a, b) => b.totalIndicadores - a.totalIndicadores) // Ordenar por número de indicadores
      .slice(0, 6); // Top 6 fuentes

    return dataSources;
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return [];
  }
}

/**
 * Obtiene estadísticas generales de las fuentes de datos
 */
export async function getDataSourcesStats(): Promise<{
  totalFuentes: number;
  totalIndicadores: number;
  totalResultados: number;
  fuentesActivas: number;
}> {
  try {
    const { data: indicadores } = await supabase
      .from("definicion_indicadores")
      .select("fuente");

    const { count: totalResultados } = await supabase
      .from("resultado_indicadores")
      .select("id", { count: "exact", head: true });

    const fuentesUnicas = new Set(
      (indicadores || []).map((ind) => ind.fuente).filter(Boolean)
    );

    return {
      totalFuentes: fuentesUnicas.size,
      totalIndicadores: indicadores?.length || 0,
      totalResultados: totalResultados || 0,
      fuentesActivas: fuentesUnicas.size, // Simplificado, podría mejorarse
    };
  } catch (error) {
    console.error("Error fetching data sources stats:", error);
    return {
      totalFuentes: 0,
      totalIndicadores: 0,
      totalResultados: 0,
      fuentesActivas: 0,
    };
  }
}

