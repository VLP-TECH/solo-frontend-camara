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
    content: `El **índice BRAINNOVA** mide el grado de desarrollo de la **economía digital** de un territorio. Evalúa la capacidad de empresas, administración y ciudadanía para aprovechar las tecnologías digitales en términos de transformación digital empresarial, capital humano, infraestructura, ecosistema, emprendimiento, servicios públicos digitales y sostenibilidad digital. Es un indicador compuesto (0-100) que permite comparar territorios y seguir la evolución en el tiempo. Los datos actuales por provincia (Valencia, Alicante, Castellón) y por dimensión puedes consultarlos en la sección **Comparación Territorial** y en el **Dashboard** del panel.`,
    keywords: ["brainnova", "índice", "mide", "economía digital", "territorio"],
  },
  {
    category: "modelo",
    title: "Cuáles son las dimensiones del sistema",
    content: `El sistema BRAINNOVA se estructura en **7 dimensiones**: 1) **Transformación Digital Empresarial** (adopción de tecnologías en empresas), 2) **Capital Humano** (competencias digitales y empleo TIC), 3) **Infraestructura Digital** (conectividad, 5G, banda ancha), 4) **Ecosistema y Colaboración** (clústeres, proyectos europeos, colaboración universidad-empresa), 5) **Emprendimiento e Innovación** (startups, financiación), 6) **Servicios Públicos Digitales** (administración electrónica), 7) **Sostenibilidad Digital** (uso de TIC para eficiencia energética y descarbonización). Puedes explorar cada dimensión y sus indicadores en el menú **Dimensiones** y en **Todos los Indicadores (KPIs)**.`,
    keywords: ["dimensiones", "sistema", "brainnova", "transformación", "capital humano", "infraestructura", "ecosistema", "emprendimiento", "servicios públicos", "sostenibilidad"],
  },
  {
    category: "modelo",
    title: "Qué indicadores incluye la dimensión de Capital Humano",
    content: `La dimensión **Capital Humano** incluye indicadores relacionados con competencias digitales de la población, empleo en el sector TIC, formación digital en empresas y dificultades para contratar perfiles TIC. Por ejemplo: personas con habilidades digitales básicas, brecha generacional en competencias digitales, porcentaje de empresas que ofrecen formación digital a empleados, empleo en el sector tecnológico. Puedes ver la lista completa de indicadores de esta dimensión en el menú **Dimensiones** → Capital Humano, o preguntando "¿Qué indicadores hay en Capital Humano?" en el chatbot. Los valores por territorio están en **Todos los Indicadores (KPIs)** y en **Comparación Territorial**.`,
    keywords: ["indicadores", "capital humano", "dimensión", "competencias digitales", "empleo", "TIC", "formación"],
  },
  {
    category: "modelo",
    title: "Cómo se calcula el Índice Global BRAINNOVA",
    content: `El **Índice Global BRAINNOVA** se calcula en varios pasos: 1) Cada indicador se **normaliza** (escala 0-100), típicamente con metodología Min-Max respecto al mínimo y máximo observado (o frente a referencia europea/nacional según el indicador). 2) Los indicadores se **ponderan** por su importancia (Alta, Media, Baja). 3) Se obtiene un **score por subdimensión** (promedio ponderado de sus indicadores). 4) El score de cada **dimensión** es el promedio de los scores de sus subdimensiones. 5) El **índice global** del territorio es el promedio (o media ponderada por el peso de cada dimensión) de las puntuaciones de las 7 dimensiones. Los pesos de las dimensiones y la referencia (media nacional, top europeo) se definen en la metodología; puedes consultar la sección **Metodología** en el menú.`,
    keywords: ["calcula", "índice global", "brainnova", "normalización", "ponderación", "metodología"],
  },
  {
    category: "modelo",
    title: "Qué peso tiene la Transformación Digital Empresarial en el índice",
    content: `El peso de la dimensión **Transformación Digital Empresarial** en el índice BRAINNOVA está definido en la **metodología** del proyecto (tabla de dimensiones y pesos en la base de datos). Cada dimensión tiene un peso que influye en el índice global; para conocer el valor exacto puedes consultar la sección **Metodología** o la vista de **Dimensiones** en el panel, donde se muestra la importancia de cada dimensión. La Transformación Digital Empresarial mide el grado de adopción e integración de tecnologías digitales en las empresas (ERP, IA, comercio electrónico, intensidad digital, etc.).`,
    keywords: ["peso", "transformación digital empresarial", "índice", "dimensión", "ponderación"],
  },
  {
    category: "modelo",
    title: "Cómo se normalizan los indicadores",
    content: `Los indicadores se **normalizan** para llevarlos a una escala común (0-100). La metodología BRAINNOVA utiliza principalmente **normalización Min-Max**: para cada indicador se toma el valor mínimo y máximo en el conjunto de referencia (por ejemplo todos los territorios o periodos), y se aplica la fórmula (valor - mínimo) / (máximo - mínimo), multiplicado por 100. Así, el peor valor se acerca a 0 y el mejor a 100. En algunos casos se usa referencia al **top europeo** o a la **media nacional** según el indicador. Los detalles están en la sección **Metodología** del panel.`,
    keywords: ["normalizan", "indicadores", "min-max", "escala", "metodología"],
  },
  {
    category: "modelo",
    title: "Cuál es la referencia utilizada para la comparación media nacional o top europeo",
    content: `La **referencia** para la comparación de indicadores puede ser la **media nacional** (España) o el **top europeo** según el indicador y la metodología definida. En el cálculo de scores por subdimensión y dimensión se utilizan comparativas con España y UE donde aplica. Los valores de referencia (España, UE) se pueden consultar en las fichas de dimensión y en la **Metodología**. En la sección **Comparación Territorial** se comparan las tres provincias de la Comunitat Valenciana entre sí.`,
    keywords: ["referencia", "comparación", "media nacional", "top europeo", "España", "UE"],
  },

  // --- 2. Resultados globales ---
  {
    category: "resultados_globales",
    title: "Cuál es la puntuación global de la Comunidad Valenciana",
    content: `La **puntuación global** de la Comunitat Valenciana se obtiene como promedio de las puntuaciones de las 7 dimensiones del índice BRAINNOVA en el territorio. Los valores actuales por **provincia** (Valencia, Alicante, Castellón) y el **índice global** por provincia están en la sección **Comparación Territorial** del panel. También puedes preguntar en el chatbot: "¿Cuál es el índice BRAINNOVA de Valencia?" (o Alicante/Castellón) para obtener el dato de cada provincia. La media regional se muestra en el mismo bloque de Comparación Territorial.`,
    keywords: ["puntuación global", "Comunidad Valenciana", "Comunitat", "índice", "resultados"],
  },
  {
    category: "resultados_globales",
    title: "En qué dimensión obtiene mejor resultado la Comunidad Valenciana",
    content: `La dimensión en la que la Comunitat Valenciana (o cada provincia) obtiene **mejor resultado** puede verse en la sección **Comparación Territorial**: cada provincia tiene una "dimensión destacada" que es la de mayor puntuación. También en el **Dashboard** puedes ver el radar por dimensión para una provincia y año seleccionados. Para una respuesta numérica actualizada, pregunta por ejemplo "¿Cuál es el índice BRAINNOVA de Valencia?" y el chatbot te indicará la dimensión más destacada para esa provincia.`,
    keywords: ["dimensión", "mejor resultado", "Comunidad Valenciana", "destacada"],
  },
  {
    category: "resultados_globales",
    title: "En qué dimensión presenta mayor brecha respecto al top europeo",
    content: `La **brecha respecto al top europeo** se analiza comparando los scores de cada dimensión con la referencia UE. En las fichas de **Dimensiones** (detalle de cada dimensión) y en los datos de **Comparación Territorial** puedes ver scores por territorio; la comparativa con España y UE aparece en la metodología y en los cálculos de subdimensiones. Para un análisis detallado de qué dimensión tiene mayor brecha, consulta el Dashboard por dimensión y la sección de **Metodología** donde se explica la referencia europea.`,
    keywords: ["brecha", "top europeo", "dimensión", "UE", "comparación"],
  },
  {
    category: "resultados_globales",
    title: "Cómo ha evolucionado el índice en los últimos 3 años",
    content: `La **evolución temporal** del índice BRAINNOVA se puede consultar en la sección **Evolución Temporal** del menú, donde se muestran tendencias por año. También puedes cambiar el **año** en **Comparación Territorial** y en el **Dashboard** para comparar distintos periodos. Los datos se actualizan según la disponibilidad en la base de datos (periodos disponibles: 2022, 2023, 2024 según configuración).`,
    keywords: ["evolución", "índice", "últimos años", "temporal", "tendencia"],
  },
  {
    category: "resultados_globales",
    title: "Qué subdimensiones están por debajo de la media nacional",
    content: `Para saber qué **subdimensiones** están **por debajo de la media nacional** hay que comparar el score de cada subdimensión (por territorio) con el valor de España. Esa comparativa se realiza en el cálculo interno de las dimensiones (España y UE como referencia). Puedes revisar el detalle de cada dimensión en el menú **Dimensiones** → elegir una dimensión, donde se desglosan subdimensiones e indicadores, y en la ficha ver la comparativa regional y con referencia nacional/europea cuando esté disponible.`,
    keywords: ["subdimensiones", "media nacional", "España", "por debajo", "brecha"],
  },

  // --- 3. Infraestructura digital ---
  {
    category: "infraestructura",
    title: "Cuál es la cobertura 5G en la Comunidad Valenciana",
    content: `La **cobertura 5G** en la Comunitat Valenciana (o por provincia) se refleja en los indicadores de la dimensión **Infraestructura Digital**. Los valores actuales por territorio y periodo están en la base de datos de resultados. Puedes consultar en **Todos los Indicadores (KPIs)** el indicador relacionado con 5G, o en **Dimensiones** → Infraestructura Digital. Si preguntas por "cobertura 5G" o "5G Valencia" el chatbot puede buscar el indicador correspondiente y mostrar el último valor disponible.`,
    keywords: ["cobertura", "5G", "Comunidad Valenciana", "infraestructura", "conectividad"],
  },
  {
    category: "infraestructura",
    title: "Cómo se compara la cobertura VHCN con la media nacional",
    content: `La comparación de la **cobertura VHCN** (Very High Capacity Network) con la **media nacional** se realiza en el marco de la dimensión **Infraestructura Digital**. Los indicadores de conectividad (VHCN, banda ancha, etc.) se normalizan y comparan con referencias nacionales y europeas. Consulta la ficha de la dimensión Infraestructura Digital y el indicador específico de VHCN en **Todos los Indicadores (KPIs)** para ver valores por territorio y periodo.`,
    keywords: ["VHCN", "cobertura", "media nacional", "banda ancha", "infraestructura"],
  },
  {
    category: "infraestructura",
    title: "El precio relativo de la banda ancha es competitivo",
    content: `El **precio relativo de la banda ancha** y su competitividad se evalúa mediante indicadores de la dimensión **Infraestructura Digital**. Los datos de precios y comparativas con otros territorios o con la media nacional/UE están en la base de indicadores. Puedes buscar "banda ancha" o "precio" en **Todos los Indicadores (KPIs)** o preguntar en el chatbot por el indicador de precio de banda ancha para ver el valor actual y la posición relativa.`,
    keywords: ["precio", "banda ancha", "competitivo", "infraestructura"],
  },
  {
    category: "infraestructura",
    title: "Qué provincias presentan mejor conectividad digital",
    content: `Las **provincias** con **mejor conectividad digital** se pueden ver en la sección **Comparación Territorial**: la dimensión **Infraestructura Digital** tiene una puntuación por provincia (Valencia, Alicante, Castellón). La que tenga mayor score en esa dimensión es la que presenta mejor resultado en conectividad. También en el **Dashboard** puedes seleccionar la dimensión Infraestructura Digital y comparar las tres provincias. Pregunta en el chatbot: "¿Cómo está la infraestructura digital en Valencia?" (o Alicante/Castellón) para obtener el dato.`,
    keywords: ["provincias", "conectividad digital", "infraestructura", "Valencia", "Alicante", "Castellón"],
  },

  // --- 4. Capital humano ---
  {
    category: "capital_humano",
    title: "Qué porcentaje de la población tiene competencias digitales básicas",
    content: `El **porcentaje de población con competencias digitales básicas** se mide con indicadores de la dimensión **Capital Humano**, subdimensión relacionada con competencias digitales (por ejemplo "Personas con habilidades digitales básicas"). Los valores por territorio y periodo están en **Todos los Indicadores (KPIs)**. Puedes preguntar en el chatbot: "¿Qué porcentaje tiene competencias digitales básicas?" o "Personas con habilidades digitales básicas en Castellón" para obtener el valor en una provincia.`,
    keywords: ["población", "competencias digitales", "básicas", "capital humano", "porcentaje"],
  },
  {
    category: "capital_humano",
    title: "Cuál es la brecha generacional en competencias digitales",
    content: `La **brecha generacional en competencias digitales** se analiza mediante indicadores de la dimensión **Capital Humano** que comparan niveles de competencia por grupos de edad. Consulta en **Todos los Indicadores (KPIs)** o en **Dimensiones** → Capital Humano los indicadores relacionados con brecha generacional o competencias por edad. Los valores actuales por territorio están en la base de resultados.`,
    keywords: ["brecha generacional", "competencias digitales", "capital humano", "edad"],
  },
  {
    category: "capital_humano",
    title: "Qué porcentaje de empresas ofrece formación digital a sus empleados",
    content: `El **porcentaje de empresas que ofrecen formación digital** a sus empleados es un indicador de la dimensión **Capital Humano** (formación en competencias digitales en el tejido empresarial). Puedes buscar en **Todos los Indicadores (KPIs)** por "formación digital" o "empresas formación" y consultar el valor por territorio y periodo.`,
    keywords: ["empresas", "formación digital", "empleados", "capital humano", "porcentaje"],
  },
  {
    category: "capital_humano",
    title: "Existen dificultades para contratar perfiles TIC",
    content: `Las **dificultades para contratar perfiles TIC** se recogen en indicadores de la dimensión **Capital Humano** (oferta/demanda de talento digital). Consulta en **Todos los Indicadores (KPIs)** o en la dimensión Capital Humano los indicadores sobre contratación, escasez de perfiles TIC o dificultades de reclutamiento. Los valores por territorio y periodo están en la base de datos.`,
    keywords: ["dificultades", "contratar", "perfiles TIC", "capital humano", "empleo"],
  },
  {
    category: "capital_humano",
    title: "Cómo evoluciona el empleo en el sector tecnológico",
    content: `La **evolución del empleo en el sector tecnológico** se sigue con indicadores de la dimensión **Capital Humano** (empleo TIC, ocupación en tecnología). Puedes ver la evolución temporal en la sección **Evolución Temporal** del menú y filtrar por indicadores de empleo tecnológico, o consultar **Todos los Indicadores (KPIs)** y la dimensión Capital Humano para los datos por territorio y año.`,
    keywords: ["empleo", "sector tecnológico", "evolución", "capital humano", "TIC"],
  },

  // --- 5. Transformación digital empresarial ---
  {
    category: "transformacion_digital",
    title: "Qué porcentaje de empresas utiliza ERP",
    content: `El **porcentaje de empresas que utilizan ERP** es un indicador de la dimensión **Transformación Digital Empresarial**. Los valores por territorio y periodo están en **Todos los Indicadores (KPIs)**. Busca "ERP" o "empresas ERP" en los indicadores o en el chatbot para obtener el dato actual.`,
    keywords: ["empresas", "ERP", "transformación digital", "porcentaje"],
  },
  {
    category: "transformacion_digital",
    title: "Cuántas empresas utilizan inteligencia artificial",
    content: `El uso de **inteligencia artificial** en empresas se mide con indicadores de la dimensión **Transformación Digital Empresarial**. Puedes consultar en **Todos los Indicadores (KPIs)** el indicador de empresas que usan IA, o preguntar en el chatbot "empresas inteligencia artificial" o "IA empresas" para ver el valor por territorio y periodo.`,
    keywords: ["empresas", "inteligencia artificial", "IA", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Cuál es el nivel de adopción de tecnologías en pymes frente a grandes empresas",
    content: `La **adopción de tecnologías en pymes frente a grandes empresas** se analiza con indicadores de la dimensión **Transformación Digital Empresarial** que desglosan por tamaño de empresa (pyme, gran empresa). Consulta **Todos los Indicadores (KPIs)** o la dimensión Transformación Digital Empresarial para indicadores por tamaño y territorio.`,
    keywords: ["adopción", "tecnologías", "pymes", "grandes empresas", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Qué peso tiene el comercio electrónico en los ingresos empresariales",
    content: `El **peso del comercio electrónico en los ingresos** empresariales se mide con indicadores de la dimensión **Transformación Digital Empresarial** (ventas online, e-commerce). Los valores por territorio y periodo están en **Todos los Indicadores (KPIs)**. Busca "comercio electrónico" o "e-commerce" en indicadores o en el chatbot.`,
    keywords: ["comercio electrónico", "ingresos", "empresas", "transformación digital", "e-commerce"],
  },
  {
    category: "transformacion_digital",
    title: "Cuál es el Índice de Intensidad Digital DII medio regional",
    content: `El **Índice de Intensidad Digital (DII)** medio regional se refleja en indicadores de la dimensión **Transformación Digital Empresarial**. Consulta en **Todos los Indicadores (KPIs)** o en la dimensión el indicador de intensidad digital o DII para ver el valor por territorio (Comunitat Valenciana o por provincia) y periodo.`,
    keywords: ["índice intensidad digital", "DII", "regional", "transformación digital"],
  },
  {
    category: "transformacion_digital",
    title: "Qué sectores están más digitalizados",
    content: `El grado de **digitalización por sectores** se puede analizar con indicadores de la dimensión **Transformación Digital Empresarial** cuando existan desgloses por sector de actividad. Consulta **Todos los Indicadores (KPIs)** y la ficha de Transformación Digital Empresarial para indicadores por sector y territorio.`,
    keywords: ["sectores", "digitalizados", "transformación digital", "actividad"],
  },

  // --- 6. Sostenibilidad digital ---
  {
    category: "sostenibilidad",
    title: "Cuántas empresas usan TIC para eficiencia energética",
    content: `Las **empresas que usan TIC para eficiencia energética** se recogen en indicadores de la dimensión **Sostenibilidad Digital**. Consulta en **Todos los Indicadores (KPIs)** o en **Dimensiones** → Sostenibilidad Digital los indicadores sobre uso de TIC para eficiencia energética. Los valores por territorio y periodo están en la base de datos.`,
    keywords: ["empresas", "TIC", "eficiencia energética", "sostenibilidad digital"],
  },
  {
    category: "sostenibilidad",
    title: "Qué porcentaje de empresas tiene plan de descarbonización",
    content: `El **porcentaje de empresas con plan de descarbonización** es un indicador de la dimensión **Sostenibilidad Digital**. Puedes buscar en **Todos los Indicadores (KPIs)** por "descarbonización" o "plan" y en la dimensión Sostenibilidad Digital para ver el valor por territorio y periodo.`,
    keywords: ["empresas", "plan descarbonización", "sostenibilidad", "porcentaje"],
  },
  {
    category: "sostenibilidad",
    title: "Cuál es el consumo energético medio de infraestructuras digitales",
    content: `El **consumo energético** de **infraestructuras digitales** se puede medir con indicadores de la dimensión **Sostenibilidad Digital** (centros de datos, redes, etc.). Consulta **Todos los Indicadores (KPIs)** y la dimensión Sostenibilidad Digital para indicadores de consumo energético y territorio.`,
    keywords: ["consumo energético", "infraestructuras digitales", "sostenibilidad"],
  },
  {
    category: "sostenibilidad",
    title: "Cómo se posiciona la región en gestión de residuos electrónicos",
    content: `La **gestión de residuos electrónicos** en la región se puede evaluar con indicadores de la dimensión **Sostenibilidad Digital** cuando existan. Consulta **Todos los Indicadores (KPIs)** y la dimensión Sostenibilidad Digital para indicadores sobre residuos electrónicos, RAEE o reciclaje de equipos.`,
    keywords: ["residuos electrónicos", "gestión", "región", "sostenibilidad", "RAEE"],
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
    content: `La **dimensión con mayor impacto** en el índice global depende de los **pesos** asignados a cada dimensión en la metodología BRAINNOVA (consulta **Metodología** en el menú). Las dimensiones con mayor peso contribuyen más al índice. También puedes analizar la sensibilidad del índice a cada dimensión revisando los pesos en la tabla de dimensiones de la base de datos.`,
    keywords: ["dimensión", "impacto", "índice global", "pesos", "ponderación"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué ocurriría si aumentara un 10% la adopción de IA",
    content: `Un **aumento del 10% en la adopción de IA** en empresas afectaría al score de la subdimensión/dimensión **Transformación Digital Empresarial** y por tanto al índice global, según el peso del indicador de IA en esa dimensión. Para una simulación exacta habría que recalcular la normalización y el índice con los nuevos valores. La metodología está descrita en **Metodología**; los indicadores de IA están en Transformación Digital Empresarial.`,
    keywords: ["adopción", "IA", "inteligencia artificial", "simulación", "impacto"],
  },
  {
    category: "analisis_avanzado",
    title: "Cuál es la correlación entre capital humano y digitalización empresarial",
    content: `La **correlación entre capital humano y digitalización empresarial** se puede analizar comparando los scores de las dimensiones **Capital Humano** y **Transformación Digital Empresarial** por territorio y periodo en **Comparación Territorial** y en el **Dashboard**. No se calcula automáticamente en el panel; para un análisis estadístico de correlación sería necesario exportar los datos y tratarlos con una herramienta externa.`,
    keywords: ["correlación", "capital humano", "digitalización empresarial", "dimensiones"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué indicadores explican la brecha respecto al top europeo",
    content: `Los **indicadores que explican la brecha respecto al top europeo** son aquellos en los que el territorio (Comunitat Valenciana o provincia) tiene un valor claramente por debajo de la referencia UE. Puedes revisar en las **Dimensiones** (detalle de cada una) la comparativa con España y UE por subdimensión e indicador; los que muestren mayor diferencia con la UE son los que más contribuyen a la brecha. La metodología de referencia está en **Metodología**.`,
    keywords: ["indicadores", "brecha", "top europeo", "UE", "explican"],
  },
  {
    category: "analisis_avanzado",
    title: "Qué áreas deberían priorizarse para mejorar el índice global",
    content: `Las **áreas a priorizar** para mejorar el índice global son aquellas dimensiones o subdimensiones en las que el territorio tiene **scores más bajos** o **mayor brecha** respecto a la referencia (nacional o UE). Consulta **Comparación Territorial** y el **Dashboard** para ver en qué dimensiones hay más margen de mejora; las que estén por debajo de la media o con menor puntuación son candidatas a priorización. La **Metodología** explica los pesos de cada dimensión.`,
    keywords: ["áreas", "priorizar", "mejorar", "índice global", "dimensiones"],
  },

  // --- 12. Preguntas metodológicas ---
  {
    category: "metodologia",
    title: "Cómo se ponderan las dimensiones",
    content: `Las **dimensiones** del índice BRAINNOVA se **ponderan** según los pesos definidos en la metodología del proyecto. Cada dimensión tiene un peso que se aplica al calcular el índice global (promedio ponderado de las 7 dimensiones). Los pesos se pueden consultar en la tabla **dimensiones** de la base de datos y en la sección **Metodología** del panel. La ponderación permite dar más importancia a unas dimensiones que a otras en el resultado final.`,
    keywords: ["ponderan", "dimensiones", "pesos", "metodología", "índice"],
  },
  {
    category: "metodologia",
    title: "Qué fuentes de datos se utilizan",
    content: `Las **fuentes de datos** del índice BRAINNOVA dependen de cada indicador: Eurostat, INE, fuentes sectoriales (telecomunicaciones, empleo, empresa, etc.) y datos propios del proyecto. En la ficha de cada indicador en **Todos los Indicadores (KPIs)** se muestra el campo **Fuente** cuando está disponible. La **Metodología** del menú resume el marco general de fuentes y cálculo.`,
    keywords: ["fuentes", "datos", "Eurostat", "INE", "metodología"],
  },
  {
    category: "metodologia",
    title: "Cada cuánto se actualizan los indicadores",
    content: `La **actualización de los indicadores** depende de la disponibilidad de las fuentes oficiales (anual, semestral, etc.). Los periodos disponibles en el panel (por ejemplo 2022, 2023, 2024) se configuran según los datos cargados en la base de resultados. Puedes ver el **último periodo** disponible en cada indicador en **Todos los Indicadores (KPIs)** y en las vistas de Comparación Territorial y Dashboard al seleccionar el año.`,
    keywords: ["actualizan", "indicadores", "periodo", "fuentes", "frecuencia"],
  },
  {
    category: "metodologia",
    title: "Cómo se calcula la normalización frente al top europeo",
    content: `La **normalización frente al top europeo** consiste en comparar el valor del indicador en el territorio con el valor de referencia (máximo o media del top europeo). Se aplica una normalización Min-Max donde el máximo (o el valor de referencia europeo) corresponde a 100 y el mínimo a 0, de modo que el territorio se sitúa en esa escala. Los detalles se explican en la sección **Metodología** del menú.`,
    keywords: ["normalización", "top europeo", "cálculo", "metodología", "referencia"],
  },
  {
    category: "metodologia",
    title: "Se puede recalcular el índice con otra ponderación",
    content: `**Recalcular el índice con otra ponderación** es posible si se dispone de los scores por dimensión y se aplica una nueva fórmula de agregación (nuevos pesos). La metodología actual usa pesos fijos por dimensión; para una ponderación alternativa habría que tomar los scores de cada dimensión (que ya están calculados) y aplicar la media ponderada con los nuevos pesos. Esto podría implementarse como herramienta de simulación en el panel o fuera de él con los datos exportados.`,
    keywords: ["recalcular", "índice", "ponderación", "pesos", "metodología"],
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
