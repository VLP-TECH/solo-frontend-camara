-- Añadir columna visible_to_users a surveys.
-- Si es false, la encuesta no se muestra a usuarios con rol 'user' ni 'editor'.
-- Admin y superadmin siguen viendo todas las encuestas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'visible_to_users'
  ) THEN
    ALTER TABLE public.surveys ADD COLUMN visible_to_users boolean NOT NULL DEFAULT true;
    COMMENT ON COLUMN public.surveys.visible_to_users IS 'Si true, la encuesta se muestra a usuarios y editores. Si false, solo a admin/superadmin.';
  END IF;
END $$;
