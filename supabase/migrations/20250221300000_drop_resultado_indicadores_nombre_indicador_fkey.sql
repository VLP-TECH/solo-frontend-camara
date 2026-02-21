-- Quitar FK de nombre_indicador para poder cargar CSV sin indicador (rellenar después con UPDATE)
ALTER TABLE public.resultado_indicadores
  DROP CONSTRAINT IF EXISTS resultado_indicadores_nombre_indicador_fkey;
