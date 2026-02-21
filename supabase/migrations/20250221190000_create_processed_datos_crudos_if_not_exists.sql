-- Crear tabla processed_datos_crudos si no existe (para cargar CSV de datos calculados)
CREATE TABLE IF NOT EXISTS public.processed_datos_crudos (
  id integer PRIMARY KEY,
  id_dato_crudo integer NOT NULL,
  descripcion_dato character varying(200),
  valor numeric(20,2),
  unidad_tipo character varying(50),
  unidad_display character varying(80),
  periodo date,
  pais character varying(100),
  provincia character varying(100),
  tamano_empresa character varying(100),
  sector character varying(300),
  procesado boolean
);

CREATE UNIQUE INDEX IF NOT EXISTS processed_datos_crudos_id_dato_crudo_key
  ON public.processed_datos_crudos (id_dato_crudo);
