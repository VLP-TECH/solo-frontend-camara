import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  metadata?: any;
  source?: string;
  keywords?: string[];
}

/**
 * Busca información relevante en la base de datos del chatbot
 */
export async function searchKnowledge(query: string, category?: string): Promise<KnowledgeItem[]> {
  try {
    // Limpiar la consulta: eliminar signos de interrogación y caracteres especiales
    const cleanQuery = query.replace(/[¿?¡!]/g, '').trim();
    
    // Palabras comunes a excluir
    const stopWords = ['son', 'las', 'los', 'del', 'de', 'la', 'el', 'en', 'un', 'una', 'que', 'con', 'por', 'para', 'cuáles', 'cuál', 'qué', 'cómo', 'cuándo', 'dónde'];
    
    const searchTerms = cleanQuery.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.includes(term));
    
    if (searchTerms.length === 0) {
      return [];
    }
    
    let queryBuilder = supabase
      .from('chatbot_knowledge')
      .select('*');
    
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }
    
    // Construir condiciones de búsqueda - priorizar términos más largos y específicos
    // Ordenar términos por longitud (más largos primero) para mejor matching
    const sortedTerms = [...searchTerms].sort((a, b) => b.length - a.length);
    const conditions = sortedTerms.map(term => `title.ilike.%${term}%,content.ilike.%${term}%`).join(',');
    
    // Buscar en título y contenido
    const { data, error } = await queryBuilder
      .or(conditions)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error searching knowledge:', error);
      // Intentar búsqueda alternativa más simple
      const { data: altData, error: altError } = await supabase
        .from('chatbot_knowledge')
        .select('*')
        .ilike('title', `%${searchTerms[0]}%`)
        .limit(10);
      
      if (altError) {
        console.error('Alternative search also failed:', altError);
        return [];
      }
      
      const altResults = (altData || []).map(item => ({
        ...item,
        relevance: calculateRelevance(item, searchTerms)
      })).sort((a, b) => b.relevance - a.relevance);
      
      return altResults;
    }
    
    // Ordenar por relevancia (más coincidencias = más relevante)
    const results = (data || []).map(item => ({
      ...item,
      relevance: calculateRelevance(item, searchTerms)
    })).sort((a, b) => b.relevance - a.relevance);
    
    return results;
  } catch (error) {
    console.error('Error in searchKnowledge:', error);
    return [];
  }
}

/**
 * Calcula la relevancia de un resultado basado en los términos de búsqueda
 */
function calculateRelevance(item: KnowledgeItem, searchTerms: string[]): number {
  let score = 0;
  const titleLower = item.title.toLowerCase();
  const contentLower = item.content.toLowerCase();
  const keywordsLower = (item.keywords || []).map(k => k.toLowerCase());
  
  searchTerms.forEach(term => {
    // Título tiene más peso
    if (titleLower.includes(term)) score += 3;
    // Keywords tienen peso medio
    if (keywordsLower.some(k => k.includes(term))) score += 2;
    // Contenido tiene peso bajo
    if (contentLower.includes(term)) score += 1;
  });
  
  return score;
}

/**
 * Obtiene información sobre encuestas disponibles
 */
export async function getSurveyInfo(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, title, description, active')
      .eq('active', true);
    
    if (error) {
      console.error('Error fetching surveys:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getSurveyInfo:', error);
    return [];
  }
}

/**
 * Busca indicadores en la base de datos de Brainnova
 */
export async function searchIndicators(query: string): Promise<any[]> {
  try {
    const cleanQuery = query.replace(/[¿?¡!]/g, '').trim().toLowerCase();
    const searchTerms = cleanQuery.split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }

    // Buscar en nombre de indicadores
    const conditions = searchTerms.map(term => `nombre.ilike.%${term}%`).join(',');
    
    const { data, error } = await supabase
      .from('definicion_indicadores')
      .select('nombre, importancia, formula, fuente, origen_indicador, nombre_subdimension')
      .or(conditions)
      .limit(20);

    if (error) {
      console.error('Error searching indicators:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchIndicators:', error);
    return [];
  }
}

/**
 * Obtiene información detallada de un indicador específico
 */
