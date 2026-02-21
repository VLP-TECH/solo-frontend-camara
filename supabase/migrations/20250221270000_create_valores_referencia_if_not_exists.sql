-- Crear tabla valores_referencia si no existe (referencias por indicador y periodo)
CREATE TABLE IF NOT EXISTS public.valores_referencia (
  id integer PRIMARY KEY,
  id_indicador integer NOT NULL,
  periodo integer NOT NULL,
  valor_min_global numeric(20,6),
  valor_media_eu numeric(20,6),
  valor_top_eu numeric(20,6)
);

CREATE UNIQUE INDEX IF NOT EXISTS valores_referencia_id_indicador_periodo_key
  ON public.valores_referencia (id_indicador, periodo);

-- RLS
ALTER TABLE public.valores_referencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select valores_referencia" ON public.valores_referencia;
CREATE POLICY "Allow insert and select valores_referencia"
  ON public.valores_referencia FOR ALL USING (true) WITH CHECK (true);
