-- Crear tabla resultados_fuente_crudo si no existe (relación resultado_indicadores ↔ datos_crudos)
CREATE TABLE IF NOT EXISTS public.resultados_fuente_crudo (
  id_resultado integer NOT NULL,
  id_dato_crudo integer NOT NULL,
  PRIMARY KEY (id_resultado, id_dato_crudo)
);

CREATE INDEX IF NOT EXISTS resultados_fuente_crudo_id_dato_crudo_idx
  ON public.resultados_fuente_crudo (id_dato_crudo);

-- RLS
ALTER TABLE public.resultados_fuente_crudo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select resultados_fuente_crudo" ON public.resultados_fuente_crudo;
CREATE POLICY "Allow insert and select resultados_fuente_crudo"
  ON public.resultados_fuente_crudo FOR ALL USING (true) WITH CHECK (true);
