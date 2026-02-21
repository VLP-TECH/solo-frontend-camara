-- Crear tabla resultado_indicadores si no existe (resultados calculados por indicador)
CREATE TABLE IF NOT EXISTS public.resultado_indicadores (
  id integer PRIMARY KEY,
  id_indicador integer,
  nombre_indicador character varying(200),
  valor_calculado numeric(20,6),
  fecha_calculo date,
  unidad_tipo character varying(50),
  unidad_display character varying(120),
  periodo date,
  pais character varying(100),
  provincia character varying(100),
  sector character varying(100),
  tamano_empresa character varying(100)
);

CREATE INDEX IF NOT EXISTS resultado_indicadores_nombre_indicador_idx
  ON public.resultado_indicadores (nombre_indicador);
CREATE INDEX IF NOT EXISTS resultado_indicadores_pais_periodo_idx
  ON public.resultado_indicadores (pais, periodo);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS id_indicador integer;
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS nombre_indicador character varying(200);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS valor_calculado numeric(20,6);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS fecha_calculo date;
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS unidad_tipo character varying(50);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS unidad_display character varying(120);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS periodo date;
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS pais character varying(100);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS provincia character varying(100);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS sector character varying(100);
ALTER TABLE public.resultado_indicadores ADD COLUMN IF NOT EXISTS tamano_empresa character varying(100);

-- RLS
ALTER TABLE public.resultado_indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select resultado_indicadores" ON public.resultado_indicadores;
CREATE POLICY "Allow insert and select resultado_indicadores"
  ON public.resultado_indicadores FOR ALL USING (true) WITH CHECK (true);
