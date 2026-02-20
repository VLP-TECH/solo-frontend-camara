-- Asegurar que informes.id sea text (no uuid) para que la app pueda usar ids como 'brainnova-2025'.
-- Sin esto, el update/upsert desde la app falla con "invalid input syntax for type uuid".

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'informes' AND column_name = 'id';

  IF col_type = 'uuid' THEN
    ALTER TABLE public.informes ALTER COLUMN id TYPE text USING id::text;
    RAISE NOTICE 'informes.id cambiado de uuid a text';
  ELSIF col_type IS NULL THEN
    RAISE NOTICE 'Tabla informes o columna id no encontrada';
  END IF;
END $$;
