-- Crear tabla informes completa si no existe, o asegurar que id sea text y tenga pdf_url.
-- Compatible con producción que puede tener columnas en español o inglés.

DO $$
BEGIN
  -- Crear tabla si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'informes') THEN
    CREATE TABLE public.informes (
      id text PRIMARY KEY,
      title text,
      description text,
      date text,
      pages integer DEFAULT 0,
      category text,
      format text DEFAULT 'PDF + HTML',
      pdf_url text,
      created_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabla informes creada';
  ELSE
    -- Si existe, asegurar que id sea text (no uuid)
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
      END IF;
    END $$;
    
    -- Asegurar que pdf_url existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'informes' AND column_name = 'pdf_url'
    ) THEN
      ALTER TABLE public.informes ADD COLUMN pdf_url text;
      RAISE NOTICE 'Columna pdf_url añadida';
    END IF;
  END IF;
END $$;

-- Insertar fila por defecto solo si no existe
INSERT INTO public.informes (id, title, description, date, pages, category, format, pdf_url)
VALUES (
  'brainnova-2025',
  'Informe BRAINNOVA 2025',
  'Informe completo del Índice BRAINNOVA 2025 sobre el estado de la economía digital en la Comunitat Valenciana.',
  'Enero 2025',
  14,
  'Informes anuales',
  'PDF + HTML',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Forzar recarga del esquema en PostgREST para evitar PGRST204
NOTIFY pgrst, 'reload schema';
