-- Crear tabla subdimensiones si no existe (subdimensiones por dimensión)
CREATE TABLE IF NOT EXISTS public.subdimensiones (
  id integer PRIMARY KEY,
  nombre character varying(200) NOT NULL,
  peso integer NOT NULL DEFAULT 0,
  id_dimension integer NOT NULL,
  nombre_dimension character varying(100)
);

-- Asegurar columnas si la tabla ya existía (antes de crear índice)
ALTER TABLE public.subdimensiones ADD COLUMN IF NOT EXISTS id_dimension integer;
ALTER TABLE public.subdimensiones ADD COLUMN IF NOT EXISTS nombre_dimension character varying(100);

CREATE INDEX IF NOT EXISTS subdimensiones_id_dimension_idx
  ON public.subdimensiones (id_dimension);

-- RLS
ALTER TABLE public.subdimensiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select subdimensiones" ON public.subdimensiones;
CREATE POLICY "Allow insert and select subdimensiones"
  ON public.subdimensiones FOR ALL USING (true) WITH CHECK (true);