export async function getIndicatorDetails(nombreIndicador: string): Promise<any> {
  try {
    // Obtener información del indicador
    const { data: indicador, error: indicadorError } = await supabase
      .from('definicion_indicadores')
      .select('nombre, importancia, formula, fuente, origen_indicador, nombre_subdimension')
      .eq('nombre', nombreIndicador)
      .single();

    if (indicadorError || !indicador) {
      return null;
    }

    // Obtener subdimensión y dimensión
    const { data: subdimension } = await supabase
      .from('subdimensiones')
      .select('nombre, nombre_dimension')
      .eq('nombre', indicador.nombre_subdimension)
      .single();

    // Obtener último valor
    const { data: ultimoResultado } = await supabase
      .from('resultado_indicadores')
      .select('valor_calculado, periodo, pais')
      .eq('nombre_indicador', nombreIndicador)
      .order('periodo', { ascending: false })
      .limit(1);

    // Obtener total de resultados
    const { count } = await supabase
      .from('resultado_indicadores')
      .select('id', { count: 'exact', head: true })
      .eq('nombre_indicador', nombreIndicador);

    return {
      ...indicador,
      dimension: subdimension?.nombre_dimension || '',
      subdimension: indicador.nombre_subdimension,
      ultimoValor: ultimoResultado?.[0]?.valor_calculado,
      ultimoPeriodo: ultimoResultado?.[0]?.periodo,
      ultimoPais: ultimoResultado?.[0]?.pais,
      totalResultados: count || 0,
    };
  } catch (error) {
    console.error('Error getting indicator details:', error);
    return null;
  }
}

/**
 * Obtiene todos los indicadores disponibles
 */
export async function getAllIndicators(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('definicion_indicadores')
      .select('nombre, importancia, nombre_subdimension')
      .order('nombre')
      .limit(100);

    if (error) {
      console.error('Error fetching all indicators:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllIndicators:', error);
    return [];
  }
}

/**
 * Busca indicadores por dimensión
 */
export async function getIndicatorsByDimension(nombreDimension: string): Promise<any[]> {
  try {
    // Obtener subdimensiones de la dimensión
    const { data: subdimensiones } = await supabase
      .from('subdimensiones')
      .select('nombre')
      .eq('nombre_dimension', nombreDimension);

    if (!subdimensiones || subdimensiones.length === 0) {
      return [];
    }

    const nombresSubdimensiones = subdimensiones.map(s => s.nombre);

    // Obtener indicadores de esas subdimensiones
    const { data: indicadores, error } = await supabase
      .from('definicion_indicadores')
      .select('nombre, importancia, nombre_subdimension')
      .in('nombre_subdimension', nombresSubdimensiones)
      .order('nombre');

    if (error) {
      console.error('Error fetching indicators by dimension:', error);
      return [];
    }

    return indicadores || [];
  } catch (error) {
    console.error('Error in getIndicatorsByDimension:', error);
    return [];
  }
}

/**
 * Obtiene información sobre KPIs desde la base de datos real
 */
export async function getKPIInfo(): Promise<KnowledgeItem[]> {
  try {
    const indicadores = await getAllIndicators();
    
    return indicadores.map((ind, idx) => ({
      id: `kpi-${idx}`,
      category: 'kpi',
      title: ind.nombre,
      content: `Indicador: ${ind.nombre}\nImportancia: ${ind.importancia || 'No especificada'}\nSubdimensión: ${ind.nombre_subdimension}`,
      metadata: ind,
      source: 'brainnova_database',
      keywords: [ind.nombre.toLowerCase(), ind.nombre_subdimension?.toLowerCase()].filter(Boolean),
    }));
  } catch (error) {
    console.error('Error in getKPIInfo:', error);
    return [];
  }
}

/**
 * Genera una respuesta del chatbot basada en la consulta del usuario
 */
