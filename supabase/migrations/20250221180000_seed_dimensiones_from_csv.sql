-- Seed/update dimensiones desde CSV (dimensiones (1).csv)
-- Tabla: id, nombre, peso (7 dimensiones BRAINNOVA)

-- Asegurar que la tabla existe (compatible con proyectos donde ya exista)
CREATE TABLE IF NOT EXISTS public.dimensiones (
  id integer PRIMARY KEY,
  nombre character varying(100) NOT NULL,
  peso integer NOT NULL
);

-- Upsert: insertar o actualizar por id
INSERT INTO public.dimensiones (id, nombre, peso)
VALUES
  (1, 'Apoyo al emprendimiento e innovación', 10),
  (2, 'Capital humano', 20),
  (3, 'Ecosistema y colaboración', 15),
  (4, 'Infraestructura digital', 15),
  (5, 'Servicios públicos digitales', 10),
  (6, 'Sostenibilidad digital', 5),
  (7, 'Transformación digital empresarial', 30)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  peso = EXCLUDED.peso;
