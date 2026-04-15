import { supabase } from "@/integrations/supabase/client";
import {
  getSubdimensionesConScores,
  getIndiceGlobalTerritorio,
  getDimensiones,
  getDimensionScore,
  getIndicadores,
  getDatosHistoricosIndicador,
} from "@/lib/kpis-data";

/** Datos de índice BRAINNOVA por provincia (alineado con /comparacion y dashboard) */
const INDICE_POR_PROVINCIA: Record<string, { indice: number; ranking: number; dimensionDestacada: string; puntosDimension: number }> = {
  valencia: { indice: 69.5, ranking: 1, dimensionDestacada: "Capital Humano", puntosDimension: 74 },
  alicante: { indice: 66.8, ranking: 2, dimensionDestacada: "Infraestructura Digital", puntosDimension: 76 },
  castellón: { indice: 64.3, ranking: 3, dimensionDestacada: "Transformación Digital Empresarial", puntosDimension: 70 },
  castellon: { indice: 64.3, ranking: 3, dimensionDestacada: "Transformación Digital Empresarial", puntosDimension: 70 },
};

/** Puntos por dimensión por provincia (Comparación territorial) */
const DIMENSION_POR_PROVINCIA: Record<string, Record<string, number>> = {
  valencia: { "Transformación Digital Empresarial": 68, "Capital Humano": 74, "Infraestructura Digital": 75, "Ecosistema y Colaboración": 65, "Emprendimiento e Innovación": 60, "Servicios Públicos Digitales": 72, "Sostenibilidad Digital": 64 },
  alicante: { "Transformación Digital Empresarial": 66, "Capital Humano": 70, "Infraestructura Digital": 76, "Ecosistema y Colaboración": 63, "Emprendimiento e Innovación": 58, "Servicios Públicos Digitales": 68, "Sostenibilidad Digital": 62 },
  castellón: { "Transformación Digital Empresarial": 70, "Capital Humano": 68, "Infraestructura Digital": 72, "Ecosistema y Colaboración": 61, "Emprendimiento e Innovación": 54, "Servicios Públicos Digitales": 66, "Sostenibilidad Digital": 60 },
  castellon: { "Transformación Digital Empresarial": 70, "Capital Humano": 68, "Infraestructura Digital": 72, "Ecosistema y Colaboración": 61, "Emprendimiento e Innovación": 54, "Servicios Públicos Digitales": 66, "Sostenibilidad Digital": 60 },
};

const NOMBRES_PROVINCIAS: Record<string, string> = {
  valencia: "Valencia",
  alicante: "Alicante",
  castellón: "Castellón",
  castellon: "Castellón",
};

/** Pesos oficiales de dimensiones según Metodología BRAINNOVA 2026 (Metodologia.tsx) */
const PESOS_DIMENSIONES: Array<{ nombre: string; peso: number; descripcion: string }> = [
  { nombre: "Transformación Digital Empresarial", peso: 30, descripcion: "Núcleo del modelo, refleja adopción tecnológica real" },
  { nombre: "Capital Humano", peso: 20, descripcion: "Factor habilitador esencial" },
  { nombre: "Infraestructura Digital", peso: 15, descripcion: "Habilitador estructural: permite el uso de herramientas digitales" },
  { nombre: "Ecosistema y Colaboración", peso: 15, descripcion: "Dinamismo, capacidad de renovación y transición hacia modelos digitales" },
  { nombre: "Apoyo al Emprendimiento e Innovación", peso: 10, descripcion: "Redes de innovación, transferencia y confianza" },
  { nombre: "Servicios Públicos Digitales", peso: 10, descripcion: "Impacto útil pero más periférico sobre las empresas" },
  { nombre: "Sostenibilidad Digital", peso: 5, descripcion: "Dimensión emergente y transversal, incipiente en adopción empresarial" },
];

const FUENTES_DATOS = [
  "Instituto Nacional de Estadística (INE) — Datos empresariales y población",
  "Eurostat — Comparativas europeas",
  "Ministerio de Asuntos Económicos — Digitalización administrativa",
  "Comisión Nacional de los Mercados y la Competencia (CNMC) — Infraestructuras y conectividad",
  "Observatorio Nacional de Tecnología — Adopción tecnológica",
  "Registros autonómicos — Datos regionales específicos",
];

/** Mapa de temas a términos de búsqueda de indicadores */
const TEMAS_INDICADORES: Array<{ keywords: string[]; searchTerms: string[]; dimensionHint: string; contexto: string }> = [
  { keywords: ["erp"], searchTerms: ["ERP"], dimensionHint: "Transformación Digital Empresarial", contexto: "sistemas ERP en empresas" },
  { keywords: ["inteligencia artificial", "ia empresas", "empresas ia", "adopción ia", "adopcion ia", "uso de ia"], searchTerms: ["inteligencia artificial", "IA"], dimensionHint: "Transformación Digital Empresarial", contexto: "uso de inteligencia artificial en empresas" },
  { keywords: ["comercio electrónico", "comercio electronico", "e-commerce", "ecommerce", "ventas online"], searchTerms: ["comercio electrónico", "e-commerce", "ventas online"], dimensionHint: "Transformación Digital Empresarial", contexto: "comercio electrónico empresarial" },
  { keywords: ["intensidad digital", "dii", "índice de intensidad digital", "indice de intensidad digital"], searchTerms: ["intensidad digital", "DII"], dimensionHint: "Transformación Digital Empresarial", contexto: "Índice de Intensidad Digital (DII)" },
  { keywords: ["big data", "datos masivos", "analítica de datos", "analitica de datos"], searchTerms: ["big data", "datos", "analítica"], dimensionHint: "Transformación Digital Empresarial", contexto: "uso de big data y analítica de datos" },
  { keywords: ["cloud", "nube", "servicios en la nube", "computación en la nube"], searchTerms: ["cloud", "nube"], dimensionHint: "Transformación Digital Empresarial", contexto: "adopción de servicios en la nube" },
  { keywords: ["pymes", "pyme", "pequeñas empresas", "microempresas"], searchTerms: ["pymes", "pequeñas", "micro"], dimensionHint: "Transformación Digital Empresarial", contexto: "digitalización de pymes" },
  { keywords: ["formación digital", "formacion digital", "capacitación digital", "capacitacion digital", "formación tic", "formacion tic"], searchTerms: ["formación", "capacitación", "formación digital"], dimensionHint: "Capital Humano", contexto: "formación digital en empresas" },
  { keywords: ["brecha generacional", "competencias por edad", "jóvenes digitales", "jovenes digitales"], searchTerms: ["brecha", "generacional", "edad", "jóvenes"], dimensionHint: "Capital Humano", contexto: "brecha generacional en competencias digitales" },
  { keywords: ["perfiles tic", "contratar tic", "escasez tic", "talento digital", "reclutamiento tic"], searchTerms: ["perfiles TIC", "contratar", "escasez", "talento"], dimensionHint: "Capital Humano", contexto: "dificultades para contratar perfiles TIC" },
  { keywords: ["empleo tecnológico", "empleo tecnologico", "empleo tic", "empleo sector tic", "ocupación tic", "ocupacion tic", "trabajadores tic"], searchTerms: ["empleo", "TIC", "tecnológico", "sector"], dimensionHint: "Capital Humano", contexto: "empleo en el sector tecnológico" },
  { keywords: ["graduados stem", "stem", "graduados tecnología", "graduados tecnologia"], searchTerms: ["STEM", "graduados", "tecnología"], dimensionHint: "Capital Humano", contexto: "graduados STEM" },
  { keywords: ["eficiencia energética", "tic energía", "tic energia", "tic eficiencia"], searchTerms: ["eficiencia energética", "energía", "TIC"], dimensionHint: "Sostenibilidad Digital", contexto: "uso de TIC para eficiencia energética" },
  { keywords: ["descarbonización", "descarbonizacion", "plan descarbonización", "plan descarbonizacion", "huella carbono"], searchTerms: ["descarbonización", "carbono", "emisiones"], dimensionHint: "Sostenibilidad Digital", contexto: "planes de descarbonización empresarial" },
  { keywords: ["consumo energético", "consumo energetico", "energía infraestructura", "energia infraestructura", "centros de datos"], searchTerms: ["consumo energético", "energía", "centro de datos"], dimensionHint: "Sostenibilidad Digital", contexto: "consumo energético de infraestructuras digitales" },
  { keywords: ["residuos electrónicos", "residuos electronicos", "raee", "reciclaje equipos"], searchTerms: ["residuos", "electrónicos", "RAEE", "reciclaje"], dimensionHint: "Sostenibilidad Digital", contexto: "gestión de residuos electrónicos" },
  { keywords: ["proyectos europeos", "horizonte europa", "horizon europe", "fondos europeos"], searchTerms: ["proyectos europeos", "Horizonte", "Europa"], dimensionHint: "Ecosistema y Colaboración", contexto: "participación en proyectos europeos" },
  { keywords: ["densidad empresas tic", "empresas tic región", "empresas tic region", "tejido tic"], searchTerms: ["densidad", "empresas TIC", "sector TIC"], dimensionHint: "Ecosistema y Colaboración", contexto: "densidad de empresas TIC" },
  { keywords: ["clústeres", "clusteres", "cluster digital", "clúster", "cluster"], searchTerms: ["clúster", "cluster", "concentración"], dimensionHint: "Ecosistema y Colaboración", contexto: "clústeres digitales" },
  { keywords: ["colaboración universidad", "colaboracion universidad", "universidad-empresa", "transferencia conocimiento"], searchTerms: ["universidad", "colaboración", "transferencia"], dimensionHint: "Ecosistema y Colaboración", contexto: "colaboración universidad-empresa" },
  { keywords: ["inversión startups", "inversion startups", "venture capital", "capital riesgo"], searchTerms: ["inversión", "startups", "venture", "capital"], dimensionHint: "Emprendimiento e Innovación", contexto: "inversión en startups tecnológicas" },
  { keywords: ["financiación startups", "financiacion startups", "financiación digital", "financiacion digital", "acceso financiación", "acceso financiacion"], searchTerms: ["financiación", "startups", "acceso"], dimensionHint: "Emprendimiento e Innovación", contexto: "acceso a financiación de startups" },
  { keywords: ["densidad startups", "número startups", "numero startups", "startups por habitante"], searchTerms: ["densidad", "startups", "número"], dimensionHint: "Emprendimiento e Innovación", contexto: "densidad de startups" },
  { keywords: ["tasa supervivencia", "supervivencia empresas", "supervivencia startups", "mortalidad empresarial"], searchTerms: ["supervivencia", "tasa", "mortalidad"], dimensionHint: "Emprendimiento e Innovación", contexto: "tasa de supervivencia empresarial" },
  { keywords: ["sectores digitalizados", "sector más digital", "sector mas digital", "digitalización sectorial", "digitalizacion sectorial"], searchTerms: ["sector", "actividad", "digitalización"], dimensionHint: "Transformación Digital Empresarial", contexto: "digitalización por sectores de actividad" },
];

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

