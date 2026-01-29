-- Informes: crear tabla si no existe o añadir pdf_url. Así el guardado del PDF funciona correctamente.
DO $$
BEGIN
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
    INSERT INTO public.informes (id, title, description, date, pages, category, format, pdf_url)
    VALUES (
      'brainnova-2025',
      'Informe BRAINNOVA 2025',
      'Informe completo del Índice BRAINNOVA 2025 sobre el estado de la economía digital en la Comunitat Valenciana.',
      'Enero 2025',
      14,
      'Informes anuales',
      'PDF + HTML',
      '/informes/InformeBrainnova_2025.pdf'
    );
  ELSE
    ALTER TABLE public.informes ADD COLUMN IF NOT EXISTS pdf_url text;
  END IF;
END $$;
