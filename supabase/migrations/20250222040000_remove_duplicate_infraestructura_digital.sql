-- Elimina la fila duplicada "Infraestructura Digital" (D mayuscula) de la tabla dimensiones.
-- La fila correcta es "Infraestructura digital" (d minuscula), que es la referenciada por subdimensiones.
DELETE FROM public.dimensiones WHERE nombre = 'Infraestructura Digital';

-- Tambien elimina la subdimension duplicada "Acceso a Infraestructuras" (id null) que ya existe como id=11.
DELETE FROM public.subdimensiones WHERE nombre = 'Acceso a Infraestructuras' AND id IS NULL;