/** Opciones para obtener detalle de indicador (p. ej. filtrar por territorio) */
export interface GetIndicatorDetailsOptions {
  pais?: string;
  periodo?: number;
}

/**
 * Obtiene información detallada de un indicador específico.
 * Si se indica pais (y opcionalmente periodo), ultimoValor/ultimoPeriodo/ultimoPais corresponden a ese territorio.
 */
export async function getIndicatorDetails(
  nombreIndicador: string,
  options?: GetIndicatorDetailsOptions
): Promise<any> {
  try {
    const { pais: filterPais, periodo: filterPeriodo } = options || {};

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

    // Obtener valor: si hay territorio, filtrar por él; si no, último disponible
    const variacionesPais: Record<string, string[]> = {
      Valencia: ['Valencia'],
      Alicante: ['Alicante'],
      Castellón: ['Castellón', 'Castellon'],
      Castellon: ['Castellón', 'Castellon'],
    };
    let ultimoResultado: { valor_calculado: number; periodo: number; pais: string } | null = null;

    if (filterPais) {
      const variaciones = variacionesPais[filterPais] || [filterPais];
      for (const p of variaciones) {
        let q = supabase
          .from('resultado_indicadores')
          .select('valor_calculado, periodo, pais')
          .eq('nombre_indicador', nombreIndicador)
          .eq('pais', p);
        if (filterPeriodo) {
          q = q.eq('periodo', filterPeriodo);
        }
        const { data } = await q.order('periodo', { ascending: false }).limit(1);
        if (data && data.length > 0) {
          ultimoResultado = data[0] as any;
          break;
        }
      }
    }
    if (!ultimoResultado) {
      const { data } = await supabase
        .from('resultado_indicadores')
        .select('valor_calculado, periodo, pais')
        .eq('nombre_indicador', nombreIndicador)
        .order('periodo', { ascending: false })
        .limit(1);
      ultimoResultado = data?.[0] as any ?? null;
    }

    // Obtener total de resultados
    const { count } = await supabase
      .from('resultado_indicadores')
      .select('id', { count: 'exact', head: true })
      .eq('nombre_indicador', nombreIndicador);

    return {
      ...indicador,
      dimension: subdimension?.nombre_dimension || '',
      subdimension: indicador.nombre_subdimension,
      ultimoValor: ultimoResultado?.valor_calculado,
      ultimoPeriodo: ultimoResultado?.periodo,
      ultimoPais: ultimoResultado?.pais,
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
 * Maneja preguntas sobre el modelo, metodología y cálculos del índice BRAINNOVA.
 * Devuelve la respuesta directa o null si no coincide con ningún patrón.
 */
function handlePreguntasModelo(lowerQuery: string): string | null {
  // --- Qué mide el índice BRAINNOVA ---
  if (
    (lowerQuery.includes("qué mide") || lowerQuery.includes("que mide")) &&
    (lowerQuery.includes("brainnova") || lowerQuery.includes("índice") || lowerQuery.includes("indice"))
  ) {
    return `El **índice BRAINNOVA** mide el grado de desarrollo de la **economía digital** de un territorio. Evalúa la capacidad de empresas, administración y ciudadanía para aprovechar las tecnologías digitales a través de **7 dimensiones**, **28 subdimensiones** y **más de 80 indicadores**. Es un indicador compuesto (escala 0-100) basado en el estándar europeo DESI (Digital Economy and Society Index), adaptado al contexto regional y autonómico español.\n\nLas 7 dimensiones son:\n${PESOS_DIMENSIONES.map((d, i) => `${i + 1}. **${d.nombre}** (${d.peso}%)`).join("\n")}\n\nPuedes consultar el detalle en la sección **Metodología** del menú.`;
  }

  // --- Cuáles son las dimensiones del sistema ---
  if (
    ((lowerQuery.includes("cuáles son") || lowerQuery.includes("cuales son") || lowerQuery.includes("qué dimensiones") || lowerQuery.includes("que dimensiones") || lowerQuery.includes("enumera") || lowerQuery.includes("lista las dimensiones")) &&
    (lowerQuery.includes("dimensiones") || lowerQuery.includes("sistema"))) ||
    (lowerQuery.includes("dimensiones del sistema") || lowerQuery.includes("dimensiones brainnova"))
  ) {
    return `El sistema BRAINNOVA se estructura en **7 dimensiones**:\n\n${PESOS_DIMENSIONES.map((d, i) => `${i + 1}. **${d.nombre}** (${d.peso}%) — ${d.descripcion}`).join("\n")}\n\nCada dimensión se desglosa en subdimensiones (28 en total) y cada subdimensión contiene indicadores específicos (más de 80 en total). Puedes explorar cada dimensión y sus indicadores en el menú **Dimensiones**.`;
  }

  // --- Indicadores de la dimensión Capital Humano (pregunta explícita) ---
  if (
    (lowerQuery.includes("indicadores") || lowerQuery.includes("qué incluye") || lowerQuery.includes("que incluye") || lowerQuery.includes("qué mide") || lowerQuery.includes("que mide")) &&
    lowerQuery.includes("capital humano") &&
    !lowerQuery.includes("peso") && !lowerQuery.includes("ponderación")
  ) {
    return `La dimensión **Capital Humano** (peso: 20%) incluye indicadores sobre:\n\n• **Personas con habilidades digitales básicas** (% de la población)\n• **Personas con habilidades digitales avanzadas**\n• **Brecha generacional** en competencias digitales\n• **Empresas que ofrecen formación digital** a sus empleados\n• **Empleo en el sector TIC** y tecnológico\n• **Dificultades para contratar perfiles TIC**\n• **Graduados STEM** y formación universitaria en tecnología\n• **Especialistas TIC** en el mercado laboral\n\nPara ver la lista completa con valores actuales, consulta **Dimensiones** → Capital Humano, o pregúntame "¿Qué indicadores hay en Capital Humano?" para obtener el listado de la base de datos.`;
  }

  // --- Cómo se calcula el Índice Global BRAINNOVA ---
  if (
    (lowerQuery.includes("cómo se calcula") || lowerQuery.includes("como se calcula") || lowerQuery.includes("cómo calcula") || lowerQuery.includes("como calcula") ||
     lowerQuery.includes("fórmula") || lowerQuery.includes("formula")) &&
    (lowerQuery.includes("índice") || lowerQuery.includes("indice") || lowerQuery.includes("brainnova") || lowerQuery.includes("global"))
  ) {
    return `El **Índice Global BRAINNOVA** se calcula en 4 etapas:\n\n**1. Normalización de indicadores** (escala 0-100):\nValor_Normalizado = ((Valor_Real - Valor_Mín) / (Valor_Máx - Valor_Mín)) × 100\n\n**2. Agregación a subdimensiones** (media ponderada por importancia):\nSubdimensión = ∑(Indicador_i × Peso_i) / ∑Peso_i\n(Pesos: Alta=3, Media=2, Baja=1)\n\n**3. Agregación a dimensiones** (promedio de subdimensiones con score > 0):\nDimensión = promedio(subdimensiones con datos)\n\n**4. Índice global** (media ponderada de las 7 dimensiones):\nÍndice_BRAINNOVA = ∑(Dimensión_k × Peso_k) / 100\n\nLos pesos de cada dimensión:\n${PESOS_DIMENSIONES.map(d => `• ${d.nombre}: **${d.peso}%**`).join("\n")}\n\nEl detalle completo está en la sección **Metodología**.`;
  }

  // --- Qué peso tiene la Transformación Digital Empresarial ---
  if (
    (lowerQuery.includes("qué peso") || lowerQuery.includes("que peso") || lowerQuery.includes("cuánto pesa") || lowerQuery.includes("cuanto pesa")) &&
    lowerQuery.includes("transformación digital")
  ) {
    return `La dimensión **Transformación Digital Empresarial** tiene un peso del **30%** en el índice BRAINNOVA, siendo la dimensión con mayor peso. Es el núcleo del modelo porque refleja la adopción tecnológica real en el tejido empresarial.\n\nIncluye indicadores sobre adopción de ERP, inteligencia artificial, comercio electrónico, big data, servicios en la nube, redes sociales y el Índice de Intensidad Digital (DII).\n\n**Todos los pesos:**\n${PESOS_DIMENSIONES.map(d => `• ${d.nombre}: **${d.peso}%**`).join("\n")}`;
  }

  // --- Cómo se normalizan los indicadores ---
  if (
    (lowerQuery.includes("normaliza") || lowerQuery.includes("normalizan") || lowerQuery.includes("normalización") || lowerQuery.includes("normalizacion"))
  ) {
    return `Los indicadores se **normalizan** a una escala 0-100 mediante la fórmula **Min-Max**:\n\n**Valor_Normalizado = ((Valor_Real - Valor_Mínimo) / (Valor_Máximo - Valor_Mínimo)) × 100**\n\nEl mínimo y máximo se obtienen del conjunto de referencia (todos los territorios/países disponibles para ese indicador en el período seleccionado). Así, el peor valor se acerca a 0 y el mejor a 100.\n\nLos indicadores se ponderan según su importancia estratégica:\n• **Alta**: peso 3\n• **Media**: peso 2\n• **Baja**: peso 1\n\nEl score por indicador se calcula como: Score_i = (Valor_i / Max_i) × 100. El detalle completo está en la sección **Metodología**.`;
  }

  // --- Referencia: media nacional o top europeo ---
  if (
    (lowerQuery.includes("referencia") && (lowerQuery.includes("comparación") || lowerQuery.includes("comparacion"))) ||
    (lowerQuery.includes("media nacional") && lowerQuery.includes("top europeo")) ||
    ((lowerQuery.includes("referencia") || lowerQuery.includes("benchmark")) && (lowerQuery.includes("europeo") || lowerQuery.includes("nacional")))
  ) {
    return `La **referencia** para la comparación de indicadores BRAINNOVA utiliza dos niveles:\n\n• **Media nacional (España)**: se compara el valor del territorio (provincia o CV) con el valor del mismo indicador para España.\n• **Referencia europea (UE)**: se comparan los scores con los de países europeos de referencia (Alemania, Francia, Italia, Países Bajos). El "top europeo" es el mejor valor entre estos países para cada indicador.\n\nEn la **normalización Min-Max**, el máximo y mínimo se calculan sobre todos los territorios disponibles (incluidos los europeos cuando hay datos). En las fichas de subdimensiones se muestran los scores para el territorio, España y la media UE.\n\nPuedes ver estas comparativas en **Dimensiones** (detalle), **Comparación Territorial** y el **Dashboard**.`;
  }

  // --- Cómo se ponderan las dimensiones ---
  if (
    (lowerQuery.includes("cómo se ponderan") || lowerQuery.includes("como se ponderan") || lowerQuery.includes("sistema de ponderación") || lowerQuery.includes("sistema de ponderacion")) &&
    (lowerQuery.includes("dimensiones") || lowerQuery.includes("índice") || lowerQuery.includes("indice"))
  ) {
    return `Las dimensiones del índice BRAINNOVA se **ponderan** con pesos fijos definidos en la metodología. El índice global es la media ponderada:\n\n**Índice_BRAINNOVA = ∑(Dimensión_k × Peso_k) / 100**\n\n**Pesos asignados:**\n${PESOS_DIMENSIONES.map(d => `• **${d.nombre}**: ${d.peso}% — ${d.descripcion}`).join("\n")}\n\nEstos pesos reflejan la importancia estratégica de cada dimensión en el ecosistema digital. La Transformación Digital Empresarial (30%) tiene el mayor peso al ser el núcleo del modelo.`;
  }

  // --- Qué fuentes de datos se utilizan ---
  if (
    (lowerQuery.includes("fuentes") || lowerQuery.includes("fuente")) &&
    (lowerQuery.includes("datos") || lowerQuery.includes("información") || lowerQuery.includes("informacion") || lowerQuery.includes("utilizan") || lowerQuery.includes("usan"))
  ) {
    return `Las **fuentes de datos** del índice BRAINNOVA son:\n\n${FUENTES_DATOS.map((f, i) => `${i + 1}. **${f.split(" — ")[0]}** — ${f.split(" — ")[1]}`).join("\n")}\n\nCada indicador tiene su fuente específica registrada en la base de datos (campo "Fuente"). Puedes ver la fuente de cada indicador en **Todos los Indicadores (KPIs)**. Todos los datos pasan por un proceso de **validación cruzada** con múltiples fuentes antes de su inclusión.`;
  }

  // --- Cada cuánto se actualizan ---
  if (
    (lowerQuery.includes("cada cuánto") || lowerQuery.includes("cada cuanto") || lowerQuery.includes("periodicidad") || lowerQuery.includes("frecuencia") || lowerQuery.includes("actualizan") || lowerQuery.includes("actualización") || lowerQuery.includes("actualizacion")) &&
    (lowerQuery.includes("indicador") || lowerQuery.includes("indicadores") || lowerQuery.includes("datos") || lowerQuery.includes("índice") || lowerQuery.includes("indice"))
  ) {
    return `El índice BRAINNOVA se **actualiza anualmente**, con datos de cierre a 31 de diciembre del año anterior.\n\n• La mayoría de indicadores se actualizan **anualmente** según la disponibilidad de fuentes oficiales (INE, Eurostat, CNMC...)\n• Algunos indicadores de infraestructura pueden tener datos **semestrales**\n• Los periodos disponibles en el panel son: **2022, 2023, 2024**\n\nTodos los datos pasan por un proceso de **validación cruzada** con múltiples fuentes. La **metodología se revisa cada 2-3 años** para incorporar nuevas tendencias y tecnologías emergentes.\n\nPuedes ver el último periodo disponible de cada indicador en **Todos los Indicadores (KPIs)**.`;
  }

  // --- Se puede recalcular con otra ponderación ---
  if (
    (lowerQuery.includes("recalcular") || lowerQuery.includes("recalcula") || lowerQuery.includes("otra ponderación") || lowerQuery.includes("otra ponderacion") || lowerQuery.includes("cambiar pesos") || lowerQuery.includes("modificar pesos"))
  ) {
    return `**Sí**, es posible recalcular el índice BRAINNOVA con otra ponderación. Los scores de cada dimensión ya están calculados independientemente, por lo que basta con aplicar la media ponderada con los nuevos pesos:\n\n**Índice_nuevo = ∑(Dimensión_k × Peso_nuevo_k) / ∑Peso_nuevo_k**\n\nLos pesos actuales son:\n${PESOS_DIMENSIONES.map(d => `• ${d.nombre}: ${d.peso}%`).join("\n")}\n\nPara simular con otros pesos, puedes tomar los scores por dimensión del **Dashboard** o de **Comparación Territorial** y aplicar tu propia fórmula. La sección **BRAINNOVA Score** (/brainnova-score) permite calcular el índice con los filtros disponibles.`;
  }

  return null;
}

/**
 * Maneja preguntas de análisis avanzado: brecha, priorización, impacto, correlación, simulación.
 */
async function handlePreguntasAnalisis(
  lowerQuery: string,
  provinciaKey: string | undefined
): Promise<string | null> {
  // --- Dimensión con mayor brecha respecto al top europeo ---
  if (
    (lowerQuery.includes("brecha") || lowerQuery.includes("gap")) &&
    (lowerQuery.includes("top europeo") || lowerQuery.includes("europa") || lowerQuery.includes("ue") || lowerQuery.includes("europeo"))
  ) {
    try {
      let territorio = "Valencia";
      if (provinciaKey) territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      const dimensiones = await getDimensiones();
      if (dimensiones.length > 0) {
        const comparativas = await Promise.all(
          dimensiones.map(async (dim) => {
            const subs = await getSubdimensionesConScores(dim.nombre, territorio, 2024);
            const scoresTerritorio = subs.filter(s => s.score > 0);
            const scoresUE = subs.filter(s => s.ue > 0);
            const avgTerritorio = scoresTerritorio.length > 0 ? scoresTerritorio.reduce((a, b) => a + b.score, 0) / scoresTerritorio.length : 0;
            const avgUE = scoresUE.length > 0 ? scoresUE.reduce((a, b) => a + b.ue, 0) / scoresUE.length : 0;
            return { nombre: dim.nombre, scoreTerritorio: Math.round(avgTerritorio), scoreUE: Math.round(avgUE), brecha: Math.round(avgUE - avgTerritorio) };
          })
        );
        const conBrechaPositiva = comparativas.filter(c => c.brecha > 0).sort((a, b) => b.brecha - a.brecha);
        if (conBrechaPositiva.length > 0) {
          const ranking = conBrechaPositiva.map((c, i) => `${i + 1}. **${c.nombre}**: ${territorio} ${c.scoreTerritorio} vs UE ${c.scoreUE} (brecha: **${c.brecha} puntos**)`).join("\n");
          return `**Dimensiones con mayor brecha respecto a la media UE** en ${territorio}:\n\n${ranking}\n\nLa dimensión con **mayor brecha** es **${conBrechaPositiva[0].nombre}** (${conBrechaPositiva[0].brecha} puntos por debajo de la media UE). Para cerrar esta brecha, se deberían priorizar los indicadores de esa dimensión.`;
        }
        return `No se ha detectado una brecha significativa respecto a la media UE en los datos disponibles para ${territorio}. Esto puede deberse a que no hay suficientes datos europeos cargados. Consulta **Comparación Territorial** y el **Dashboard** para más detalle.`;
      }
    } catch (error) {
      console.error("Error fetching brecha UE:", error);
    }
  }

  // --- Subdimensiones por debajo de la media nacional ---
  if (
    (lowerQuery.includes("subdimensiones") || lowerQuery.includes("subdimensión") || lowerQuery.includes("subdimension")) &&
    (lowerQuery.includes("por debajo") || lowerQuery.includes("debajo de la media") || lowerQuery.includes("inferior"))
  ) {
    try {
      let territorio = "Valencia";
      if (provinciaKey) territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      const dimensiones = await getDimensiones();
      const porDebajoDeEspana: Array<{ sub: string; dim: string; score: number; espana: number; diff: number }> = [];
      for (const dim of dimensiones) {
        const subs = await getSubdimensionesConScores(dim.nombre, territorio, 2024);
        for (const sub of subs) {
          if (sub.score > 0 && sub.espana > 0 && sub.score < sub.espana) {
            porDebajoDeEspana.push({ sub: sub.nombre, dim: dim.nombre, score: sub.score, espana: sub.espana, diff: sub.espana - sub.score });
          }
        }
      }
      if (porDebajoDeEspana.length > 0) {
        porDebajoDeEspana.sort((a, b) => b.diff - a.diff);
        const lista = porDebajoDeEspana.slice(0, 10).map((s, i) => `${i + 1}. **${s.sub}** (${s.dim}): ${territorio} ${s.score} vs España ${s.espana} (−${s.diff} pts)`).join("\n");
        return `**Subdimensiones de ${territorio} por debajo de la media nacional (España):**\n\n${lista}\n\nEstas ${porDebajoDeEspana.length} subdimensiones representan áreas donde ${territorio} tiene margen de mejora respecto a la media española.`;
      }
      return `No se han encontrado subdimensiones de ${territorio} significativamente por debajo de la media nacional en los datos disponibles.`;
    } catch (error) {
      console.error("Error fetching subdimensiones bajo media:", error);
    }
  }

  // --- Qué dimensión tiene mayor impacto en el índice global (calculado) ---
  if (
    (lowerQuery.includes("mayor impacto") || lowerQuery.includes("más impacto") || lowerQuery.includes("mas impacto") || lowerQuery.includes("más influye") || lowerQuery.includes("mas influye")) &&
    (lowerQuery.includes("índice") || lowerQuery.includes("indice") || lowerQuery.includes("global") || lowerQuery.includes("dimensión") || lowerQuery.includes("dimension"))
  ) {
    try {
      let territorio = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : "Valencia";
      const dimensiones = await getDimensiones();
      const analisis = await Promise.all(
        dimensiones.map(async (dim) => {
          const score = await getDimensionScore(dim.nombre, territorio, 2024);
          const pesoDim = PESOS_DIMENSIONES.find(p => dim.nombre.toLowerCase().includes(p.nombre.toLowerCase().slice(0, 15)) || p.nombre.toLowerCase().includes(dim.nombre.toLowerCase().slice(0, 15)))?.peso || 10;
          const margenMejora = 100 - score;
          const impactoPotencial = Math.round(margenMejora * pesoDim / 100 * 10) / 10;
          const impactoPunto = Math.round(pesoDim / 100 * 10) / 10;
          return { nombre: dim.nombre, score, peso: pesoDim, margenMejora, impactoPotencial, impactoPunto };
        })
      );
      const conDatos = analisis.filter(a => a.score > 0);
      if (conDatos.length > 0) {
        conDatos.sort((a, b) => b.impactoPotencial - a.impactoPotencial);
        const tabla = conDatos.map((a, i) => `${i + 1}. **${a.nombre}** — score: ${a.score}/100, peso: ${a.peso}%, margen: ${a.margenMejora} pts, impacto si llega a 100: **+${a.impactoPotencial}** pts en índice global`).join("\n");
        return `**Análisis de impacto por dimensión** en ${territorio}:\n\n${tabla}\n\n**Lectura:** La dimensión **${conDatos[0].nombre}** tiene el mayor impacto potencial (+${conDatos[0].impactoPotencial} puntos si llegara a 100) porque combina alto peso (${conDatos[0].peso}%) con margen de mejora (${conDatos[0].margenMejora} puntos).\n\nCada punto que suba ${conDatos[0].nombre} aporta **${conDatos[0].impactoPunto}** puntos al índice global.`;
      }
    } catch (error) {
      console.error("Error en análisis impacto:", error);
    }
    return `La dimensión con **mayor impacto** en el índice global depende del peso (Transformación Digital Empresarial 30% es la mayor) y del margen de mejora actual. No se han podido obtener los datos para el cálculo en este momento.`;
  }

  // --- Qué ocurriría si aumentara la adopción de IA un 10% (calculado) ---
  if (
    (lowerQuery.includes("qué ocurriría") || lowerQuery.includes("que ocurriria") || lowerQuery.includes("qué pasaría") || lowerQuery.includes("que pasaria") || lowerQuery.includes("simulación") || lowerQuery.includes("simulacion") || lowerQuery.includes("si aumentara") || lowerQuery.includes("si creciera"))
  ) {
    try {
      let territorio = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : "Valencia";
      const indiceActual = await getIndiceGlobalTerritorio(territorio, 2024);
      const scoreTDE = await getDimensionScore("Transformación Digital Empresarial", territorio, 2024);
      const pesoTDE = PESOS_DIMENSIONES.find(p => p.nombre.includes("Transformación"))?.peso || 30;

      let respuesta = `**Simulación: +10% adopción de IA** en ${territorio}:\n\n`;
      respuesta += `**Estado actual:**\n`;
      if (indiceActual) respuesta += `• Índice global BRAINNOVA: **${indiceActual}** puntos\n`;
      if (scoreTDE > 0) respuesta += `• Score Transformación Digital Empresarial: **${scoreTDE}** puntos\n`;
      respuesta += `• Peso de la dimensión: **${pesoTDE}%**\n\n`;

      respuesta += `**Estimación del impacto:**\n`;
      respuesta += `1. Un +10% en el indicador de IA (importancia "Alta", peso 3) dentro de una subdimensión con ~5 indicadores → la subdimensión sube ~6-8 puntos\n`;
      respuesta += `2. Si la dimensión Transformación Digital tiene ~4 subdimensiones → la dimensión sube ~**2-3 puntos**\n`;

      if (scoreTDE > 0) {
        const nuevoScoreTDE = scoreTDE + 2.5;
        const impactoIndice = Math.round(2.5 * pesoTDE / 100 * 10) / 10;
        respuesta += `3. Score TDE pasaría de ${scoreTDE} a ~**${Math.round(nuevoScoreTDE)}**\n`;
        respuesta += `4. Impacto en índice global: ~**+${impactoIndice}** puntos`;
        if (indiceActual) {
          const nuevoIndice = Math.round((indiceActual + impactoIndice) * 10) / 10;
          respuesta += ` (de ${indiceActual} a ~**${nuevoIndice}**)`;
        }
        respuesta += `\n`;
      }

      respuesta += `\nPara una simulación exacta, consulta la sección **BRAINNOVA Score** del menú.`;
      return respuesta;
    } catch (error) {
      console.error("Error en simulación:", error);
    }
    return `Un aumento del 10% en IA impactaría en Transformación Digital Empresarial (peso 30%) y subiría el índice global ~0,6-0,9 puntos. No se han podido obtener datos para una estimación más precisa.`;
  }

  // --- Correlación entre capital humano y digitalización empresarial ---
  if (
    lowerQuery.includes("correlación") || lowerQuery.includes("correlacion")
  ) {
    try {
      const dimensiones = await getDimensiones();
      const provinciasNombres = ["Valencia", "Alicante", "Castellón"];
      const datos: Array<{ prov: string; capitalHumano: number; transformacion: number }> = [];
      for (const prov of provinciasNombres) {
        const ch = await getDimensionScore("Capital Humano", prov, 2024);
        const td = await getDimensionScore("Transformación Digital Empresarial", prov, 2024);
        if (ch > 0 && td > 0) datos.push({ prov, capitalHumano: ch, transformacion: td });
      }
      if (datos.length > 0) {
        const lineas = datos.map(d => `• **${d.prov}**: Capital Humano ${d.capitalHumano} | Transformación Digital ${d.transformacion}`).join("\n");
        return `**Relación entre Capital Humano y Transformación Digital Empresarial** por provincia:\n\n${lineas}\n\nLos datos sugieren que las provincias con mayor score en Capital Humano tienden a tener también mejores resultados en digitalización empresarial, lo que indica una **correlación positiva**. El capital humano actúa como habilitador de la transformación digital.\n\nPara un análisis estadístico formal (coeficiente de correlación), se pueden exportar los datos desde **Comparación Territorial** o **Todos los Indicadores (KPIs)**.`;
      }
    } catch (error) {
      console.error("Error en análisis correlación:", error);
    }
    return `La **correlación entre Capital Humano y digitalización empresarial** puede analizarse comparando los scores de ambas dimensiones por territorio en **Comparación Territorial** y en el **Dashboard**. Generalmente existe una correlación positiva: territorios con mayor capital humano digital tienden a tener mayor transformación digital empresarial. Para un análisis estadístico formal se pueden exportar los datos.`;
  }

  // --- Indicadores/subdimensiones que explican la brecha con top europeo (calculado) ---
  if (
    (lowerQuery.includes("indicadores") || lowerQuery.includes("indicador") || lowerQuery.includes("subdimensiones") || lowerQuery.includes("qué explica") || lowerQuery.includes("que explica")) &&
    (lowerQuery.includes("explican") || lowerQuery.includes("causan") || lowerQuery.includes("explica")) &&
    (lowerQuery.includes("brecha") || lowerQuery.includes("gap") || lowerQuery.includes("europeo") || lowerQuery.includes("ue"))
  ) {
    try {
      let territorio = "Valencia";
      if (provinciaKey) territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      const dimensiones = await getDimensiones();
      const brechasPorSub: Array<{ sub: string; dim: string; score: number; ue: number; diff: number }> = [];
      for (const dim of dimensiones) {
        const subs = await getSubdimensionesConScores(dim.nombre, territorio, 2024);
        for (const sub of subs) {
          if (sub.score > 0 && sub.ue > 0 && sub.score < sub.ue) {
            brechasPorSub.push({ sub: sub.nombre, dim: dim.nombre, score: sub.score, ue: sub.ue, diff: sub.ue - sub.score });
          }
        }
      }
      if (brechasPorSub.length > 0) {
        brechasPorSub.sort((a, b) => b.diff - a.diff);
        const top10 = brechasPorSub.slice(0, 10);
        const lista = top10.map((s, i) => `${i + 1}. **${s.sub}** (${s.dim}): ${territorio} ${s.score} vs UE ${s.ue} (**−${s.diff} puntos**)`).join("\n");
        return `**Subdimensiones que más explican la brecha con la UE** en ${territorio} (ordenadas por diferencia):\n\n${lista}\n\nEstas son las ${brechasPorSub.length} subdimensiones donde ${territorio} está por debajo de la media UE. Las primeras del listado son las que más contribuyen a la brecha global. Mejorar sus indicadores tendría el mayor impacto.`;
      }
      return `No se han encontrado subdimensiones de ${territorio} con brecha significativa respecto a la media UE en los datos disponibles.`;
    } catch (error) {
      console.error("Error calculando brecha subdimensiones UE:", error);
    }
  }

  // --- Áreas a priorizar para mejorar el índice global ---
  if (
    (lowerQuery.includes("priorizar") || lowerQuery.includes("priorizar") || lowerQuery.includes("áreas") || lowerQuery.includes("areas")) &&
    (lowerQuery.includes("mejorar") || lowerQuery.includes("índice") || lowerQuery.includes("indice") || lowerQuery.includes("subir"))
  ) {
    try {
      let territorio = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : "Valencia";
      const dimensiones = await getDimensiones();
      const scoresPairs = await Promise.all(
        dimensiones.map(async (dim) => {
          const score = await getDimensionScore(dim.nombre, territorio, 2024);
          const pesoDim = PESOS_DIMENSIONES.find(p => p.nombre.toLowerCase().includes(dim.nombre.toLowerCase().slice(0, 15)))?.peso || 10;
          return { nombre: dim.nombre, score, peso: pesoDim, impactoPotencial: Math.round((100 - score) * pesoDim / 100) };
        })
      );
      const conDatos = scoresPairs.filter(s => s.score > 0);
      if (conDatos.length > 0) {
        conDatos.sort((a, b) => b.impactoPotencial - a.impactoPotencial);
        const ranking = conDatos.map((s, i) => `${i + 1}. **${s.nombre}** — score actual: ${s.score}, peso: ${s.peso}%, impacto potencial: **+${s.impactoPotencial}** puntos si llegara a 100`).join("\n");
        return `**Áreas a priorizar para mejorar el índice BRAINNOVA** en ${territorio} (ordenadas por impacto potencial):\n\n${ranking}\n\nLa priorización combina dos factores: el **peso** de la dimensión y su **margen de mejora** (distancia a 100). Las dimensiones con mayor "impacto potencial" son las que más beneficio aportarían al índice global si se mejoran.`;
      }
    } catch (error) {
      console.error("Error en análisis priorización:", error);
    }
  }

  // --- Comparación Valencia con Madrid ---
  if (
    lowerQuery.includes("madrid") &&
    (lowerQuery.includes("compara") || lowerQuery.includes("comparación") || lowerQuery.includes("comparacion") || lowerQuery.includes("frente") || lowerQuery.includes("versus") || lowerQuery.includes("vs"))
  ) {
    return `La comparación de **Valencia con Madrid** en capital humano digital u otras dimensiones requiere datos de ambas regiones. El panel BRAINNOVA está centrado en la **Comunitat Valenciana** (Valencia, Alicante, Castellón).\n\nPara una comparación interregional:\n• Los datos de la CV se encuentran en **Comparación Territorial** y el **Dashboard**\n• Los datos de Madrid podrían obtenerse de fuentes como el DESI regional o informes del INE sobre digitalización por CC.AA.\n• A nivel europeo, se pueden usar datos de Eurostat para comparar regiones NUTS-2\n\nDentro de la CV, puedes comparar las tres provincias en todas las dimensiones. ¿Quieres ver la comparación entre Valencia, Alicante y Castellón en Capital Humano?`;
  }

  // --- Qué provincia lidera en una dimensión ---
  if (
    (lowerQuery.includes("provincia lidera") || lowerQuery.includes("provincia mejor") || lowerQuery.includes("quién lidera") || lowerQuery.includes("quien lidera") || lowerQuery.includes("cuál lidera") || lowerQuery.includes("cual lidera"))
  ) {
    try {
      const dimensiones = await getDimensiones();
      const dimMencionada = dimensiones.find(d => lowerQuery.includes(d.nombre.toLowerCase()));
      if (dimMencionada) {
        const [valencia, alicante, castellon] = await Promise.all([
          getDimensionScore(dimMencionada.nombre, "Valencia", 2024),
          getDimensionScore(dimMencionada.nombre, "Alicante", 2024),
          getDimensionScore(dimMencionada.nombre, "Castellón", 2024),
        ]);
        const provincias = [
          { nombre: "Valencia", score: valencia },
          { nombre: "Alicante", score: alicante },
          { nombre: "Castellón", score: castellon },
        ].sort((a, b) => b.score - a.score);
        return `**Ranking provincial en ${dimMencionada.nombre}:**\n\n${provincias.map((p, i) => `${i + 1}. **${p.nombre}**: ${p.score} puntos`).join("\n")}\n\nLa provincia que **lidera** en ${dimMencionada.nombre} es **${provincias[0].nombre}** con ${provincias[0].score} puntos.`;
      }
      const resultados: Array<{ dim: string; lider: string; score: number }> = [];
      for (const dim of dimensiones) {
        const [v, a, c] = await Promise.all([
          getDimensionScore(dim.nombre, "Valencia", 2024),
          getDimensionScore(dim.nombre, "Alicante", 2024),
          getDimensionScore(dim.nombre, "Castellón", 2024),
        ]);
        const max = Math.max(v, a, c);
        const lider = max === v ? "Valencia" : max === a ? "Alicante" : "Castellón";
        if (max > 0) resultados.push({ dim: dim.nombre, lider, score: max });
      }
      if (resultados.length > 0) {
        const lista = resultados.map(r => `• **${r.dim}**: lidera **${r.lider}** (${r.score} pts)`).join("\n");
        return `**Provincia líder por dimensión:**\n\n${lista}`;
      }
    } catch (error) {
      console.error("Error provincia lidera:", error);
    }
  }

  // --- Posición de la CV respecto a la UE (calculado) ---
  if (
    (lowerQuery.includes("posición") || lowerQuery.includes("posicion") || lowerQuery.includes("respecto") || lowerQuery.includes("comparación con") || lowerQuery.includes("comparacion con") || lowerQuery.includes("frente a")) &&
    (lowerQuery.includes("ue") || lowerQuery.includes("unión europea") || lowerQuery.includes("union europea") || lowerQuery.includes("europa") || lowerQuery.includes("top eu") || lowerQuery.includes("europeo"))
  ) {
    try {
      let territorio = "Valencia";
      if (provinciaKey) territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;

      const dimensiones = await getDimensiones();
      const comparativa: Array<{
        dim: string;
        scoreTerritorio: number;
        scoreEspana: number;
        scoreUE: number;
        diffUE: number;
        posicion: string;
      }> = [];

      for (const dim of dimensiones) {
        const subs = await getSubdimensionesConScores(dim.nombre, territorio, 2024);
        const conScore = subs.filter(s => s.score > 0);
        const conEspana = subs.filter(s => s.espana > 0);
        const conUE = subs.filter(s => s.ue > 0);

        const avgTerritorio = conScore.length > 0
          ? Math.round(conScore.reduce((a, b) => a + b.score, 0) / conScore.length)
          : 0;
        const avgEspana = conEspana.length > 0
          ? Math.round(conEspana.reduce((a, b) => a + b.espana, 0) / conEspana.length)
          : 0;
        const avgUE = conUE.length > 0
          ? Math.round(conUE.reduce((a, b) => a + b.ue, 0) / conUE.length)
          : 0;

        if (avgTerritorio > 0) {
          const diffUE = avgUE > 0 ? avgTerritorio - avgUE : 0;
          let posicion = "sin datos UE";
          if (avgUE > 0) {
            if (diffUE > 5) posicion = "por encima de la UE";
            else if (diffUE >= -5) posicion = "similar a la UE";
            else posicion = "por debajo de la UE";
          }
          comparativa.push({ dim: dim.nombre, scoreTerritorio: avgTerritorio, scoreEspana: avgEspana, scoreUE: avgUE, diffUE, posicion });
        }
      }

      if (comparativa.length > 0) {
        const tabla = comparativa.map(c => {
          const signo = c.diffUE >= 0 ? "+" : "";
          const ueStr = c.scoreUE > 0 ? `${c.scoreUE}` : "N/D";
          const diffStr = c.scoreUE > 0 ? ` (${signo}${c.diffUE})` : "";
          return `| ${c.dim} | **${c.scoreTerritorio}** | ${c.scoreEspana || "N/D"} | ${ueStr} | ${c.diffUE !== 0 ? `**${signo}${c.diffUE}**` : "—"}${c.scoreUE > 0 ? ` ${c.posicion}` : ""} |`;
        }).join("\n");

        const porEncima = comparativa.filter(c => c.diffUE > 5).length;
        const porDebajo = comparativa.filter(c => c.diffUE < -5).length;
        const similar = comparativa.filter(c => c.scoreUE > 0 && c.diffUE >= -5 && c.diffUE <= 5).length;
        const sinDatosUE = comparativa.filter(c => c.scoreUE === 0).length;

        const indiceCV = comparativa.reduce((sum, c) => sum + c.scoreTerritorio, 0) / comparativa.length;
        const indiceUE = comparativa.filter(c => c.scoreUE > 0);
        const avgIndiceUE = indiceUE.length > 0 ? indiceUE.reduce((sum, c) => sum + c.scoreUE, 0) / indiceUE.length : 0;
        const diffGlobal = avgIndiceUE > 0 ? Math.round(indiceCV - avgIndiceUE) : 0;

        let resumen = `**Posición de ${territorio} respecto a la UE** (calculado por dimensión):\n\n`;
        resumen += `| Dimensión | ${territorio} | España | Media UE | Diferencia vs UE |\n`;
        resumen += `|---|---|---|---|---|\n`;
        resumen += tabla;
        resumen += `\n\n**Resumen:**\n`;
        if (avgIndiceUE > 0) {
          const signoG = diffGlobal >= 0 ? "+" : "";
          resumen += `• Índice medio ${territorio}: **${Math.round(indiceCV)}** vs Media UE: **${Math.round(avgIndiceUE)}** (${signoG}${diffGlobal} puntos)\n`;
        }
        if (porEncima > 0) resumen += `• ${porEncima} dimensión(es) **por encima** de la media UE\n`;
        if (similar > 0) resumen += `• ${similar} dimensión(es) **similar(es)** a la media UE (±5 puntos)\n`;
        if (porDebajo > 0) resumen += `• ${porDebajo} dimensión(es) **por debajo** de la media UE\n`;
        if (sinDatosUE > 0) resumen += `• ${sinDatosUE} dimensión(es) sin datos UE disponibles\n`;

        const peorBrecha = comparativa.filter(c => c.scoreUE > 0).sort((a, b) => a.diffUE - b.diffUE);
        if (peorBrecha.length > 0 && peorBrecha[0].diffUE < 0) {
          resumen += `\nLa **mayor brecha** está en **${peorBrecha[0].dim}** (${peorBrecha[0].diffUE} puntos respecto a la UE).`;
        }

        return resumen;
      }
      return `No se han podido obtener datos suficientes para calcular la posición de ${territorio} respecto a la UE. Consulta el **Dashboard** o **Comparación Territorial** para ver los datos disponibles.`;
    } catch (error) {
      console.error("Error calculando posición UE:", error);
      return `Ha ocurrido un error al calcular la posición respecto a la UE. Puedes consultar el **Dashboard** y **Dimensiones** para ver las comparativas.`;
    }
  }

  // --- Brecha entre zonas urbanas y rurales ---
  if (
    (lowerQuery.includes("brecha") || lowerQuery.includes("diferencia")) &&
    (lowerQuery.includes("urbana") || lowerQuery.includes("rural") || lowerQuery.includes("urbano") || lowerQuery.includes("rurales"))
  ) {
    return `La **brecha entre zonas urbanas y rurales** en la Comunitat Valenciana se puede aproximar comparando las provincias:\n\n• **Valencia**: mayor concentración urbana, tiende a liderar en Capital Humano y servicios digitales\n• **Alicante**: perfil mixto con buena infraestructura\n• **Castellón**: mayor ruralidad relativa, puede mostrar menor score en algunas dimensiones\n\nLos datos del panel se organizan por **provincia** (Valencia, Alicante, Castellón), no por ámbito urbano/rural directo. Para un análisis más granular, algunos indicadores pueden tener desglose territorial más fino en las fuentes originales (INE, Eurostat).\n\nPuedes comparar las tres provincias en **Comparación Territorial** para ver las diferencias actuales.`;
  }

  return null;
}

/**
 * Maneja preguntas sobre temas específicos buscando indicadores relevantes en la BD.
 */
async function handleIndicadorPorTema(
  lowerQuery: string,
  cleanQuery: string,
  provinciaKey: string | undefined
): Promise<string | null> {
  for (const tema of TEMAS_INDICADORES) {
    const coincide = tema.keywords.some(kw => lowerQuery.includes(kw));
    if (!coincide) continue;

    const indicadores = await searchIndicators(tema.searchTerms.join(" "));
    if (indicadores.length === 0) {
      for (const term of tema.searchTerms) {
        const alt = await searchIndicators(term);
        if (alt.length > 0) {
          indicadores.push(...alt);
          break;
        }
      }
    }

    if (indicadores.length > 0) {
      const nombreProvincia = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : undefined;
      const detalle = await getIndicatorDetails(indicadores[0].nombre, {
        pais: nombreProvincia,
        periodo: 2024,
      });

      if (detalle) {
        let respuesta = `**${detalle.nombre}**\n\n`;
        if (detalle.dimension) respuesta += `Dimensión: ${detalle.dimension}\n`;
        if (detalle.subdimension) respuesta += `Subdimensión: ${detalle.subdimension}\n`;
        if (detalle.importancia) respuesta += `Importancia: ${detalle.importancia}\n`;
        if (detalle.formula) respuesta += `Fórmula: ${detalle.formula}\n`;
        if (detalle.fuente) respuesta += `Fuente: ${detalle.fuente}\n`;

        if (detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
          respuesta += `\nÚltimo valor${nombreProvincia ? ` en **${nombreProvincia}**` : ""}: **${detalle.ultimoValor}**`;
          if (detalle.ultimoPeriodo) respuesta += ` (período ${detalle.ultimoPeriodo})`;
          if (detalle.ultimoPais && !nombreProvincia) respuesta += ` — ${detalle.ultimoPais}`;
        } else {
          respuesta += `\nNo hay un valor registrado para este indicador${nombreProvincia ? ` en ${nombreProvincia}` : ""}. Consulta **Todos los Indicadores (KPIs)** para más detalle.`;
        }

        if (indicadores.length > 1) {
          respuesta += `\n\nTambién hay ${indicadores.length - 1} indicador(es) más sobre ${tema.contexto}. ¿Quieres el detalle de alguno?`;
        }

        return respuesta;
      }
    }

    return `No he encontrado datos específicos sobre **${tema.contexto}** en la base de datos actual. Este indicador pertenece a la dimensión **${tema.dimensionHint}**. Puedes consultar **Dimensiones** → ${tema.dimensionHint} o **Todos los Indicadores (KPIs)** para explorar los indicadores disponibles.`;
  }

  return null;
}

/**
 * Genera una respuesta del chatbot basada en la consulta del usuario
 */
export async function generateChatbotResponse(userQuery: string): Promise<string> {
  const cleanQuery = userQuery.replace(/[¿?¡!]/g, '').trim();
  // Normalizar typos frecuentes antes de analizar
  const lowerQuery = cleanQuery.toLowerCase()
    .replace(/puntauaci[oó]n/g, "puntuación")
    .replace(/puntuci[oó]n/g, "puntuación")
    .replace(/puntución/g, "puntuación")
    .replace(/domensiones/g, "dimensiones")
    .replace(/dimesiones/g, "dimensiones")
    .replace(/dimenciones/g, "dimensiones")
    .replace(/dimenisones/g, "dimensiones")
    .replace(/dimesi[oó]n/g, "dimensión")
    .replace(/dimens[oó]n/g, "dimensión")
    .replace(/indicadore(?!s)/g, "indicadores")
    .replace(/evoluci[oó]n/g, "evolución")
    .replace(/castellon(?!é)/g, "castellón");

  // Detectar provincia mencionada (se usa en varios handlers)
  const provinciaKeyDetectada = Object.keys(NOMBRES_PROVINCIAS).find(
    (key) => lowerQuery.includes(key)
  );

  // --- 1. Preguntas sobre modelo, metodología y cálculos (respuestas estáticas precisas) ---
  const respuestaModelo = handlePreguntasModelo(lowerQuery);
  if (respuestaModelo) return respuestaModelo;

  // --- 2. Preguntas de análisis avanzado (brecha UE, priorización, impacto, etc.) ---
  const respuestaAnalisis = await handlePreguntasAnalisis(lowerQuery, provinciaKeyDetectada);
  if (respuestaAnalisis) return respuestaAnalisis;

  // --- 3. Puntuación / índice global de la Comunitat Valenciana (desde Supabase) ---
  const preguntaPuntuacionGlobal =
    (lowerQuery.includes("puntuación global") || lowerQuery.includes("puntuacion global") ||
     lowerQuery.includes("índice global") || lowerQuery.includes("indice global") ||
     ((lowerQuery.includes("puntuación") || lowerQuery.includes("puntuacion")) && (lowerQuery.includes("comunitat") || lowerQuery.includes("comunidad valenciana") || lowerQuery.includes("valenciana"))));

  if (preguntaPuntuacionGlobal) {
    const valor = await getIndiceGlobalTerritorio("Comunitat Valenciana", 2024);
    if (valor != null) {
      return `La **puntuación global** de la **Comunitat Valenciana** en el índice BRAINNOVA es de **${valor}** puntos sobre 100. Este valor se obtiene a partir de los datos en Supabase (scores de las 7 dimensiones del territorio). Puedes ver el detalle por dimensiones en *Comparación Territorial* y en el *Dashboard*.`;
    }
    return `No he podido obtener la puntuación global de la Comunitat Valenciana desde la base de datos en este momento. Puedes consultar el **Dashboard** o la sección **Comparación Territorial** para ver el índice por provincia y la media regional.`;
  }

  // --- Índice BRAINNOVA por provincia (Alicante, Castellón, Valencia) ---
  const provinciaKey = provinciaKeyDetectada;
  const preguntaIndiceProvincia =
    (lowerQuery.includes("índice") || lowerQuery.includes("indice")) &&
    (lowerQuery.includes("brainnova") ||
      lowerQuery.includes("economía digital") ||
      lowerQuery.includes("economia digital") ||
      lowerQuery.includes("digital")) &&
    (provinciaKey || lowerQuery.includes("provincia") || lowerQuery.includes("alicante") || lowerQuery.includes("castellón") || lowerQuery.includes("castellon") || lowerQuery.includes("valencia"));

  if (preguntaIndiceProvincia) {
    if (provinciaKey) {
      const datos = INDICE_POR_PROVINCIA[provinciaKey];
      const nombreProvincia = NOMBRES_PROVINCIAS[provinciaKey];
      if (datos) {
        return `El **índice BRAINNOVA** de la provincia de **${nombreProvincia}** es **${datos.indice}** puntos (sobre 100), en posición ${datos.ranking} de las tres provincias de la Comunitat Valenciana. La dimensión más destacada en ${nombreProvincia} es **${datos.dimensionDestacada}** con ${datos.puntosDimension} puntos.\n\nPuedes ver el detalle en la sección *Comparación Territorial* del dashboard.`;
      }
    }
    // Pregunta por índice en general (todas las provincias)
    const provinciasListado = [
      { key: "valencia", nombre: "Valencia" },
      { key: "alicante", nombre: "Alicante" },
      { key: "castellón", nombre: "Castellón" },
    ];
    const lineas = provinciasListado
      .map(({ key, nombre }) => {
        const datos = INDICE_POR_PROVINCIA[key] || INDICE_POR_PROVINCIA["castellon"];
        return datos ? `• **${nombre}**: ${datos.indice} puntos (ranking ${datos.ranking})` : "";
      })
      .filter(Boolean);
    return `**Índice BRAINNOVA por provincia** (Comunitat Valenciana):\n\n${lineas.join("\n")}\n\nPuedes ver el detalle en *Comparación Territorial* en el menú.`;
  }

  // --- Digitalización BÁSICA: desambiguar empresas (subdimensión) vs personas (indicador) ---
  const buscaDigitalizacionBasica =
    lowerQuery.includes("digitalización básica") ||
    lowerQuery.includes("digitalizacion basica") ||
    lowerQuery.includes("digitalización basica") ||
    (lowerQuery.includes("digitalizacion") && lowerQuery.includes("basica"));
  const referenciaEmpresas = lowerQuery.includes("empresa") || lowerQuery.includes("empresas");
  const referenciaPersonasHabilidades =
    (lowerQuery.includes("personas") && lowerQuery.includes("habilidades")) ||
    (lowerQuery.includes("personas") && lowerQuery.includes("digitales")) ||
    (lowerQuery.includes("habilidades digitales") && lowerQuery.includes("personas"));

  if (buscaDigitalizacionBasica) {
    // Caso 1: usuario pregunta explícitamente por personas/habilidades → indicador "Personas con habilidades digitales básicas"
    if (referenciaPersonasHabilidades && !referenciaEmpresas) {
      const indicadores = await searchIndicators("personas habilidades digitales básicas");
      const indicadorPersonas = indicadores.find(
        (ind) =>
          ind.nombre?.toLowerCase().includes("habilidades") ||
          ind.nombre?.toLowerCase().includes("personas")
      ) || indicadores[0];
      if (indicadorPersonas) {
        const nombreProvincia = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : undefined;
        const detalle = await getIndicatorDetails(indicadorPersonas.nombre, {
          pais: nombreProvincia,
          periodo: 2024,
        });
        if (detalle) {
          let respuesta = `**${detalle.nombre}**\n\n`;
          if (detalle.dimension) respuesta += `📊 Dimensión: ${detalle.dimension}\n`;
          if (detalle.subdimension) respuesta += `📈 Subdimensión: ${detalle.subdimension}\n`;
          if (detalle.importancia) respuesta += `⭐ Importancia: ${detalle.importancia}\n`;
          if (detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
            respuesta += `\n📊 ${nombreProvincia ? `Valor en **${nombreProvincia}**` : "Último valor disponible"}: **${detalle.ultimoValor}**`;
            if (detalle.ultimoPeriodo) respuesta += ` (período ${detalle.ultimoPeriodo})`;
            if (detalle.ultimoPais && !nombreProvincia) respuesta += ` - ${detalle.ultimoPais}`;
          }
          return respuesta;
        }
      }
    }

    // Caso 2: digitalización básica en empresas o por territorio (Castellón, etc.) → subdimensión "Digitalización Básica" (Transformación Digital Empresarial)
    const dimensionTransformacion = "Transformación Digital Empresarial";
    const periodoChatbot = 2024;
    const provinciasParaListar = [
      { key: "valencia" as const, nombre: "Valencia" },
      { key: "alicante" as const, nombre: "Alicante" },
      { key: "castellón" as const, nombre: "Castellón" },
    ];
    const provinciaParaConsulta = provinciaKey
      ? (provinciaKey === "castellón" ? "Castellón" : (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey))
      : null;

    const subs =
      provinciaParaConsulta
        ? await getSubdimensionesConScores(dimensionTransformacion, provinciaParaConsulta, periodoChatbot)
        : await getSubdimensionesConScores(dimensionTransformacion, "Valencia", periodoChatbot);
    const subParaScore = subs.find(
      (s) =>
        (s.nombre.toLowerCase().includes("digitalización") || s.nombre.toLowerCase().includes("digitalizacion")) &&
        (s.nombre.toLowerCase().includes("básica") || s.nombre.toLowerCase().includes("basica"))
    );

    if (subParaScore) {
      if (provinciaParaConsulta) {
        const score = subParaScore.score;
        return `El **nivel de digitalización básica en las empresas** en **${provinciaParaConsulta}** (subdimensión **${subParaScore.nombre}**, dentro de Transformación Digital Empresarial) es de **${score}** puntos sobre 100. Esta subdimensión mide el grado de adopción de digitalización básica en el tejido empresarial.\n\nPuedes ver el detalle por dimensiones en *Comparación Territorial*.`;
      }
      // Sin provincia: devolver las tres
      const lineas: string[] = [];
      for (const { key, nombre } of provinciasParaListar) {
        const subsProv = await getSubdimensionesConScores(
          dimensionTransformacion,
          nombre,
          periodoChatbot
        );
        const sub = subsProv.find(
          (s) =>
            (s.nombre.toLowerCase().includes("digitalización") || s.nombre.toLowerCase().includes("digitalizacion")) &&
            (s.nombre.toLowerCase().includes("básica") || s.nombre.toLowerCase().includes("basica"))
        );
        if (sub) lineas.push(`• **${nombre}**: ${sub.score} puntos`);
      }
      if (lineas.length > 0) {
        const nombreSub = subParaScore.nombre;
        return `**Digitalización básica en las empresas** (subdimensión ${nombreSub}, Transformación Digital Empresarial) por provincia:\n\n${lineas.join("\n")}\n\nPuedes ver el detalle en *Comparación Territorial* o en la ficha de la dimensión *Transformación Digital Empresarial*.`;
      }
    }
  }

  // --- Nivel de digitalización de las empresas (dimensión completa, sin "básica") por provincia ---
  const preguntaDigitalizacionEmpresas =
    (lowerQuery.includes("digitalización") || lowerQuery.includes("digitalizacion")) &&
    (lowerQuery.includes("empresa") || lowerQuery.includes("empresas")) &&
    !buscaDigitalizacionBasica &&
    (provinciaKey || lowerQuery.includes("castellón") || lowerQuery.includes("castellon") || lowerQuery.includes("alicante") || lowerQuery.includes("valencia"));

  if (preguntaDigitalizacionEmpresas) {
    if (provinciaKey) {
      const key = provinciaKey === "castellón" ? "castellón" : provinciaKey;
      const dims = DIMENSION_POR_PROVINCIA[key] || DIMENSION_POR_PROVINCIA[provinciaKey];
      const nombreProvincia = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      const scoreTransformacion = dims?.["Transformación Digital Empresarial"];
      if (scoreTransformacion !== undefined) {
        return `El **nivel de digitalización de las empresas** en **${nombreProvincia}** (dimensión Transformación Digital Empresarial) es de **${scoreTransformacion}** puntos sobre 100. Esta dimensión mide el grado de adopción e integración de tecnologías digitales en las empresas.\n\nPara el dato de **digitalización básica** (subdimensión) puedes preguntar: "¿Cómo está la digitalización básica en las empresas de ${nombreProvincia}?".\n\nEn *Comparación Territorial* puedes ver el resto de dimensiones por provincia.`;
      }
    }
    const lineas = [
      { nombre: "Valencia", key: "valencia" },
      { nombre: "Alicante", key: "alicante" },
      { nombre: "Castellón", key: "castellón" },
    ].map(({ nombre, key }) => {
      const dims = DIMENSION_POR_PROVINCIA[key];
      const score = dims?.["Transformación Digital Empresarial"];
      return score !== undefined ? `• **${nombre}**: ${score} puntos` : "";
    }).filter(Boolean);
    if (lineas.length > 0) {
      return `**Nivel de digitalización de las empresas** (dimensión Transformación Digital Empresarial) por provincia:\n\n${lineas.join("\n")}\n\nPuedes ver el detalle en *Comparación Territorial*.`;
    }
  }

  // --- Indicador "personas con habilidades digitales básicas" cuando se pregunta por habilidades (sin "digitalización básica" ya tratada) ---
  const buscaHabilidadesDigitales =
    (lowerQuery.includes("habilidades digitales") || lowerQuery.includes("habilidad digital") || lowerQuery.includes("personas con habilidades")) &&
    !buscaDigitalizacionBasica;

  if (buscaHabilidadesDigitales) {
    const indicadores = await searchIndicators("habilidades digitales básicas personas");
    const indicadorPersonas = indicadores.find(
      (ind) =>
        ind.nombre?.toLowerCase().includes("habilidades") || ind.nombre?.toLowerCase().includes("personas")
    ) || indicadores[0];
    if (indicadorPersonas) {
      const nombreProvincia = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : undefined;
      const detalle = await getIndicatorDetails(indicadorPersonas.nombre, {
        pais: nombreProvincia,
        periodo: 2024,
      });
      if (detalle) {
        let respuesta = `**${detalle.nombre}**\n\n`;
        if (detalle.dimension) respuesta += `📊 Dimensión: ${detalle.dimension}\n`;
        if (detalle.subdimension) respuesta += `📈 Subdimensión: ${detalle.subdimension}\n`;
        if (detalle.importancia) respuesta += `⭐ Importancia: ${detalle.importancia}\n`;
        if (detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
          respuesta += `\n📊 ${nombreProvincia ? `Valor en **${nombreProvincia}**` : "Último valor disponible"}: **${detalle.ultimoValor}**`;
          if (detalle.ultimoPeriodo) respuesta += ` (período ${detalle.ultimoPeriodo})`;
          if (detalle.ultimoPais && !nombreProvincia) respuesta += ` - ${detalle.ultimoPais}`;
        }
        if (indicadores.length > 1) {
          respuesta += `\n\nTambién hay ${indicadores.length - 1} indicador(es) más relacionados. ¿Quieres el detalle de otro?`;
        }
        return respuesta;
      }
    }
    const fallback = await searchIndicators("habilidades digitales básicas");
    if (fallback.length > 0) {
      const lista = fallback.slice(0, 5).map((ind, i) => `${i + 1}. **${ind.nombre}**`).join("\n");
      return `Indicadores relacionados:\n\n${lista}\n\n¿Sobre cuál quieres el valor o la definición?`;
    }
  }

  // --- Mejor/peor dimensión de un territorio ---
  const tieneDimension = lowerQuery.includes("dimensión") || lowerQuery.includes("dimension") || lowerQuery.includes("dimensiones");
  const tieneTerritorio = lowerQuery.includes("comunitat") || lowerQuery.includes("comunidad valenciana") || lowerQuery.includes("valenciana") ||
    provinciaKey != null || lowerQuery.includes("valencia") || lowerQuery.includes("alicante") ||
    lowerQuery.includes("castellón") || lowerQuery.includes("castellon");
  const palabrasMejor = lowerQuery.includes("mejor") || lowerQuery.includes("mayor") || lowerQuery.includes("más alta") || lowerQuery.includes("mas alta") || lowerQuery.includes("más alto") || lowerQuery.includes("más fuerte") || lowerQuery.includes("punto fuerte") || lowerQuery.includes("destaca");
  const palabrasPeor = lowerQuery.includes("peor") || lowerQuery.includes("menor") || lowerQuery.includes("más baja") || lowerQuery.includes("mas baja") || lowerQuery.includes("más bajo") || lowerQuery.includes("más débil") || lowerQuery.includes("punto débil");

  const preguntaMejorPeorDimension =
    (palabrasMejor || palabrasPeor) && tieneDimension && tieneTerritorio;

  if (preguntaMejorPeorDimension) {
    try {
      const esPeor = palabrasPeor && !palabrasMejor;
      let territorio = "Comunitat Valenciana";
      if (provinciaKey) {
        territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      } else if (lowerQuery.includes("valencia") && !lowerQuery.includes("comunitat") && !lowerQuery.includes("comunidad")) {
        territorio = "Valencia";
      } else if (lowerQuery.includes("alicante")) {
        territorio = "Alicante";
      } else if (lowerQuery.includes("castellón") || lowerQuery.includes("castellon")) {
        territorio = "Castellón";
      }

      const dimensiones = await getDimensiones();
      if (dimensiones && dimensiones.length > 0) {
        const scorePairs = await Promise.all(
          dimensiones.map(async (dim) => ({
            nombre: dim.nombre,
            score: await getDimensionScore(dim.nombre, territorio, 2024),
          }))
        );
        const conDatos = scorePairs.filter(s => s.score > 0);
        if (conDatos.length > 0) {
          conDatos.sort((a, b) => b.score - a.score);
          const target = esPeor ? conDatos[conDatos.length - 1] : conDatos[0];
          const ranking = conDatos.map((s, i) => `${i + 1}. **${s.nombre}**: ${s.score} puntos`).join("\n");
          return `${esPeor ? "La dimensión con peor resultado" : "La dimensión con mejor resultado"} en **${territorio}** es **${target.nombre}** con **${target.score}** puntos sobre 100.\n\n**Ranking completo de dimensiones (${territorio}):**\n\n${ranking}`;
        }
        return `No tengo datos suficientes para determinar la ${esPeor ? "peor" : "mejor"} dimensión de ${territorio} en este momento. Lo siento.`;
      }
    } catch (error) {
      console.error("Error fetching best/worst dimension:", error);
    }
  }

  // --- Evolución del índice en los últimos años ---
  const preguntaEvolucion =
    (lowerQuery.includes("evolucion") || lowerQuery.includes("evolución") || lowerQuery.includes("evolucionado") ||
     lowerQuery.includes("tendencia") || lowerQuery.includes("últimos") || lowerQuery.includes("ultimos")) &&
    (lowerQuery.includes("índice") || lowerQuery.includes("indice") || lowerQuery.includes("brainnova") ||
     lowerQuery.includes("año") || lowerQuery.includes("años") || lowerQuery.includes("anual"));

  if (preguntaEvolucion) {
    try {
      const periodos = [2023, 2024, 2025];
      const territorio = provinciaKey ? (NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey) : "Comunitat Valenciana";
      const resultados: { periodo: number; valor: number | null }[] = [];
      for (const p of periodos) {
        const val = await getIndiceGlobalTerritorio(territorio, p);
        resultados.push({ periodo: p, valor: val });
      }
      const conDatos = resultados.filter(r => r.valor != null && r.valor > 0);
      if (conDatos.length >= 2) {
        const lineas = conDatos.map(r => `• **${r.periodo}**: ${r.valor} puntos`).join("\n");
        const primero = conDatos[0];
        const ultimo = conDatos[conDatos.length - 1];
        const diff = (ultimo.valor! - primero.valor!).toFixed(1);
        const signo = Number(diff) >= 0 ? "+" : "";
        return `**Evolución del índice BRAINNOVA en ${territorio}:**\n\n${lineas}\n\nVariación ${primero.periodo}–${ultimo.periodo}: **${signo}${diff} puntos**.\n\nPuedes ver más detalles en la sección *Evolución Temporal* del menú.`;
      }
      if (conDatos.length === 1) {
        return `Solo tengo datos del índice BRAINNOVA de **${territorio}** para el año **${conDatos[0].periodo}**: **${conDatos[0].valor}** puntos. No dispongo de datos históricos suficientes para mostrar la evolución. Lo siento.`;
      }
      return `No tengo datos históricos del índice BRAINNOVA para ${territorio} en este momento. Puedes consultar la sección *Evolución Temporal* del menú para más información.`;
    } catch (error) {
      console.error("Error fetching evolution:", error);
    }
  }

  // --- Preguntas sobre cobertura, 5G, fibra u otros indicadores específicos por territorio ---
  const preguntaCobertura =
    lowerQuery.includes("cobertura") || lowerQuery.includes("5g") || lowerQuery.includes("fibra") ||
    lowerQuery.includes("banda ancha") || lowerQuery.includes("conectividad");

  if (preguntaCobertura) {
    try {
      const terminos = ["5g", "fibra", "banda ancha", "cobertura", "conectividad"].filter(t => lowerQuery.includes(t));
      const busqueda = terminos.join(" ");
      const indicadores = await searchIndicators(busqueda);
      if (indicadores.length > 0) {
        let territorio: string | undefined;
        if (provinciaKey) territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
        else if (lowerQuery.includes("comunitat") || lowerQuery.includes("comunidad valenciana") || lowerQuery.includes("valenciana")) territorio = "Comunitat Valenciana";
        else if (lowerQuery.includes("españa") || lowerQuery.includes("spain")) territorio = "España";

        const detalle = await getIndicatorDetails(indicadores[0].nombre, {
          pais: territorio,
          periodo: 2024,
        });
        if (detalle) {
          let respuesta = `**${detalle.nombre}**\n\n`;
          if (detalle.dimension) respuesta += `📊 Dimensión: ${detalle.dimension}\n`;
          if (detalle.subdimension) respuesta += `📈 Subdimensión: ${detalle.subdimension}\n`;
          if (detalle.importancia) respuesta += `⭐ Importancia: ${detalle.importancia}\n`;
          if (detalle.ultimoValor !== undefined && detalle.ultimoValor !== null) {
            respuesta += `\n📊 ${territorio ? `Valor en **${territorio}**` : "Último valor disponible"}: **${detalle.ultimoValor}**`;
            if (detalle.ultimoPeriodo) respuesta += ` (período ${detalle.ultimoPeriodo})`;
            if (detalle.ultimoPais && !territorio) respuesta += ` - ${detalle.ultimoPais}`;
          } else {
            respuesta += `\nNo tengo un valor registrado para este indicador${territorio ? ` en ${territorio}` : ""}. Lo siento.`;
          }
          if (indicadores.length > 1) {
            respuesta += `\n\nTambién hay ${indicadores.length - 1} indicador(es) más relacionados con ${busqueda}. ¿Quieres el detalle de otro?`;
          }
          return respuesta;
        }
      }
      return `No he encontrado datos de ${busqueda} en la base de datos. Lo siento. Puedes consultar la sección *Dimensiones* > *Infraestructura Digital* para ver indicadores de conectividad.`;
    } catch (error) {
      console.error("Error fetching coverage:", error);
    }
  }

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
  
  // --- Puntuaciones/scores de todas las dimensiones para un territorio (calculado) ---
  const pidePuntuacionesDimensiones =
    (lowerQuery.includes("puntuaciones") || lowerQuery.includes("puntuación") || lowerQuery.includes("puntuacion") ||
     lowerQuery.includes("scores") || lowerQuery.includes("resultados") || lowerQuery.includes("notas") ||
     lowerQuery.includes("valores")) &&
    (lowerQuery.includes("dimensiones") || lowerQuery.includes("dimensión") || lowerQuery.includes("dimension") ||
     lowerQuery.includes("cada dimensión") || lowerQuery.includes("cada dimension") ||
     lowerQuery.includes("todas las dimensiones") || lowerQuery.includes("por dimensión") || lowerQuery.includes("por dimension")) &&
    (provinciaKey != null || lowerQuery.includes("comunitat") || lowerQuery.includes("comunidad valenciana") ||
     lowerQuery.includes("valenciana") || lowerQuery.includes("valencia") || lowerQuery.includes("alicante") ||
     lowerQuery.includes("castellón") || lowerQuery.includes("castellon"));

  if (pidePuntuacionesDimensiones) {
    try {
      let territorio = "Valencia";
      if (provinciaKey) {
        territorio = NOMBRES_PROVINCIAS[provinciaKey] || provinciaKey;
      } else if (lowerQuery.includes("alicante")) {
        territorio = "Alicante";
      } else if (lowerQuery.includes("castellón") || lowerQuery.includes("castellon")) {
        territorio = "Castellón";
      } else if (lowerQuery.includes("comunitat") || lowerQuery.includes("comunidad valenciana")) {
        territorio = "Comunitat Valenciana";
      }

      const dimensiones = await getDimensiones();
      if (dimensiones && dimensiones.length > 0) {
        const scorePairs = await Promise.all(
          dimensiones.map(async (dim) => ({
            nombre: dim.nombre,
            peso: dim.peso,
            score: await getDimensionScore(dim.nombre, territorio, 2024),
          }))
        );

        const conDatos = scorePairs.filter(s => s.score > 0);
        if (conDatos.length > 0) {
          conDatos.sort((a, b) => b.score - a.score);
          const mejor = conDatos[0];
          const peor = conDatos[conDatos.length - 1];

          const indiceGlobal = await getIndiceGlobalTerritorio(territorio, 2024);

          let respuesta = `**Puntuaciones por dimensión en ${territorio}** (sobre 100):\n\n`;
          respuesta += conDatos.map((s, i) => `${i + 1}. **${s.nombre}** (peso ${s.peso}%): **${s.score}** puntos`).join("\n");
          if (indiceGlobal) {
            respuesta += `\n\n**Índice global BRAINNOVA**: **${indiceGlobal}** puntos`;
          }
          respuesta += `\n\n**Mejor dimensión**: ${mejor.nombre} (${mejor.score} pts)`;
          respuesta += `\n**Dimensión con más margen de mejora**: ${peor.nombre} (${peor.score} pts)`;

          return respuesta;
        }
        return `No se han podido obtener puntuaciones de las dimensiones para **${territorio}** en este momento. Consulta **Comparación Territorial** para ver los datos.`;
      }
    } catch (error) {
      console.error("Error fetching dimension scores for territory:", error);
    }
  }

  // --- Preguntas sobre peso / importancia de dimensiones en el índice ---
  // Nombres de dimensiones conocidos para matching flexible (sin depender de la keyword "dimensión")
  const NOMBRES_DIMENSIONES_CONOCIDAS = [
    "transformación digital empresarial",
    "capital humano",
    "infraestructura digital",
    "ecosistema y colaboración",
    "emprendimiento e innovación",
    "servicios públicos digitales",
    "sostenibilidad digital",
  ];
  const dimensionMencionada = NOMBRES_DIMENSIONES_CONOCIDAS.find(d => lowerQuery.includes(d));

  const preguntaPesoDimension =
    (lowerQuery.includes("peso") || lowerQuery.includes("ponderación") || lowerQuery.includes("ponderacion") ||
     lowerQuery.includes("importancia") || lowerQuery.includes("porcentaje")) &&
    (lowerQuery.includes("índice") || lowerQuery.includes("indice") ||
     lowerQuery.includes("dimensión") || lowerQuery.includes("dimension") ||
     dimensionMencionada != null);

  if (preguntaPesoDimension) {
    try {
      const { data: dimensiones } = await supabase
        .from('dimensiones')
        .select('nombre, peso')
        .order('peso', { ascending: false });

      if (dimensiones && dimensiones.length > 0) {
        const dimMatch = dimensiones.find(dim => lowerQuery.includes(dim.nombre.toLowerCase()));
        if (dimMatch) {
          const pesoPercent = dimMatch.peso != null ? `${dimMatch.peso}%` : "no especificado";
          const indicadores = await getIndicatorsByDimension(dimMatch.nombre);
          let respuesta = `La dimensión **${dimMatch.nombre}** tiene un peso de **${pesoPercent}** en el índice BRAINNOVA.\n\n`;
          respuesta += `**Distribución de pesos de todas las dimensiones:**\n\n`;
          respuesta += dimensiones.map(d => `• **${d.nombre}**: ${d.peso != null ? d.peso + "%" : "N/D"}`).join("\n");
          if (indicadores.length > 0) {
            respuesta += `\n\nEsta dimensión tiene **${indicadores.length} indicador(es)**. Puedes preguntar "¿Qué indicadores tiene ${dimMatch.nombre}?" para ver el listado.`;
          }
          return respuesta;
        }
        const lista = dimensiones.map(d => `• **${d.nombre}**: ${d.peso != null ? d.peso + "%" : "N/D"}`).join("\n");
        return `**Pesos de las dimensiones en el índice BRAINNOVA:**\n\n${lista}\n\n¿Sobre qué dimensión te gustaría saber más?`;
      }
    } catch (error) {
      console.error('Error fetching dimension weights:', error);
    }
  }

  // Detectar preguntas sobre dimensiones específicas (por nombre o por keyword "dimensión")
  const preguntaDimension =
    lowerQuery.includes('dimensión') || lowerQuery.includes('dimension') || lowerQuery.includes('dimensiones') ||
    dimensionMencionada != null;

  if (preguntaDimension) {
    try {
      const { data: dimensiones } = await supabase
        .from('dimensiones')
        .select('nombre, peso')
        .order('peso', { ascending: false });
      
      if (dimensiones && dimensiones.length > 0) {
        const dimensionMatch = dimensiones.find(dim => 
          lowerQuery.includes(dim.nombre.toLowerCase())
        );
        
        if (dimensionMatch) {
          const indicadores = await getIndicatorsByDimension(dimensionMatch.nombre);
          const pesoStr = dimensionMatch.peso != null ? ` (peso: ${dimensionMatch.peso}%)` : '';
          if (indicadores.length > 0) {
            const lista = indicadores.slice(0, 10).map((ind, idx) => 
              `${idx + 1}. **${ind.nombre}**${ind.importancia ? ` (${ind.importancia})` : ''}`
            ).join('\n');
            return `La dimensión **${dimensionMatch.nombre}**${pesoStr} tiene ${indicadores.length} indicador(es):\n\n${lista}${indicadores.length > 10 ? `\n\n... y ${indicadores.length - 10} más.` : ''}\n\n¿Sobre cuál indicador te gustaría saber más detalles?`;
          } else {
            return `La dimensión **${dimensionMatch.nombre}**${pesoStr} no tiene indicadores disponibles en este momento.`;
          }
        }
        
        const lista = dimensiones.map((dim, idx) => `${idx + 1}. **${dim.nombre}**${dim.peso != null ? ` (${dim.peso}%)` : ''}`).join('\n');
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
  
  // --- 4. Preguntas sobre temas específicos (ERP, IA, 5G, sostenibilidad, etc.) ---
  const respuestaTema = await handleIndicadorPorTema(lowerQuery, cleanQuery, provinciaKey);
  if (respuestaTema) return respuestaTema;

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
  
  // Respuesta por defecto mejorada con sugerencias concretas
  return `No he encontrado una respuesta precisa para tu pregunta. Puedo ayudarte con:\n\n**Sobre el modelo:**\n• "¿Qué mide el índice BRAINNOVA?"\n• "¿Cuáles son las dimensiones?"\n• "¿Cómo se calcula el índice global?"\n\n**Sobre resultados:**\n• "¿Cuál es la puntuación global de la Comunitat Valenciana?"\n• "¿Cuál es la mejor dimensión de Valencia?"\n• "¿Cómo ha evolucionado el índice?"\n\n**Sobre indicadores:**\n• "¿Qué porcentaje de empresas usa ERP?"\n• "¿Cuál es la cobertura 5G?"\n• "¿Qué indicadores hay en Capital Humano?"\n\n**Análisis avanzado:**\n• "¿Qué áreas priorizar para mejorar el índice?"\n• "¿Cuál es la brecha respecto al top europeo?"\n\n¿Puedes reformular tu pregunta?`;
}

