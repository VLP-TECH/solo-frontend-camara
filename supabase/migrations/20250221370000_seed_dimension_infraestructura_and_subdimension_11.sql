-- Asegurar que existe la dimensión "Infraestructura digital" (FK subdimensiones_nombre_dimension_fkey)
-- y la subdimensión id 11 "Acceso a infraestructuras" para que el score de dimensión Infraestructura Digital calcule.

-- 1) dimensiones: insertar "Infraestructura digital" si falta (tabla con solo nombre, peso en producción)
INSERT INTO public.dimensiones (nombre, peso)
SELECT 'Infraestructura digital', 15
WHERE NOT EXISTS (SELECT 1 FROM public.dimensiones WHERE nombre = 'Infraestructura digital');

-- 2) subdimensiones: insertar id 11 si no existe (id_dimension opcional si la tabla lo tiene)
INSERT INTO public.subdimensiones (id, nombre, peso, id_dimension, nombre_dimension)
SELECT 11, 'Acceso a infraestructuras', 0, 4, 'Infraestructura digital'
WHERE NOT EXISTS (SELECT 1 FROM public.subdimensiones WHERE id = 11);

-- Por si la fila existe pero con nombre_dimension NULL:
UPDATE public.subdimensiones
SET nombre = 'Acceso a infraestructuras',
    nombre_dimension = 'Infraestructura digital'
WHERE id = 11 AND (nombre_dimension IS NULL OR nombre_dimension = '');
