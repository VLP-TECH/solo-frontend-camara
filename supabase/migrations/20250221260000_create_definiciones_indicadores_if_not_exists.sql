-- Crear tabla definiciones_indicadores si no existe
CREATE TABLE IF NOT EXISTS public.definiciones_indicadores (
  id integer PRIMARY KEY,
  nombre character varying(100) NOT NULL,
  id_subdimension integer,
  origen_indicador character varying(50),
  formula character varying(20) NOT NULL,
  importancia character varying(10) NOT NULL,
  fuente character varying(200)
);

-- Índice único por nombre (según schema)
CREATE UNIQUE INDEX IF NOT EXISTS definiciones_indicadores_nombre_key
  ON public.definiciones_indicadores (nombre);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.definiciones_indicadores ADD COLUMN IF NOT EXISTS id_subdimension integer;
ALTER TABLE public.definiciones_indicadores ADD COLUMN IF NOT EXISTS origen_indicador character varying(50);
ALTER TABLE public.definiciones_indicadores ADD COLUMN IF NOT EXISTS formula character varying(20);
ALTER TABLE public.definiciones_indicadores ADD COLUMN IF NOT EXISTS importancia character varying(10);
ALTER TABLE public.definiciones_indicadores ADD COLUMN IF NOT EXISTS fuente character varying(200);

-- RLS
ALTER TABLE public.definiciones_indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select definiciones_indicadores" ON public.definiciones_indicadores;
CREATE POLICY "Allow insert and select definiciones_indicadores"
  ON public.definiciones_indicadores FOR ALL USING (true) WITH CHECK (true);
