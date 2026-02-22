-- Añadir id_subdimension a la vista definicion_indicadores para emparejar indicadores con subdimensiones por id.
-- Solo se modifica si definicion_indicadores es una vista (no una tabla).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'definicion_indicadores'
  ) THEN
    DROP VIEW public.definicion_indicadores;
    CREATE VIEW public.definicion_indicadores AS
    SELECT
      d.id,
      d.nombre,
      d.id_subdimension,
      s.nombre AS nombre_subdimension,
      d.importancia,
      d.formula,
      d.fuente,
      d.origen_indicador
    FROM public.definiciones_indicadores d
    LEFT JOIN public.subdimensiones s ON s.id = d.id_subdimension;
  END IF;
END $$;
