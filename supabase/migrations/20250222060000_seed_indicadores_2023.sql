-- Seed resultado_indicadores para TODOS los 84 indicadores, periodo 2023.
-- 9 paises con valores variados, ligeramente inferiores a 2024 (tendencia creciente).
-- Idempotente: no inserta si ya existe (id_indicador, pais, periodo=2023).

WITH paises AS (
  SELECT unnest(ARRAY[
    'España', 'Valencia', 'Comunitat Valenciana', 'Alicante', 'Castellón',
    'Alemania', 'Francia', 'Italia', 'Países Bajos'
  ]) AS pais
),
indicadores AS (
  SELECT id AS id_indicador, nombre AS nombre_indicador, id_subdimension
  FROM public.definiciones_indicadores
),
combinaciones AS (
  SELECT
    i.id_indicador,
    i.nombre_indicador,
    i.id_subdimension,
    p.pais,
    LEAST(90, GREATEST(5,
      CASE
        WHEN p.pais = 'Países Bajos' THEN
          39 + ((i.id_indicador * 29 + 11) % 41) + ((i.id_subdimension * 17) % 10)
        WHEN p.pais = 'Alemania' THEN
          35 + ((i.id_indicador * 23 + 19) % 39) + ((i.id_subdimension * 13) % 8)
        WHEN p.pais = 'Francia' THEN
          30 + ((i.id_indicador * 41 + 3) % 37) + ((i.id_subdimension * 11) % 12)
        WHEN p.pais = 'Italia' THEN
          25 + ((i.id_indicador * 19 + 7) % 35) + ((i.id_subdimension * 23) % 7)
        WHEN p.pais = 'España' THEN
          27 + ((i.id_indicador * 37 + 13) % 36) + ((i.id_subdimension * 7) % 11)
        WHEN p.pais = 'Valencia' THEN
          29 + ((i.id_indicador * 13 + 31) % 38) + ((i.id_subdimension * 29) % 9)
        WHEN p.pais = 'Comunitat Valenciana' THEN
          28 + ((i.id_indicador * 47 + 9) % 37) + ((i.id_subdimension * 21) % 10)
        WHEN p.pais = 'Alicante' THEN
          26 + ((i.id_indicador * 11 + 43) % 34) + ((i.id_subdimension * 37) % 8)
        WHEN p.pais = 'Castellón' THEN
          24 + ((i.id_indicador * 17 + 29) % 36) + ((i.id_subdimension * 41) % 7)
        ELSE
          27 + ((i.id_indicador * 7 + 23) % 38)
      END
    ))::numeric(20,6) AS valor_sintetico
  FROM indicadores i
  CROSS JOIN paises p
),
filtrar AS (
  SELECT c.*
  FROM combinaciones c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.resultado_indicadores r2
    WHERE r2.id_indicador = c.id_indicador AND r2.pais = c.pais AND r2.periodo = 2023
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.resultado_indicadores r3
    WHERE r3.nombre_indicador = c.nombre_indicador AND r3.pais = c.pais AND r3.periodo = 2023
  )
),
numeradas AS (
  SELECT
    (SELECT COALESCE(MAX(r.id), 0) FROM public.resultado_indicadores r) + row_number() OVER (ORDER BY f.id_indicador, f.pais) AS new_id,
    f.*
  FROM filtrar f
)
INSERT INTO public.resultado_indicadores (id, id_indicador, nombre_indicador, valor_calculado, periodo, pais)
SELECT new_id, id_indicador, nombre_indicador, valor_sintetico, 2023, pais
FROM numeradas;
