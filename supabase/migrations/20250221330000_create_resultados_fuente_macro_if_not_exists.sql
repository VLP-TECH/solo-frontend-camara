-- Crear tabla resultados_fuente_macro si no existe (relación resultado_indicadores ↔ datos_macro)
CREATE TABLE IF NOT EXISTS public.resultados_fuente_macro (
  id_resultado integer NOT NULL,
  id_dato_macro integer NOT NULL,
  PRIMARY KEY (id_resultado, id_dato_macro)
);

CREATE INDEX IF NOT EXISTS resultados_fuente_macro_id_dato_macro_idx
  ON public.resultados_fuente_macro (id_dato_macro);

-- RLS
ALTER TABLE public.resultados_fuente_macro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select resultados_fuente_macro" ON public.resultados_fuente_macro;
CREATE POLICY "Allow insert and select resultados_fuente_macro"
  ON public.resultados_fuente_macro FOR ALL USING (true) WITH CHECK (true);
