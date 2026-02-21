-- Crear tabla datos_macro si no existe (datos macro para indicadores)
CREATE TABLE IF NOT EXISTS public.datos_macro (
  id integer PRIMARY KEY,
  descripcion_dato character varying(200),
  unidad character varying(40),
  valor numeric(20,2),
  periodo integer,
  pais character varying(100),
  provincia character varying(100),
  tamano_empresa character varying(100),
  sector character varying(200)
);

-- Asegurar todas las columnas si la tabla ya existía con menos columnas
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS descripcion_dato character varying(200);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS unidad character varying(40);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS valor numeric(20,2);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS periodo integer;
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS pais character varying(100);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS provincia character varying(100);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS tamano_empresa character varying(100);
ALTER TABLE public.datos_macro ADD COLUMN IF NOT EXISTS sector character varying(200);