export async function generateChatbotResponse(userQuery: string): Promise<string> {
  // Limpiar la consulta
  const cleanQuery = userQuery.replace(/[¿?¡!]/g, '').trim();
  const lowerQuery = cleanQuery.toLowerCase();
  
  // Detectar si pregunta sobre encuestas
  if (lowerQuery.includes('encuesta') || lowerQuery.includes('survey') || lowerQuery.includes('cuestionario')) {
    const surveys = await getSurveyInfo();
    if (surveys.length > 0) {
      const surveyList = surveys.map(s => `• ${s.title}: ${s.description || 'Sin descripción'}`).join('\n');
      return `Encontré ${surveys.length} encuesta(s) disponible(s):\n\n${surveyList}\n\n¿Sobre cuál te gustaría saber más?`;
    } else {
      return 'No hay encuestas activas en este momento.';
    }
  }
  
  // Detectar preguntas sobre dimensiones específicas
  const dimensionesKeywords = ['dimensión', 'dimension', 'dimensiones'];
  if (dimensionesKeywords.some(keyword => lowerQuery.includes(keyword))) {
    try {
      const { data: dimensiones } = await supabase
        .from('dimensiones')
        .select('nombre, peso')
        .order('peso', { ascending: false });
      
      if (dimensiones && dimensiones.length > 0) {
        // Buscar si pregunta por una dimensión específica
        const dimensionMatch = dimensiones.find(dim => 
          lowerQuery.includes(dim.nombre.toLowerCase())
        );
        
        if (dimensionMatch) {
          // Mostrar indicadores de esa dimensión
          const indicadores = await getIndicatorsByDimension(dimensionMatch.nombre);
          if (indicadores.length > 0) {
            const lista = indicadores.slice(0, 10).map((ind, idx) => 
              `${idx + 1}. **${ind.nombre}**${ind.importancia ? ` (${ind.importancia})` : ''}`
            ).join('\n');
            return `La dimensión **${dimensionMatch.nombre}** tiene ${indicadores.length} indicador(es):\n\n${lista}${indicadores.length > 10 ? `\n\n... y ${indicadores.length - 10} más.` : ''}\n\n¿Sobre cuál indicador te gustaría saber más detalles?`;
          } else {
            return `La dimensión **${dimensionMatch.nombre}** no tiene indicadores disponibles en este momento.`;
          }
        }
        
        // Si no pregunta por una específica, listar todas
        const lista = dimensiones.map((dim, idx) => `${idx + 1}. **${dim.nombre}**`).join('\n');
        return `Tenemos ${dimensiones.length} dimensiones en el sistema:\n\n${lista}\n\n¿Sobre qué dimensión te gustaría saber más? Puedo mostrarte los indicadores de cada una.`;
      }
    } catch (error) {
      console.error('Error fetching dimensions:', error);
    }
  }
  
  // Detectar preguntas sobre valores específicos de indicadores
  if (lowerQuery.includes('valor') || lowerQuery.includes('cuánto') || lowerQuery.includes('cuál es el valor') || lowerQuery.includes('qué valor tiene')) {
    const indicadores = await searchIndicators(cleanQuery);
    if (indicadores.length > 0) {
      const detalle = await getIndicatorDetails(indicadores[0].nombre);
      if (detalle && detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
        return `El valor más reciente del indicador **${detalle.nombre}** es **${detalle.ultimoValor}**${detalle.ultimoPeriodo ? ` (período ${detalle.ultimoPeriodo})` : ''}${detalle.ultimoPais ? ` para ${detalle.ultimoPais}` : ''}.\n\n${detalle.totalResultados > 0 ? `Tenemos ${detalle.totalResultados} resultados disponibles para este indicador.` : ''}`;
      } else if (detalle) {
        return `El indicador **${detalle.nombre}** está definido en el sistema pero no tiene valores calculados disponibles aún.\n\n${detalle.totalResultados > 0 ? `Sin embargo, tenemos ${detalle.totalResultados} registros en la base de datos.` : ''}`;
      }
    }
  }
  
  // Detectar si pregunta sobre KPIs o indicadores específicos
  if (lowerQuery.includes('kpi') || lowerQuery.includes('indicador') || lowerQuery.includes('métrica') || lowerQuery.includes('dato') || lowerQuery.includes('empresa') || lowerQuery.includes('persona') || lowerQuery.includes('digital') || lowerQuery.includes('inteligencia artificial') || lowerQuery.includes('big data') || lowerQuery.includes('banda ancha') || lowerQuery.includes('habilidad')) {
    // Buscar indicadores que coincidan con la consulta
    const indicadores = await searchIndicators(cleanQuery);
    
    if (indicadores.length > 0) {
      // Si encuentra un indicador específico o muy pocos, dar detalles completos
      if (indicadores.length === 1) {
        const detalle = await getIndicatorDetails(indicadores[0].nombre);
        if (detalle) {
          let respuesta = `**${detalle.nombre}**\n\n`;
          
          if (detalle.dimension) {
            respuesta += `📊 Dimensión: ${detalle.dimension}\n`;
          }
          if (detalle.subdimension) {
            respuesta += `📈 Subdimensión: ${detalle.subdimension}\n`;
          }
          if (detalle.importancia) {
            respuesta += `⭐ Importancia: ${detalle.importancia}\n`;
          }
          if (detalle.formula) {
            respuesta += `🔢 Fórmula: ${detalle.formula}\n`;
          }
          if (detalle.fuente) {
            respuesta += `📚 Fuente: ${detalle.fuente}\n`;
          }
          if (detalle.origen_indicador) {
            respuesta += `📍 Origen: ${detalle.origen_indicador}\n`;
          }
          if (detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
            respuesta += `\n📊 Último valor: **${detalle.ultimoValor}**`;
            if (detalle.ultimoPeriodo) {
              respuesta += ` (período ${detalle.ultimoPeriodo})`;
            }
            if (detalle.ultimoPais) {
              respuesta += ` - ${detalle.ultimoPais}`;
            }
          }
          if (detalle.totalResultados > 0) {
            respuesta += `\n\n💾 Total de resultados disponibles: ${detalle.totalResultados}`;
          } else {
            respuesta += `\n\n⚠️ Este indicador aún no tiene valores calculados en la base de datos.`;
          }
          
          return respuesta;
        }
      }
      
      // Si encuentra varios, listarlos
      if (indicadores.length <= 5) {
        const lista = indicadores.map((ind, idx) => {
          return `${idx + 1}. **${ind.nombre}**${ind.importancia ? ` (${ind.importancia})` : ''}`;
        }).join('\n');
        
        return `Encontré ${indicadores.length} indicador(es) relacionado(s) con tu búsqueda:\n\n${lista}\n\n¿Sobre cuál te gustaría saber más detalles? Puedes preguntar por el nombre específico del indicador.`;
      } else {
        const lista = indicadores.slice(0, 5).map((ind, idx) => {
          return `${idx + 1}. **${ind.nombre}**${ind.importancia ? ` (${ind.importancia})` : ''}`;
        }).join('\n');
        
        return `Encontré ${indicadores.length} indicadores relacionados. Aquí tienes los primeros 5:\n\n${lista}\n\n... y ${indicadores.length - 5} más.\n\n¿Sobre cuál te gustaría saber más detalles? Puedes preguntar por el nombre específico del indicador.`;
      }
    }
    
    // Si no encuentra indicadores específicos, mostrar información general
    const todosIndicadores = await getAllIndicators();
    if (todosIndicadores.length > 0) {
      return `Tenemos **${todosIndicadores.length} indicadores** disponibles en la base de datos. Puedes preguntar sobre:\n\n• **Indicadores específicos** (por ejemplo: "¿Qué es el indicador de empresas que usan inteligencia artificial?")\n• **Indicadores por dimensión** (por ejemplo: "¿Qué indicadores hay en transformación digital empresarial?")\n• **Valores de indicadores** (por ejemplo: "¿Cuál es el valor de empresas que usan inteligencia artificial?")\n• **Listar todas las dimensiones** (pregunta: "¿Qué dimensiones hay?")\n\n¿Sobre qué indicador te gustaría saber más?`;
    }
  }
  
  // Búsqueda general en la base de conocimiento
  const results = await searchKnowledge(cleanQuery);
  
  if (results.length > 0) {
    // Priorizar resultados más específicos (que contengan más términos de búsqueda en el título)
    const searchTerms = lowerQuery.split(/\s+/).filter(term => term.length > 2);
    const sortedResults = results.sort((a, b) => {
      const aTitleMatches = searchTerms.filter(term => a.title.toLowerCase().includes(term)).length;
      const bTitleMatches = searchTerms.filter(term => b.title.toLowerCase().includes(term)).length;
      if (aTitleMatches !== bTitleMatches) return bTitleMatches - aTitleMatches;
      return b.relevance - a.relevance;
    });
    
    const bestMatch = sortedResults[0];
    let response = bestMatch.content;
    
    // Si hay más resultados relevantes, mencionarlos
    if (sortedResults.length > 1 && sortedResults[1].relevance > 2) {
      response += `\n\nTambién encontré información relacionada sobre "${sortedResults[1].title}". ¿Te interesa?`;
    }
    
    return response;
  }
  
  // Si no encuentra nada, intentar búsquedas más amplias
  const keyTerms = lowerQuery.split(/\s+/).filter(term => term.length > 3);
  if (keyTerms.length > 0) {
    // Intentar buscar solo con el término más importante
    const broadResults = await searchKnowledge(keyTerms[0]);
    if (broadResults.length > 0) {
      return broadResults[0].content;
    }
  }
  
  // Respuesta por defecto si no encuentra nada
  return `No encontré información específica sobre "${cleanQuery}" en la base de conocimiento. 

Puedo ayudarte con:
• **KPIs e Indicadores**: Pregunta sobre cualquier indicador de la base de datos (por ejemplo: "¿Qué es el indicador de empresas que usan inteligencia artificial?")
• **Dimensiones**: Pregunta sobre las dimensiones disponibles (por ejemplo: "¿Qué dimensiones hay?" o "¿Qué indicadores hay en transformación digital empresarial?")
• **Valores**: Pregunta sobre valores de indicadores (por ejemplo: "¿Cuál es el valor de empresas que usan inteligencia artificial?")
• **Encuestas**: Información sobre encuestas disponibles

¿Podrías reformular tu pregunta o ser más específico?`;
}

