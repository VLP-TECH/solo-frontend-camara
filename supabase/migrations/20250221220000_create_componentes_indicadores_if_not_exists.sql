-- Tipo ENUM para fuente (si no existe)
DO $$ BEGIN
  CREATE TYPE public.fuentes_tablas AS ENUM ('DATOS_CRUDOS', 'DATOS_MACRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabla componentes_indicadores (si no existe)
CREATE TABLE IF NOT EXISTS public.componentes_indicadores (
  id integer PRIMARY KEY,
  id_indicador integer,
  descripcion_dato character varying(200),
  fuente public.fuentes_tablas,
  rol character varying(18) NOT NULL
);
