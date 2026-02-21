-- Vista para que el frontend pueda leer desde definiciones_indicadores con el nombre que usa (definicion_indicadores).
-- Solo se crea si no existe ya la tabla definicion_indicadores (para no pisar esquemas existentes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'definicion_indicadores'
  ) THEN
    DROP VIEW IF EXISTS public.definicion_indicadores;
    CREATE VIEW public.definicion_indicadores AS
    SELECT
      d.id,
      d.nombre,
      s.nombre AS nombre_subdimension,
      d.importancia,
      d.formula,
      d.fuente,
      d.origen_indicador
    FROM public.definiciones_indicadores d
    LEFT JOIN public.subdimensiones s ON s.id = d.id_subdimension;
  END IF;
END $$;
