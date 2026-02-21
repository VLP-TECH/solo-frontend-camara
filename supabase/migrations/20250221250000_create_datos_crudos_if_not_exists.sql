-- Crear tabla datos_crudos si no existe
CREATE TABLE IF NOT EXISTS public.datos_crudos (
  id integer PRIMARY KEY,
  id_indicador integer,
  descripcion_dato character varying(200),
  unidad character varying(40),
  valor numeric(20,2),
  periodo integer,
  pais character varying(100),
  provincia character varying(100),
  tamano_empresa character varying(100),
  sector character varying(300),
  procesado boolean
);

-- Asegurar columnas si la tabla ya existía con menos
ALTER TABLE public.datos_crudos ADD COLUMN IF NOT EXISTS sector character varying(300);
ALTER TABLE public.datos_crudos ADD COLUMN IF NOT EXISTS tamano_empresa character varying(100);
ALTER TABLE public.datos_crudos ADD COLUMN IF NOT EXISTS procesado boolean;

-- RLS: permitir carga y lectura
ALTER TABLE public.datos_crudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert and select datos_crudos" ON public.datos_crudos;
CREATE POLICY "Allow insert and select datos_crudos"
  ON public.datos_crudos FOR ALL USING (true) WITH CHECK (true);
