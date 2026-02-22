-- Seed resultado_indicadores para TODOS los 84 indicadores, periodo 2025.
-- 9 paises con valores variados usando funciones hash para mayor dispersion.
-- Idempotente: no inserta si ya existe (id_indicador, pais, periodo=2025).

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
    -- Valor base entre 15 y 85 con alta variacion por indicador y pais
    LEAST(95, GREATEST(8,
      CASE
        -- Paises Bajos: lider digital europeo
        WHEN p.pais = 'Países Bajos' THEN
          42 + ((i.id_indicador * 31 + 17) % 43) + ((i.id_subdimension * 13) % 11)
        -- Alemania: fuerte en industria y tecnologia
        WHEN p.pais = 'Alemania' THEN
          38 + ((i.id_indicador * 29 + 23) % 41) + ((i.id_subdimension * 11) % 9)
        -- Francia: equilibrada
        WHEN p.pais = 'Francia' THEN
          33 + ((i.id_indicador * 37 + 7) % 39) + ((i.id_subdimension * 7) % 13)
        -- Italia: por debajo de media UE
        WHEN p.pais = 'Italia' THEN
          28 + ((i.id_indicador * 23 + 11) % 37) + ((i.id_subdimension * 17) % 8)
        -- España: media-baja UE
        WHEN p.pais = 'España' THEN
          30 + ((i.id_indicador * 41 + 3) % 38) + ((i.id_subdimension * 9) % 12)
        -- Valencia: ligeramente por encima de España
        WHEN p.pais = 'Valencia' THEN
          32 + ((i.id_indicador * 19 + 29) % 40) + ((i.id_subdimension * 23) % 10)
        -- Comunitat Valenciana: similar a Valencia
        WHEN p.pais = 'Comunitat Valenciana' THEN
          31 + ((i.id_indicador * 43 + 13) % 39) + ((i.id_subdimension * 19) % 11)
        -- Alicante: algo inferior a Valencia
        WHEN p.pais = 'Alicante' THEN
          29 + ((i.id_indicador * 17 + 37) % 36) + ((i.id_subdimension * 29) % 9)
        -- Castellon: algo inferior
        WHEN p.pais = 'Castellón' THEN
          27 + ((i.id_indicador * 13 + 41) % 38) + ((i.id_subdimension * 31) % 8)
        ELSE
          30 + ((i.id_indicador * 7 + 19) % 40)
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
    WHERE r2.id_indicador = c.id_indicador AND r2.pais = c.pais AND r2.periodo = 2025
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.resultado_indicadores r3
    WHERE r3.nombre_indicador = c.nombre_indicador AND r3.pais = c.pais AND r3.periodo = 2025
  )
),
numeradas AS (
  SELECT
    (SELECT COALESCE(MAX(r.id), 0) FROM public.resultado_indicadores r) + row_number() OVER (ORDER BY f.id_indicador, f.pais) AS new_id,
    f.*
  FROM filtrar f
)
INSERT INTO public.resultado_indicadores (id, id_indicador, nombre_indicador, valor_calculado, periodo, pais)
SELECT new_id, id_indicador, nombre_indicador, valor_sintetico, 2025, pais
FROM numeradas;
