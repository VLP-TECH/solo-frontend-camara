-- Crear tabla componentes_resultados si no existe (tabla de unión componente-resultado)
CREATE TABLE IF NOT EXISTS public.componentes_resultados (
  id_componente integer NOT NULL,
  id_resultado integer NOT NULL,
  PRIMARY KEY (id_componente, id_resultado)
);
