-- Crear tabla resultado_fuentes_asociacion si no existe (asociación resultado ↔ dato_crudo / dato_macro)
CREATE TABLE IF NOT EXISTS public.resultado_fuentes_asociacion (
  id bigserial PRIMARY KEY,
  resultado_id integer NOT NULL,
  dato_crudo_id integer,
  dato_macro_id integer
);

CREATE INDEX IF NOT EXISTS resultado_fuentes_asociacion_resultado_id_idx
  ON public.resultado_fuentes_asociacion (resultado_id);
CREATE INDEX IF NOT EXISTS resultado_fuentes_asociacion_dato_crudo_idx
  ON public.resultado_fuentes_asociacion (dato_crudo_id) WHERE dato_crudo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS resultado_fuentes_asociacion_dato_macro_idx
  ON public.resultado_fuentes_asociacion (dato_macro_id) WHERE dato_macro_id IS NOT NULL;

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.resultado_fuentes_asociacion ADD COLUMN IF NOT EXISTS resultado_id integer;
ALTER TABLE public.resultado_fuentes_asociacion ADD COLUMN IF NOT EXISTS dato_crudo_id integer;
ALTER TABLE public.resultado_fuentes_asociacion ADD COLUMN IF NOT EXISTS dato_macro_id integer;

-- RLS
ALTER TABLE public.resultado_fuentes_asociacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select resultado_fuentes_asociacion" ON public.resultado_fuentes_asociacion;
CREATE POLICY "Allow insert and select resultado_fuentes_asociacion"
  ON public.resultado_fuentes_asociacion FOR ALL USING (true) WITH CHECK (true);
