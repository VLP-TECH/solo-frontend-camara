// Servicio de API para Brainnova Backend
import type {
  FiltrosGlobalesResponse,
  ResultadosResponse,
  BrainnovaScoreRequest,
  BrainnovaScoreResponse,
} from './brainnova-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Construye la URL completa para un endpoint
 */
const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Maneja errores de la API
 */
const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `Error ${response.status}: ${response.statusText}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || errorMessage;
  } catch {
    // Si no se puede parsear el JSON, usar el mensaje por defecto
  }
  throw new Error(errorMessage);
};

/**
 * Obtiene la lista de indicadores disponibles
 * GET /api/v1/indicadores-disponibles
 * Fallback a Supabase si el backend no está disponible
 */
export const getIndicadoresDisponibles = async (): Promise<string[]> => {
  try {
    const response = await fetch(buildUrl('/api/v1/indicadores-disponibles'), {
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si el backend devuelve datos, usarlos
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    // Si el backend devuelve array vacío, intentar desde Supabase
    throw new Error('Backend returned empty data');
  } catch (error) {
    console.warn('Error fetching indicadores from backend, trying Supabase fallback:', error);
    
    // Fallback: obtener indicadores que tienen datos desde Supabase
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Obtener indicadores únicos que tienen resultados
      const { data, error: supabaseError } = await supabase
        .from('resultado_indicadores')
        .select('nombre_indicador')
        .not('nombre_indicador', 'is', null);
      
      if (supabaseError) {
        console.error('Error fetching from Supabase:', supabaseError);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Obtener nombres únicos de indicadores
      const indicadoresUnicos = Array.from(
        new Set(data.map(item => item.nombre_indicador).filter(Boolean))
      ).sort();
      
      return indicadoresUnicos;
    } catch (supabaseError) {
      console.error('Error in Supabase fallback:', supabaseError);
      return [];
    }
  }
};

/**
 * Obtiene filtros globales según parámetros
 * GET /api/v1/filtros-globales
 */
export const getFiltrosGlobales = async (params?: {
  nombre_indicador?: string;
  pais?: string;
  periodo?: number;
  sector?: string;
  tamano?: string;
}): Promise<FiltrosGlobalesResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.nombre_indicador) {
      queryParams.append('nombre_indicador', params.nombre_indicador);
    }
    if (params?.pais) {
      queryParams.append('pais', params.pais);
    }
    if (params?.periodo) {
      queryParams.append('periodo', params.periodo.toString());
    }
    if (params?.sector) {
      queryParams.append('sector', params.sector);
    }
    if (params?.tamano) {
      queryParams.append('tamano', params.tamano);
    }
    
    const url = buildUrl(`/api/v1/filtros-globales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      await handleApiError(response);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching filtros globales:', error);
    // Retornar objeto vacío si hay error de conexión
    return {
      paises: [],
      provincias: [],
      sectores: [],
      tamanos_empresa: [],
      anios: []
    };
  }
};

/**
 * Obtiene resultados históricos para el gráfico
 * GET /api/v1/resultados
 * Fallback a Supabase si el backend no está disponible
 */
export const getResultados = async (params: {
  nombre_indicador: string;
  pais: string;
  sector?: string;
  provincia?: string;
}): Promise<ResultadosResponse[]> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('nombre_indicador', params.nombre_indicador);
    queryParams.append('pais', params.pais);
    
    if (params.sector) {
      queryParams.append('sector', params.sector);
    }
    if (params.provincia) {
      queryParams.append('provincia', params.provincia);
    }
    
    const url = buildUrl(`/api/v1/resultados?${queryParams.toString()}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si el backend devuelve datos, usarlos
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    // Si el backend devuelve array vacío, intentar desde Supabase
    throw new Error('Backend returned empty data');
  } catch (error) {
    console.warn('Error fetching resultados from backend, trying Supabase fallback:', error);
    
    // Fallback: obtener datos directamente desde Supabase
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('resultado_indicadores')
        .select('periodo, valor_calculado, pais, provincia, sector')
        .eq('nombre_indicador', params.nombre_indicador)
        .eq('pais', params.pais)
        .order('periodo', { ascending: true });
      
      if (params.provincia) {
        query = query.eq('provincia', params.provincia);
      } else {
        // Si no se especifica provincia, obtener datos nacionales (provincia null o vacía)
        query = query.or('provincia.is.null,provincia.eq.');
      }
      
      if (params.sector) {
        query = query.eq('sector', params.sector);
      }
      
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) {
        console.error('Error fetching from Supabase:', supabaseError);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Mapear datos de Supabase al formato esperado
      return data.map((item) => ({
        periodo: item.periodo,
        valor: typeof item.valor_calculado === 'number' 
          ? item.valor_calculado 
          : parseFloat(String(item.valor_calculado || 0)) || 0,
      }));
    } catch (supabaseError) {
      console.error('Error in Supabase fallback:', supabaseError);
      return [];
    }
  }
};

/**
 * Calcula el Brainnova Score
 * POST /api/v1/brainnova-score
 */
export const calculateBrainnovaScore = async (
  data: BrainnovaScoreRequest
): Promise<BrainnovaScoreResponse> => {
  try {
    const response = await fetch(buildUrl('/api/v1/brainnova-score'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      await handleApiError(response);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error calculating Brainnova score:', error);
    throw error;
  }
};

