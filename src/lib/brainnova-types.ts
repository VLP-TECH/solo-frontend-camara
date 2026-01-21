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

export interface BrainnovaScoreRequest {
  pais: string;
  periodo: number;
  sector?: string; // Opcional (string vacío si es general)
  tamano_empresa?: string; // Opcional (string vacío si es general)
  provincia?: string; // Opcional (null si es nacional)
}

export interface BrainnovaScoreResponse {
  // Estructura de respuesta del endpoint /api/v1/brainnova-score
  // Ajustar según la respuesta real de la API
  indice_ponderado: number;
  desglose?: {
    [key: string]: number;
  };
  [key: string]: any;
}

