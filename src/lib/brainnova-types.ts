// Tipos TypeScript para la API de Brainnova

export interface FiltrosGlobalesResponse {
  paises: string[];
  provincias: string[];
  sectores: string[];
  tamanos_empresa: string[];
  anios: number[];
}

export interface ResultadosResponse {
  // Estructura de respuesta del endpoint /api/v1/resultados
  // Ajustar según la respuesta real de la API
  periodo: number;
  valor: number;
  [key: string]: any;
}

/** Request POST /api/v1/brainnova-score. Solo periodo afecta al cálculo; resto por compatibilidad. Usar "" no null. */
export interface BrainnovaScoreRequest {
  periodo: number;
  pais?: string;
  provincia?: string;
  sector?: string;
  tamano_empresa?: string;
}

/** Una dimensión en la respuesta de brainnova-score (7 dimensiones, orden alfabético; sin datos score = 0.0). */
export interface DesgloseDimension {
  dimension: string;
  score_valencia: number;
  score_media_eu: number;
  score_top_eu: number;
  peso_configurado?: number;
}

/** Response POST /api/v1/brainnova-score. Escala 0–100; no convertir 0.0 en null. */
export interface BrainnovaScoreResponse {
  brainnova_global_score: number;
  pais: string;
  periodo: number;
  desglose_por_dimension: DesgloseDimension[];
}

