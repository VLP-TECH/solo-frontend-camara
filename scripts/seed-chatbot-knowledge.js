/**
 * Seed de la base de conocimiento del chatbot (chatbot_knowledge).
 * Uso: node scripts/seed-chatbot-knowledge.js
 * Necesita: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o las usa por defecto del proyecto).
 *
 * Inserta preguntas y respuestas para que el chatbot pueda contestar sobre el modelo BRAINNOVA,
 * dimensiones, indicadores, metodología, resultados globales, infraestructura, capital humano, etc.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://aoykpiievtadhwssugvs.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KNOWLEDGE_ITEMS = [
  // --- 1. Explorar el modelo ---
  {
    category: "modelo",
    title: "Qué mide el índice BRAINNOVA",
    content: `El **índice BRAINNOVA** mide el grado de desarrollo de la **economía digital** de un territorio. Es un indicador compuesto (escala 0-100) que evalúa la capacidad de empresas, administración y ciudadanía para aprovechar las tecnologías digitales. Se estructura en **7 dimensiones**, **28 subdimensiones** y **más de 80 indicadores**, basado en el estándar europeo DESI.\n\nLas 7 dimensiones y sus pesos son:\n1. Transformación Digital Empresarial (30%)\n2. Capital Humano (20%)\n3. Infraestructura Digital (15%)\n4. Ecosistema y Colaboración (15%)\n5. Apoyo al Emprendimiento e Innovación (10%)\n6. Servicios Públicos Digitales (10%)\n7. Sostenibilidad Digital (5%)\n\nConsulta Comparación Territorial para datos por provincia y el Dashboard para el radar por dimensión.`,
    keywords: ["brainnova", "índice", "mide", "economía digital", "territorio"],
  },
  {
    category: "modelo",
    title: "Cuáles son las dimensiones del sistema",
    content: `El sistema BRAINNOVA tiene **7 dimensiones** con sus pesos:\n\n1. **Transformación Digital Empresarial** (30%) — Núcleo del modelo: adopción de ERP, IA, comercio electrónico, big data, cloud, DII\n2. **Capital Humano** (20%) — Competencias digitales, empleo TIC, formación digital, graduados STEM\n3. **Infraestructura Digital** (15%) — Conectividad, 5G, VHCN, banda ancha, precio de acceso\n4. **Ecosistema y Colaboración** (15%) — Clústeres, proyectos europeos, colaboración universidad-empresa, densidad empresas TIC\n5. **Apoyo al Emprendimiento e Innovación** (10%) — Startups, inversión, financiación, tasa de supervivencia\n6. **Servicios Públicos Digitales** (10%) — Administración electrónica, servicios digitales\n7. **Sostenibilidad Digital** (5%) — Eficiencia energética, descarbonización, residuos electrónicos\n\nCada dimensión se desglosa en subdimensiones (28 total) con indicadores específicos (+80). Explóralas en el menú Dimensiones.`,
    keywords: ["dimensiones", "sistema", "brainnova", "transformación", "capital humano", "infraestructura", "ecosistema", "emprendimiento", "servicios públicos", "sostenibilidad"],
  },
  {
    category: "modelo",
    title: "Qué indicadores incluye la dimensión de Capital Humano",
    content: `La dimensión **Capital Humano** (peso: 20%) incluye indicadores sobre:\n\n• Personas con habilidades digitales básicas (% de la población)\n• Personas con habilidades digitales avanzadas\n• Brecha generacional en competencias digitales\n• Empresas que ofrecen formación digital a empleados\n• Empleo en el sector TIC y tecnológico\n• Dificultades para contratar perfiles TIC\n• Graduados STEM y formación universitaria en tecnología\n• Especialistas TIC en el mercado laboral\n\nLos valores por territorio están en Todos los Indicadores (KPIs). Pregunta "¿Qué indicadores hay en Capital Humano?" para el listado completo de la base de datos.`,
    keywords: ["indicadores", "capital humano", "dimensión", "competencias digitales", "empleo", "TIC", "formación"],
  },
  {
    category: "modelo",
    title: "Cómo se calcula el Índice Global BRAINNOVA",
    content: `El Índice Global BRAINNOVA se calcula en 4 etapas:\n\n1. **Normalización** (escala 0-100): Valor_Normalizado = ((Valor_Real - Valor_Mín) / (Valor_Máx - Valor_Mín)) × 100\n2. **Subdimensiones**: media ponderada de indicadores por importancia (Alta=3, Media=2, Baja=1): Subdimensión = ∑(Indicador_i × Peso_i) / ∑Peso_i\n3. **Dimensiones**: promedio de subdimensiones con datos: Dimensión = promedio(subdimensiones con score > 0)\n4. **Índice global**: media ponderada de las 7 dimensiones: Índice_BRAINNOVA = ∑(Dimensión_k × Peso_k) / 100\n\nPesos: Transformación Digital 30%, Capital Humano 20%, Infraestructura 15%, Ecosistema 15%, Emprendimiento 10%, Servicios Públicos 10%, Sostenibilidad 5%.`,
    keywords: ["calcula", "índice global", "brainnova", "normalización", "ponderación", "metodología", "fórmula"],
  },
  {
    category: "modelo",
    title: "Qué peso tiene la Transformación Digital Empresarial en el índice",
    content: `La dimensión **Transformación Digital Empresarial** tiene un peso del **30%** en el índice BRAINNOVA, siendo la dimensión con mayor peso. Es el núcleo del modelo porque refleja la adopción tecnológica real en el tejido empresarial.\n\nIncluye indicadores sobre: ERP, inteligencia artificial, comercio electrónico, big data, servicios en la nube, redes sociales, Índice de Intensidad Digital (DII).\n\nTodos los pesos: Transformación Digital 30%, Capital Humano 20%, Infraestructura 15%, Ecosistema 15%, Emprendimiento 10%, Servicios Públicos 10%, Sostenibilidad 5%.`,
    keywords: ["peso", "transformación digital empresarial", "índice", "dimensión", "ponderación", "30%"],
  },
  {
    category: "modelo",
    title: "Cómo se normalizan los indicadores",
    content: `Los indicadores se normalizan a escala 0-100 con la fórmula **Min-Max**:\n\n**Valor_Normalizado = ((Valor_Real - Valor_Mínimo) / (Valor_Máximo - Valor_Mínimo)) × 100**\n\nEl mínimo y máximo se calculan sobre todos los territorios/países disponibles para ese indicador en el período. Así, el peor valor → 0 y el mejor → 100.\n\nLos indicadores se ponderan por importancia estratégica: Alta (peso 3), Media (peso 2), Baja (peso 1).\n\nEl score por indicador se calcula: Score_i = (Valor_i / Max_i) × 100. El Min-Max y la ponderación están implementados en el cálculo de subdimensiones del sistema.`,
    keywords: ["normalizan", "indicadores", "min-max", "escala", "metodología", "normalización"],
  },
  {
    category: "modelo",
    title: "Cuál es la referencia utilizada para la comparación media nacional o top europeo",
    content: `La referencia para la comparación utiliza dos niveles:\n\n• **Media nacional (España)**: se compara el valor del territorio (provincia o CV) con España para cada indicador.\n• **Referencia europea (UE)**: se comparan scores con países de referencia: Alemania, Francia, Italia, Países Bajos. El "top europeo" es el mejor valor entre estos países.\n\nEn la normalización Min-Max, el máximo se calcula sobre todos los territorios disponibles (incluidos europeos). En las fichas de subdimensiones se muestran scores para territorio, España y media UE.\n\nComparativas visibles en: Dimensiones (detalle), Comparación Territorial (provincias), Dashboard (radar).`,
    keywords: ["referencia", "comparación", "media nacional", "top europeo", "España", "UE"],
  },

  // --- 2. Resultados globales ---
  {
    category: "resultados_globales",
    title: "Cuál es la puntuación global de la Comunidad Valenciana",
    content: `La **puntuación global** de la Comunitat Valenciana se calcula como media ponderada de las 7 dimensiones BRAINNOVA. El índice se obtiene en tiempo real desde la base de datos de indicadores.\n\nPara ver el dato actualizado:\n• Pregunta al chatbot: "¿Cuál es el índice global de la Comunitat Valenciana?" o "¿Puntuación global?"\n• También por provincia: "¿Índice BRAINNOVA de Valencia?" / Alicante / Castellón\n\nLos datos por provincia (Valencia, Alicante, Castellón) con ranking, dimensión destacada y media regional están en **Comparación Territorial**. El **Dashboard** muestra el radar por dimensión.`,
    keywords: ["puntuación global", "Comunidad Valenciana", "Comunitat", "índice", "resultados"],
  },
  {
    category: "resultados_globales",
    title: "En qué dimensión obtiene mejor resultado la Comunidad Valenciana",
    content: `La dimensión con **mejor resultado** varía por provincia. El chatbot calcula en tiempo real el ranking de dimensiones consultando la base de datos.\n\nPregunta: "¿Cuál es la mejor dimensión de Valencia?" (o Alicante/Castellón) para obtener el ranking completo con puntuaciones.\n\nEn **Comparación Territorial** cada provincia muestra su "dimensión destacada" (la de mayor score). En el **Dashboard** el gráfico radar permite comparar visualmente las 7 dimensiones.`,
    keywords: ["dimensión", "mejor resultado", "Comunidad Valenciana", "destacada"],
  },
  {
    category: "resultados_globales",
    title: "En qué dimensión presenta mayor brecha respecto al top europeo",
    content: `La **brecha respecto al top europeo** se calcula comparando los scores de cada dimensión del territorio con la media de países UE de referencia (Alemania, Francia, Italia, Países Bajos, España).\n\nPregunta al chatbot: "¿Cuál es la brecha respecto al top europeo?" para obtener el ranking de brechas por dimensión calculado en tiempo real.\n\nLas fichas de Dimensiones (detalle) muestran scores por subdimensión con comparativa territorio vs España vs UE. Las mayores brechas suelen estar en Emprendimiento e Innovación y Transformación Digital Empresarial.`,
    keywords: ["brecha", "top europeo", "dimensión", "UE", "comparación"],
  },
  {
    category: "resultados_globales",
    title: "Cómo ha evolucionado el índice en los últimos 3 años",
    content: `La evolución del índice BRAINNOVA se consulta en tiempo real desde la base de datos para los periodos disponibles (2022, 2023, 2024).\n\nPregunta al chatbot: "¿Cómo ha evolucionado el índice?" para ver la variación numérica. También puedes especificar provincia: "¿Evolución del índice en Castellón?"\n\nEn la sección **Evolución Temporal** del menú se muestran gráficos de tendencia por año para el índice global, por dimensión y por indicador. En **Comparación Territorial** puedes cambiar el año (2022-2024) para comparar.`,
    keywords: ["evolución", "índice", "últimos años", "temporal", "tendencia"],
  },
  {
    category: "resultados_globales",
    title: "Qué subdimensiones están por debajo de la media nacional",
    content: `Las subdimensiones por debajo de la media nacional se identifican comparando el score de cada subdimensión del territorio con el de España.\n\nPregunta al chatbot: "¿Qué subdimensiones están por debajo de la media nacional?" para obtener un listado calculado en tiempo real con las diferencias.\n\nEn las fichas de **Dimensiones** (detalle de cada dimensión) se desglosan subdimensiones con comparativa territorio vs España vs UE. Las subdimensiones con score inferior al de España representan áreas con margen de mejora.`,
    keywords: ["subdimensiones", "media nacional", "España", "por debajo", "brecha"],
  },

  // --- 3. Infraestructura digital ---
  {
    category: "infraestructura",
    title: "Cuál es la cobertura 5G en la Comunidad Valenciana",
    content: `La **cobertura 5G** se mide como indicador de la dimensión **Infraestructura Digital** (peso: 15%). El chatbot busca el indicador en la base de datos y devuelve el valor actualizado.\n\nPregunta: "¿Cuál es la cobertura 5G?" o "cobertura 5G en Valencia" para obtener el dato por territorio.\n\nSi no hay dato específico de 5G, se puede consultar la cobertura VHCN (Very High Capacity Network) que es un indicador más amplio. Los indicadores de conectividad están en Dimensiones → Infraestructura Digital y en Todos los Indicadores (KPIs).`,
    keywords: ["cobertura", "5G", "Comunidad Valenciana", "infraestructura", "conectividad"],
  },
  {
    category: "infraestructura",
    title: "Cómo se compara la cobertura VHCN con la media nacional",
    content: `La **cobertura VHCN** (Very High Capacity Network) es un indicador clave de Infraestructura Digital. El chatbot puede buscar el valor actual y compararlo con España.\n\nPregunta: "¿Cuál es la cobertura VHCN?" o "cobertura banda ancha" para obtener el dato.\n\nEn las fichas de subdimensiones de Infraestructura Digital se muestran scores para el territorio, España y media UE. La comparativa permite identificar si la CV está por encima o debajo de la media nacional en conectividad.`,
    keywords: ["VHCN", "cobertura", "media nacional", "banda ancha", "infraestructura"],
  },
  {
    category: "infraestructura",
    title: "El precio relativo de la banda ancha es competitivo",
    content: `El **precio relativo de la banda ancha** se evalúa como indicador de Infraestructura Digital. Pregunta al chatbot "precio banda ancha" o "coste conectividad" para buscar el indicador y su valor actual.\n\nLa competitividad se mide comparando el precio con la media nacional y la referencia UE. En las fichas de subdimensiones se muestran comparativas territorio vs España vs UE.\n\nConsulta Todos los Indicadores (KPIs) filtrando por "banda ancha" o "precio" para ver todos los indicadores relacionados.`,
    keywords: ["precio", "banda ancha", "competitivo", "infraestructura"],
  },
  {
    category: "infraestructura",
    title: "Qué provincias presentan mejor conectividad digital",
    content: `La **mejor conectividad digital** por provincia se determina por el score de la dimensión **Infraestructura Digital** en cada una.\n\nPregunta: "¿Qué provincia lidera en Infraestructura Digital?" para ver el ranking calculado en tiempo real.\n\nEn Comparación Territorial se muestra el score de Infraestructura Digital por provincia (Valencia, Alicante, Castellón). En el Dashboard el radar permite comparar visualmente. Pregunta "¿Cómo está la infraestructura digital en Alicante?" para el dato de cada provincia.`,
    keywords: ["provincias", "conectividad digital", "infraestructura", "Valencia", "Alicante", "Castellón"],
  },

  // --- 4. Capital humano ---
  {
    category: "capital_humano",
    title: "Qué porcentaje de la población tiene competencias digitales básicas",
    content: `El porcentaje de población con **competencias digitales básicas** es un indicador clave de la dimensión **Capital Humano** (peso: 20%). El chatbot busca el indicador "Personas con habilidades digitales básicas" en la base de datos.\n\nPregunta: "¿Qué porcentaje tiene competencias digitales básicas?" o "habilidades digitales básicas en Castellón" para obtener el valor por territorio.\n\nEste indicador mide el % de personas de 16-74 años con al menos habilidades digitales básicas según el marco DigComp. Fuente: INE/Eurostat.`,
    keywords: ["población", "competencias digitales", "básicas", "capital humano", "porcentaje", "habilidades"],
  },
  {
    category: "capital_humano",
    title: "Cuál es la brecha generacional en competencias digitales",
    content: `La **brecha generacional en competencias digitales** se analiza con indicadores de Capital Humano que comparan niveles por grupos de edad.\n\nPregunta al chatbot: "brecha generacional competencias digitales" para buscar indicadores relacionados.\n\nGeneralmente existe una brecha significativa entre jóvenes (16-34 años) y mayores (55-74 años) en habilidades digitales. Los indicadores por territorio están en Dimensiones → Capital Humano y en Todos los Indicadores (KPIs).`,
    keywords: ["brecha generacional", "competencias digitales", "capital humano", "edad"],
  },
  {
    category: "capital_humano",
    title: "Qué porcentaje de empresas ofrece formación digital a sus empleados",
    content: `El porcentaje de **empresas que ofrecen formación digital** es un indicador de Capital Humano.\n\nPregunta al chatbot: "formación digital empresas" o "empresas formación TIC" para buscar el indicador y su valor actual.\n\nEste dato mide la inversión del tejido empresarial en capacitación digital de sus empleados. Es un indicador de importancia estratégica para la mejora del capital humano digital regional. Fuente: INE (Encuesta de uso de TIC).`,
    keywords: ["empresas", "formación digital", "empleados", "capital humano", "porcentaje", "capacitación"],
  },
  {
    category: "capital_humano",
    title: "Existen dificultades para contratar perfiles TIC",
    content: `Las **dificultades para contratar perfiles TIC** se miden con indicadores de Capital Humano sobre oferta/demanda de talento digital.\n\nPregunta al chatbot: "perfiles TIC" o "contratar TIC" para buscar indicadores relacionados.\n\nEste indicador refleja la escasez de profesionales digitales en el mercado laboral regional, un problema creciente en toda Europa. Los datos por territorio están en Todos los Indicadores (KPIs) y en Dimensiones → Capital Humano.`,
    keywords: ["dificultades", "contratar", "perfiles TIC", "capital humano", "empleo", "talento"],
  },
  {
    category: "capital_humano",
    title: "Cómo evoluciona el empleo en el sector tecnológico",
    content: `La **evolución del empleo TIC** se sigue con indicadores de Capital Humano.\n\nPregunta al chatbot: "empleo tecnológico" o "empleo TIC" para buscar indicadores y valores.\n\nPara ver la tendencia temporal, consulta **Evolución Temporal** en el menú y filtra por indicadores de empleo. También en Todos los Indicadores (KPIs) puedes ver el último periodo disponible de cada indicador de empleo TIC. La serie histórica permite evaluar si el empleo tecnológico crece o se estanca.`,
    keywords: ["empleo", "sector tecnológico", "evolución", "capital humano", "TIC"],
  },

  // --- 5. Transformación digital empresarial ---
  {
    category: "transformacion_digital",
    title: "Qué porcentaje de empresas utiliza ERP",
    content: `El porcentaje de **empresas que utilizan ERP** es un indicador de **Transformación Digital Empresarial** (peso: 30%). El chatbot busca automáticamente el indicador "ERP" en la base de datos.\n\nPregunta: "¿Qué porcentaje de empresas usa ERP?" o simplemente "ERP" para obtener el dato actual por territorio.\n\nEl ERP (Enterprise Resource Planning) es un indicador de digitalización intermedia de las empresas. Fuente: INE (Encuesta de uso de TIC en empresas).`,
    keywords: ["empresas", "ERP", "transformación digital", "porcentaje"],
  },
  {
    category: "transformacion_digital",
    title: "Cuántas empresas utilizan inteligencia artificial",
    content: `El uso de **inteligencia artificial** en empresas es un indicador de Transformación Digital Empresarial.\n\nPregunta al chatbot: "empresas inteligencia artificial" o "IA empresas" para obtener el valor actual. También "adopción IA" o "uso de IA".\n\nEste indicador mide el % de empresas que utilizan tecnologías de IA (machine learning, procesamiento de lenguaje natural, etc.). Es un indicador de digitalización avanzada. Fuente: INE/Eurostat.`,
    keywords: ["empresas", "inteligencia artificial", "IA", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Cuál es el nivel de adopción de tecnologías en pymes frente a grandes empresas",
    content: `La **brecha digital entre pymes y grandes empresas** se analiza con indicadores de Transformación Digital Empresarial.\n\nPregunta al chatbot: "pymes digitalización" o "adopción tecnologías pymes" para buscar indicadores.\n\nGeneralmente existe una brecha significativa: las grandes empresas (+250 empleados) tienen tasas de adopción de ERP, IA, cloud y big data muy superiores a las pymes. Los indicadores desglosan por tamaño cuando la fuente lo permite (INE).`,
    keywords: ["adopción", "tecnologías", "pymes", "grandes empresas", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Qué peso tiene el comercio electrónico en los ingresos empresariales",
    content: `El **comercio electrónico** se mide con indicadores de Transformación Digital Empresarial.\n\nPregunta: "comercio electrónico" o "e-commerce" para buscar el indicador y su valor.\n\nEste dato mide el % de ingresos empresariales provenientes de ventas online o el % de empresas que realizan comercio electrónico. Es un indicador de madurez digital del tejido empresarial. Fuente: INE (Encuesta de uso de TIC).`,
    keywords: ["comercio electrónico", "ingresos", "empresas", "transformación digital", "e-commerce"],
  },
  {
    category: "transformacion_digital",
    title: "Cuál es el Índice de Intensidad Digital DII medio regional",
    content: `El **Índice de Intensidad Digital (DII)** es una métrica compuesta de Transformación Digital Empresarial.\n\nPregunta: "intensidad digital" o "DII" para buscar el indicador.\n\nEl DII mide el nivel de digitalización global de las empresas combinando varios indicadores (internet, cloud, ERP, factura electrónica, redes sociales, big data, IA). Se clasifica en niveles: muy bajo, bajo, básico, alto. Fuente: Eurostat/DESI.`,
    keywords: ["índice intensidad digital", "DII", "regional", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Qué sectores están más digitalizados",
    content: `La **digitalización por sectores** se analiza dentro de Transformación Digital Empresarial.\n\nPregunta: "sectores digitalizados" o "digitalización sectorial" para buscar indicadores.\n\nGeneralmente, los sectores más digitalizados son: TIC y telecomunicaciones, servicios profesionales, banca y seguros. Los menos digitalizados: construcción, hostelería, agricultura. Los datos por sector dependen de la disponibilidad en las fuentes (INE, Eurostat).`,
    keywords: ["sectores", "digitalizados", "transformación digital", "actividad"],
  },

  // --- 6. Sostenibilidad digital ---
  {
    category: "sostenibilidad",
    title: "Cuántas empresas usan TIC para eficiencia energética",
    content: `Las **empresas que usan TIC para eficiencia energética** son un indicador de **Sostenibilidad Digital** (peso: 5%).\n\nPregunta al chatbot: "eficiencia energética" o "TIC energía" para buscar el indicador y su valor.\n\nEste dato mide el % de empresas que aplican tecnologías digitales para reducir su consumo energético (sensores IoT, automatización, monitorización). Es una dimensión emergente pero cada vez más relevante. Fuente: INE/Eurostat.`,
    keywords: ["empresas", "TIC", "eficiencia energética", "sostenibilidad digital"],
  },
  {
    category: "sostenibilidad",
    title: "Qué porcentaje de empresas tiene plan de descarbonización",
    content: `El porcentaje de **empresas con plan de descarbonización** es un indicador de Sostenibilidad Digital.\n\nPregunta: "descarbonización" o "huella de carbono" para buscar el indicador.\n\nMide el compromiso del tejido empresarial con la reducción de emisiones mediante tecnologías digitales. La Sostenibilidad Digital tiene un peso del 5% en el índice (dimensión emergente e incipiente en adopción empresarial).`,
    keywords: ["empresas", "plan descarbonización", "sostenibilidad", "porcentaje", "emisiones"],
  },
  {
    category: "sostenibilidad",
    title: "Cuál es el consumo energético medio de infraestructuras digitales",
    content: `El **consumo energético de infraestructuras digitales** (centros de datos, redes) se mide en Sostenibilidad Digital.\n\nPregunta: "consumo energético" o "centros de datos" para buscar indicadores.\n\nEste aspecto es cada vez más relevante dado el crecimiento de los centros de datos y la computación en la nube. La dimensión Sostenibilidad Digital (5%) es emergente y mide tanto el impacto ambiental como los esfuerzos de mitigación del sector digital.`,
    keywords: ["consumo energético", "infraestructuras digitales", "sostenibilidad", "centros datos"],
  },
  {
    category: "sostenibilidad",
    title: "Cómo se posiciona la región en gestión de residuos electrónicos",
    content: `La **gestión de residuos electrónicos** (RAEE) se evalúa dentro de Sostenibilidad Digital.\n\nPregunta: "residuos electrónicos" o "RAEE" para buscar indicadores.\n\nMide la tasa de recogida y reciclaje de equipos electrónicos. Los datos dependen de la disponibilidad en fuentes oficiales. La CV tiene infraestructura de gestión de RAEE pero el indicador puede no estar disponible a nivel provincial. Consulta Dimensiones → Sostenibilidad Digital.`,
    keywords: ["residuos electrónicos", "gestión", "región", "sostenibilidad", "RAEE", "reciclaje"],
  },

  // --- 7. Ecosistema y colaboración ---
  {
    category: "ecosistema",
    title: "Cuántas empresas participan en proyectos europeos",
    content: `La **participación de empresas en proyectos europeos** se mide con indicadores de la dimensión **Ecosistema y Colaboración**. Consulta en **Todos los Indicadores (KPIs)** o en la dimensión Ecosistema y Colaboración los indicadores sobre proyectos europeos, Horizonte Europa o colaboración transnacional. Los valores por territorio están en la base de datos.`,
    keywords: ["empresas", "proyectos europeos", "ecosistema", "colaboración"],
  },
  {
    category: "ecosistema",
    title: "Cuál es la densidad de empresas TIC en la región",
    content: `La **densidad de empresas TIC** en la región se refleja en indicadores de la dimensión **Ecosistema y Colaboración** (tejido empresarial TIC, clústeres). Consulta **Todos los Indicadores (KPIs)** o la dimensión Ecosistema para indicadores de densidad de empresas TIC por territorio.`,
    keywords: ["densidad", "empresas TIC", "región", "ecosistema"],
  },
  {
    category: "ecosistema",
    title: "Existen clústeres digitales relevantes",
    content: `Los **clústeres digitales** y su relevancia se analizan en el marco de la dimensión **Ecosistema y Colaboración**. Consulta la dimensión Ecosistema y Colaboración y **Todos los Indicadores (KPIs)** para indicadores sobre clústeres, concentración de empresas digitales o ecosistemas de innovación por territorio.`,
    keywords: ["clústeres", "digitales", "ecosistema", "colaboración"],
  },
  {
    category: "ecosistema",
    title: "Cuál es el grado de colaboración universidad-empresa",
    content: `El **grado de colaboración universidad-empresa** se puede medir con indicadores de la dimensión **Ecosistema y Colaboración**. Consulta en **Todos los Indicadores (KPIs)** o en la dimensión Ecosistema indicadores sobre transferencia de conocimiento, colaboración universidad-empresa o I+D conjunta. Los valores por territorio están en la base de datos.`,
    keywords: ["colaboración", "universidad", "empresa", "ecosistema", "transferencia"],
  },

  // --- 8. Emprendimiento y financiación ---
  {
    category: "emprendimiento",
    title: "Cuál es el volumen de inversión privada en startups tecnológicas",
    content: `El **volumen de inversión privada en startups tecnológicas** se recoge en indicadores de la dimensión **Emprendimiento e Innovación**. Consulta **Todos los Indicadores (KPIs)** o la dimensión Emprendimiento para indicadores de inversión en startups, venture capital o financiación de empresas tecnológicas por territorio.`,
    keywords: ["inversión", "startups", "tecnológicas", "emprendimiento", "financiación"],
  },
  {
    category: "emprendimiento",
    title: "Qué porcentaje de startups accede a financiación digital",
    content: `El **porcentaje de startups que acceden a financiación** (incl. digital) se puede analizar con indicadores de la dimensión **Emprendimiento e Innovación**. Consulta en **Todos los Indicadores (KPIs)** y en la dimensión Emprendimiento los indicadores sobre financiación de startups y territorio.`,
    keywords: ["startups", "financiación", "digital", "emprendimiento", "porcentaje"],
  },
  {
    category: "emprendimiento",
    title: "Cómo se compara la densidad de startups con la media nacional",
    content: `La **densidad de startups** y su comparación con la **media nacional** se puede ver en indicadores de la dimensión **Emprendimiento e Innovación** y en las comparativas con España/UE. Consulta **Comparación Territorial** y la dimensión Emprendimiento, o los indicadores de densidad de startups en **Todos los Indicadores (KPIs)**.`,
    keywords: ["densidad", "startups", "media nacional", "emprendimiento", "comparación"],
  },
  {
    category: "emprendimiento",
    title: "Cuál es la tasa de supervivencia a 3 años",
    content: `La **tasa de supervivencia** de empresas o startups (p. ej. a 3 años) se puede medir con indicadores de la dimensión **Emprendimiento e Innovación** cuando existan. Consulta **Todos los Indicadores (KPIs)** y la dimensión Emprendimiento para indicadores de supervivencia empresarial por territorio.`,
    keywords: ["tasa", "supervivencia", "años", "emprendimiento", "startups"],
  },

  // --- 9. Comparaciones territoriales ---
  {
    category: "comparaciones",
    title: "Cómo se compara Valencia con Madrid en capital humano digital",
    content: `La comparación de **Valencia con Madrid** en **capital humano digital** requiere datos de ambas regiones. En este panel los datos están centrados en la **Comunitat Valenciana** (Valencia, Alicante, Castellón). Puedes comparar las tres provincias en **Comparación Territorial** y ver la dimensión Capital Humano por provincia. Para comparar con Madrid sería necesario disponer de datos de Madrid en la base de resultados o en informes externos.`,
    keywords: ["Valencia", "Madrid", "capital humano", "digital", "comparación", "territorial"],
  },
  {
    category: "comparaciones",
    title: "Qué provincia lidera en transformación digital empresarial",
    content: `La provincia que **lidera en transformación digital empresarial** entre Valencia, Alicante y Castellón se ve en **Comparación Territorial**: en la tabla "Comparativa Detallada por Dimensiones" la columna de Transformación Digital Empresarial muestra el score por provincia; la que tiene el valor más alto es la que lidera. También puedes preguntar en el chatbot: "¿Cuál es el nivel de digitalización de las empresas de Valencia?" (o Alicante/Castellón) para obtener el dato de cada una.`,
    keywords: ["provincia", "lidera", "transformación digital empresarial", "Valencia", "Alicante", "Castellón"],
  },
  {
    category: "comparaciones",
    title: "Cuál es la posición de la Comunidad Valenciana respecto a la UE",
    content: `La **posición de la Comunitat Valenciana respecto a la UE** se analiza mediante la comparativa de scores con la referencia europea en cada dimensión e indicador. En las fichas de **Dimensiones** y en la **Metodología** se explica el uso de la referencia UE. Los cálculos de subdimensiones incluyen comparativas España y UE donde aplica. Para un resumen de posición global, consulta la sección de metodología y los informes del proyecto.`,
    keywords: ["posición", "Comunidad Valenciana", "UE", "Europa", "comparación"],
  },
  {
    category: "comparaciones",
    title: "Qué brecha existe entre zonas urbanas y rurales",
    content: `La **brecha entre zonas urbanas y rurales** se puede analizar cuando existan indicadores desglosados por ámbito urbano/rural en la base de datos. Consulta **Todos los Indicadores (KPIs)** y las dimensiones por si hay indicadores con desglose territorial (urbano/rural). Los datos actuales del panel se organizan por provincia (Valencia, Alicante, Castellón).`,
    keywords: ["brecha", "urbanas", "rurales", "zonas", "territorial"],
  },

  // --- 10. Análisis avanzado ---
  {
    category: "analisis_avanzado",
    title: "Qué dimensión tiene mayor impacto en el índice global",
    content: `La dimensión con **mayor impacto** depende de dos factores: **peso** y **score actual**.\n\nPor peso: Transformación Digital Empresarial (30%) > Capital Humano (20%) > Infraestructura y Ecosistema (15% c/u) > Emprendimiento y Servicios Públicos (10% c/u) > Sostenibilidad (5%).\n\nUn cambio de 1 punto en Transformación Digital afecta 0,3 puntos al índice global; en Sostenibilidad solo 0,05 puntos.\n\nPor margen de mejora: las dimensiones con scores más bajos tienen mayor potencial. Pregunta "¿Qué áreas priorizar?" para un ranking por impacto potencial calculado en tiempo real.`,
    keywords: ["dimensión", "impacto", "índice global", "pesos", "ponderación"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué ocurriría si aumentara un 10% la adopción de IA",
    content: `Un aumento del **10% en IA** tendría este impacto:\n\n1. El indicador de IA mejoraría en la subdimensión de Transformación Digital Empresarial\n2. Si tiene importancia "Alta" (peso 3) y la subdimensión tiene ~5 indicadores, la dimensión subiría ~2-3 puntos\n3. Como Transformación Digital tiene peso 30%, el índice global subiría ~0,6-0,9 puntos\n\nEstimación: Índice_BRAINNOVA ≈ +0,6 a +0,9 puntos por un 10% más de adopción de IA.\n\nPara simulaciones exactas, usa la sección BRAINNOVA Score del menú o exporta los datos y recalcula.`,
    keywords: ["adopción", "IA", "inteligencia artificial", "simulación", "impacto", "10%"],
  },
  {
    category: "analisis_avanzado",
    title: "Cuál es la correlación entre capital humano y digitalización empresarial",
    content: `La **correlación entre Capital Humano y Transformación Digital** puede analizarse por provincia.\n\nPregunta al chatbot: "correlación capital humano digitalización" para ver los scores de ambas dimensiones por provincia calculados en tiempo real.\n\nGeneralmente existe correlación positiva: provincias con mejor capital humano digital tienen también mejor transformación digital empresarial, ya que las competencias digitales habilitan la adopción de tecnologías.\n\nPara análisis estadístico formal, exporta datos de Comparación Territorial.`,
    keywords: ["correlación", "capital humano", "digitalización empresarial", "dimensiones"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué indicadores explican la brecha respecto al top europeo",
    content: `Los **indicadores que explican la brecha** con el top europeo son aquellos donde el territorio tiene valores significativamente inferiores a los países UE de referencia.\n\nPregunta: "brecha top europeo" para obtener un ranking de dimensiones con mayor brecha calculado en tiempo real.\n\nTípicamente las mayores brechas están en:\n• Adopción de tecnologías avanzadas (IA, big data, cloud)\n• Emprendimiento digital (densidad de startups, inversión)\n• Competencias digitales avanzadas\n\nEn Dimensiones (detalle) se muestra la comparativa subdimensión por subdimensión: territorio vs España vs UE.`,
    keywords: ["indicadores", "brecha", "top europeo", "UE", "explican"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué áreas deberían priorizarse para mejorar el índice global",
    content: `Las **áreas a priorizar** combinan peso de la dimensión y margen de mejora.\n\nPregunta al chatbot: "áreas priorizar mejorar índice" para obtener un ranking calculado en tiempo real con el impacto potencial de cada dimensión.\n\nLa fórmula de priorización: Impacto = (100 - score_actual) × peso_dimensión / 100.\n\nLas dimensiones con mayor "impacto potencial" son las que más beneficio aportarían al índice global si se mejoran: típicamente Transformación Digital Empresarial (por su peso del 30%) y las que tengan scores bajos.`,
    keywords: ["áreas", "priorizar", "mejorar", "índice global", "dimensiones", "impacto"],
  },

  // --- 12. Preguntas metodológicas ---
  {
    category: "metodologia",
    title: "Cómo se ponderan las dimensiones",
    content: `Las dimensiones se ponderan con **pesos fijos** definidos en la metodología BRAINNOVA 2026:\n\n• Transformación Digital Empresarial: **30%** (núcleo del modelo)\n• Capital Humano: **20%** (factor habilitador esencial)\n• Infraestructura Digital: **15%** (habilitador estructural)\n• Ecosistema y Colaboración: **15%** (dinamismo y renovación)\n• Apoyo al Emprendimiento e Innovación: **10%** (redes de innovación)\n• Servicios Públicos Digitales: **10%** (digitalización administrativa)\n• Sostenibilidad Digital: **5%** (dimensión emergente)\n\nFórmula: Índice_BRAINNOVA = ∑(Dimensión_k × Peso_k) / 100\n\nEstos pesos reflejan la importancia estratégica de cada dimensión en la economía digital.`,
    keywords: ["ponderan", "dimensiones", "pesos", "metodología", "índice"],
  },
  {
    category: "metodologia",
    title: "Qué fuentes de datos se utilizan",
    content: `Las **fuentes de datos** del índice BRAINNOVA son:\n\n1. Instituto Nacional de Estadística (INE) — Datos empresariales y población\n2. Eurostat — Comparativas europeas\n3. Ministerio de Asuntos Económicos — Digitalización administrativa\n4. Comisión Nacional de los Mercados (CNMC) — Infraestructuras y conectividad\n5. Observatorio Nacional de Tecnología — Adopción tecnológica\n6. Registros autonómicos — Datos regionales específicos\n\nCada indicador tiene su fuente registrada en la base de datos (campo "Fuente" en Todos los Indicadores). Todos los datos se validan con múltiples fuentes antes de su inclusión.`,
    keywords: ["fuentes", "datos", "Eurostat", "INE", "metodología", "CNMC"],
  },
  {
    category: "metodologia",
    title: "Cada cuánto se actualizan los indicadores",
    content: `El índice BRAINNOVA se **actualiza anualmente** (datos de cierre 31/dic del año anterior).\n\n• Mayoría de indicadores: actualización **anual** (según fuentes oficiales)\n• Algunos indicadores de infraestructura: datos **semestrales**\n• Periodos disponibles en el panel: **2022, 2023, 2024**\n\nValidación: todos los datos pasan por validación cruzada con múltiples fuentes.\nRevisión metodológica: cada **2-3 años** para incorporar nuevas tendencias.\n\nEl último periodo de cada indicador se muestra en Todos los Indicadores (KPIs).`,
    keywords: ["actualizan", "indicadores", "periodo", "fuentes", "frecuencia", "anual"],
  },
  {
    category: "metodologia",
    title: "Cómo se calcula la normalización frente al top europeo",
    content: `La **normalización frente al top europeo** usa la fórmula Min-Max con referencia europea:\n\n1. Se obtiene el valor del indicador para el territorio\n2. Se obtienen los valores para países UE de referencia (Alemania, Francia, Italia, Países Bajos)\n3. Se aplica: Score_i = (Valor_i / Max_i) × 100\n   donde Max_i es el máximo entre todos los territorios (incluidos europeos)\n4. El "top europeo" es el mejor valor entre los países de referencia\n\nAsí, si el top europeo tiene el máximo, 100 corresponde al mejor país UE y el territorio se sitúa proporcionalmente. Los detalles se explican en la sección Metodología.`,
    keywords: ["normalización", "top europeo", "cálculo", "metodología", "referencia"],
  },
  {
    category: "metodologia",
    title: "Se puede recalcular el índice con otra ponderación",
    content: `**Sí**, se puede recalcular el índice con otra ponderación. Los scores de cada dimensión ya están calculados independientemente.\n\nFórmula: Índice_nuevo = ∑(Dimensión_k × Peso_nuevo_k) / ∑Peso_nuevo_k\n\nPesos actuales: Transformación Digital 30%, Capital Humano 20%, Infraestructura 15%, Ecosistema 15%, Emprendimiento 10%, Servicios Públicos 10%, Sostenibilidad 5%.\n\nPara simular: toma los scores por dimensión del Dashboard o Comparación Territorial y aplica tu propia ponderación. La sección BRAINNOVA Score permite calcular con los filtros disponibles.`,
    keywords: ["recalcular", "índice", "ponderación", "pesos", "metodología", "simulación"],
  },
];

async function main() {
  console.log("Insertando base de conocimiento del chatbot (chatbot_knowledge)...");
  const chunkSize = 20;
  let inserted = 0;
  for (let i = 0; i < KNOWLEDGE_ITEMS.length; i += chunkSize) {
    const chunk = KNOWLEDGE_ITEMS.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("chatbot_knowledge").insert(chunk).select("id");
    if (error) {
      console.error("Error insertando chunk:", error);
      throw error;
    }
    inserted += (data || []).length;
    console.log(`  Insertados ${inserted}/${KNOWLEDGE_ITEMS.length} registros.`);
  }
  console.log(`Listo. Total: ${inserted} entradas en chatbot_knowledge.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
