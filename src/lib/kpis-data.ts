// Funciones para obtener datos de KPIs desde Supabase
import { supabase } from "@/integrations/supabase/client";

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
        .filter((sub) => sub.nombre_dimension === nombreDimension)
        .map((sub) => sub.nombre);
      
      indicadores = indicadores.filter((ind) =>
        subdimensionesFiltradas.includes(ind.nombre_subdimension)
      );
    }

    // Obtener subdimensiones para mapear a dimensiones
    const subdimensiones = await getSubdimensiones();
    const subdimMap = new Map(
      subdimensiones.map((sub) => [sub.nombre, sub.nombre_dimension])
    );

    console.log("📊 Mapeo de subdimensiones a dimensiones:", 
      Array.from(subdimMap.entries()).slice(0, 10).map(([sub, dim]) => `${sub} → ${dim}`)
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

        const dimension = subdimMap.get(ind.nombre_subdimension) || "";
        
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
      (sub) => sub.nombre_dimension === nombreDimension
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
    const subdimensiones = await getSubdimensiones();
    const subdimensionesFiltradas = subdimensiones.filter(
      (sub) => sub.nombre_dimension === nombreDimension
    );
    console.log("Subdimensiones filtradas:", subdimensionesFiltradas.length, subdimensionesFiltradas.map(s => s.nombre));

    const datos = await Promise.all(
      subdimensionesFiltradas.map(async (sub) => {
        // Obtener indicadores de esta subdimensión
        const { data: indicadores, error: indicadoresError } = await supabase
          .from("definicion_indicadores")
          .select("nombre")
          .eq("nombre_subdimension", sub.nombre);

        if (indicadoresError) {
          console.error("Error obteniendo indicadores para subdimensión", sub.nombre, indicadoresError);
        }

        if (!indicadores || indicadores.length === 0) {
          console.log("No hay indicadores para subdimensión:", sub.nombre);
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
              "España": ["España", "Spain", "Esp"]
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
            // Buscar valores de países UE (simplificado, usar promedio si hay varios)
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

        // Calcular promedios (normalizados a 0-100)
        const calcularPromedio = (valores: (number | null)[], tipo: string = "") => {
          const valoresValidos = valores.filter(v => v !== null && !isNaN(v)) as number[];
          if (valoresValidos.length === 0) {
            console.log(`⚠️ No hay valores válidos para ${sub.nombre} (${tipo}). Total valores: ${valores.length}, Válidos: 0`);
            console.log(`   Valores recibidos:`, valores.slice(0, 5));
            return 0;
          }
          
          // Log de valores para debugging
          console.log(`📊 Valores para ${sub.nombre} (${tipo}):`, {
            total: valores.length,
            validos: valoresValidos.length,
            valores: valoresValidos.slice(0, 5),
            min: Math.min(...valoresValidos),
            max: Math.max(...valoresValidos),
            promedio: valoresValidos.reduce((sum, v) => sum + v, 0) / valoresValidos.length
          });
          
          const promedio = valoresValidos.reduce((sum, v) => sum + v, 0) / valoresValidos.length;
          
          // Normalizar a escala 0-100
          // Si los valores ya están en escala 0-100, solo hacemos clamp
          // Si están en otra escala, necesitamos normalizar
          let valorNormalizado = promedio;
          
          // Si el promedio es mayor a 100, probablemente los valores no están normalizados
          // En ese caso, asumimos que están en porcentaje o escala diferente
          if (promedio > 100) {
            console.warn(`⚠️ Promedio > 100 para ${sub.nombre} (${tipo}): ${promedio}. Los valores pueden no estar normalizados.`);
            // Intentar normalizar dividiendo por 100 si parece un porcentaje
            if (promedio < 10000) {
              valorNormalizado = promedio / 100;
            } else {
              // Si es muy grande, mantener el clamp
              valorNormalizado = 100;
            }
          }
          
          const resultado = Math.min(100, Math.max(0, valorNormalizado));
          console.log(`✅ Promedio calculado para ${sub.nombre} (${tipo}): ${resultado.toFixed(2)} (promedio raw: ${promedio.toFixed(2)}, de ${valoresValidos.length} valores válidos)`);
          
          return resultado;
        };

        const score = calcularPromedio(valoresTerritorio, "territorio");
        const espana = calcularPromedio(valoresEspana, "España");
        const ue = calcularPromedio(valoresUE, "UE");

        console.log(`Resultado para ${sub.nombre}: score=${score}, espana=${espana}, ue=${ue}`);

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
 * Obtiene el score global de una dimensión
 */
export async function getDimensionScore(
  nombreDimension: string,
  pais: string = "Comunitat Valenciana",
  periodo: number = 2024
): Promise<number> {
  try {
    const subdimensiones = await getSubdimensionesConScores(nombreDimension, pais, periodo);
    if (subdimensiones.length === 0) return 0;
    
    const promedio = subdimensiones.reduce((sum, sub) => sum + sub.score, 0) / subdimensiones.length;
    return Math.round(promedio);
  } catch (error) {
    console.error("Error fetching dimension score:", error);
    return 0;
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
      (sub) => sub.nombre_dimension === nombreDimension
    );

    const indicadores = await getIndicadoresConDatos();
    
    const distribucion = await Promise.all(
      subdimensionesFiltradas.map(async (sub) => {
        const indicadoresSub = indicadores.filter(ind => ind.subdimension === sub.nombre);
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

