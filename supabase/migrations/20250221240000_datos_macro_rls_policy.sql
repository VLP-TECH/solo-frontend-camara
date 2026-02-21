-- Permitir INSERT y SELECT en datos_macro (para scripts de carga y lectura desde la app).
-- Si prefieres restringir: usa solo la service_role key en el script y no apliques esta migración.

ALTER TABLE public.datos_macro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert and select datos_macro" ON public.datos_macro;
CREATE POLICY "Allow insert and select datos_macro"
  ON public.datos_macro
  FOR ALL
  USING (true)
  WITH CHECK (true);
