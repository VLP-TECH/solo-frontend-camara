-- Unificar subdimensión duplicada de Infraestructura Digital: una sola "Acceso a infraestructuras" con id 11.
-- 1) Unificar nombre_dimension a 'Infraestructura digital' para todas las subdimensiones de esta dimensión.
-- 2) Reasignar definiciones_indicadores que apunten a subdimensiones duplicadas al id canónico 11.
-- 3) Borrar filas duplicadas de subdimensiones (quedando solo id 11 para "Acceso a infraestructuras").

-- Paso 1: Mismo nombre_dimension para Infraestructura (un solo identificador de nombre)
UPDATE public.subdimensiones
SET nombre_dimension = 'Infraestructura digital'
WHERE TRIM(LOWER(COALESCE(nombre_dimension, ''))) = 'infraestructura digital'
   OR id_dimension = 4;

-- Paso 2: Reasignar indicadores que apuntan a subdimensiones de Infraestructura que no son la 11
UPDATE public.definiciones_indicadores
SET id_subdimension = 11
WHERE id_subdimension IN (
  SELECT s.id FROM public.subdimensiones s
  WHERE TRIM(LOWER(s.nombre_dimension)) = 'infraestructura digital'
    AND TRIM(LOWER(s.nombre)) = 'acceso a infraestructuras'
    AND s.id <> 11
);

-- Paso 3: Borrar subdimensiones duplicadas (misma dimensión y mismo nombre que id 11, distinto id)
DELETE FROM public.subdimensiones
WHERE TRIM(LOWER(nombre_dimension)) = 'infraestructura digital'
  AND TRIM(LOWER(nombre)) = 'acceso a infraestructuras'
  AND id <> 11;
