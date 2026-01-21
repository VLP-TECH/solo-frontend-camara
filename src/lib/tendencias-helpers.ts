// Funciones auxiliares para la página de Tendencias
import { supabase } from "@/integrations/supabase/client";

/**
 * Obtiene indicadores recomendados con datos suficientes para mostrar tendencias
 */
export async function getIndicadoresRecomendados(
  pais: string = "España",
  minResultados: number = 5
): Promise<Array<{
  nombre: string;
  totalResultados: number;
  totalPeriodos: number;
  primerPeriodo: number;
  ultimoPeriodo: number;
  paises: string[];
}>> {
  try {
    // Obtener indicadores con datos para el país especificado
    const { data: resultados, error } = await supabase
      .from('resultado_indicadores')
      .select('nombre_indicador, pais, periodo')
      .eq('pais', pais)
      .order('periodo', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching resultados:', error);
      return [];
    }

    if (!resultados || resultados.length === 0) {
      return [];
    }

    // Agrupar por indicador
    const indicadoresMap = new Map<string, {
      nombre: string;
      paises: Set<string>;
      periodos: Set<number>;
      totalResultados: number;
    }>();

    resultados.forEach((r) => {
      const nombre = r.nombre_indicador || '';
      if (!nombre) return;

      if (!indicadoresMap.has(nombre)) {
        indicadoresMap.set(nombre, {
          nombre,
          paises: new Set(),
          periodos: new Set(),
          totalResultados: 0,
        });
      }

      const indicador = indicadoresMap.get(nombre)!;
      if (r.pais) indicador.paises.add(r.pais);
      if (r.periodo) indicador.periodos.add(r.periodo);
      indicador.totalResultados++;
    });

    // Convertir a array y filtrar por mínimo de resultados
    const indicadores = Array.from(indicadoresMap.values())
      .filter(ind => ind.totalResultados >= minResultados)
      .map(ind => {
        const periodos = Array.from(ind.periodos).sort((a, b) => a - b);
        return {
          nombre: ind.nombre,
          totalResultados: ind.totalResultados,
          totalPeriodos: ind.periodos.size,
          primerPeriodo: periodos[0] || 0,
          ultimoPeriodo: periodos[periodos.length - 1] || 0,
          paises: Array.from(ind.paises),
        };
      })
      .sort((a, b) => b.totalPeriodos - a.totalPeriodos);

    return indicadores;
  } catch (error) {
    console.error('Error getting indicadores recomendados:', error);
    return [];
  }
}

