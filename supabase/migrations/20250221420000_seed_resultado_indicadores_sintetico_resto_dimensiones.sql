-- Datos sintéticos para el resto de dimensiones (Capital Humano, Ecosistema, Infraestructura,
-- Servicios Públicos, Sostenibilidad, Transformación Digital). Subdimensiones 5–19.
-- Inserta en resultado_indicadores filas para todos los indicadores con id_subdimension IN (5..19)
-- en España y territorios valencianos, periodo 2024, con valor_calculado determinista (~35–72).
-- Idempotente: no inserta si ya existe (nombre_indicador, pais, periodo 2024).
-- Emprendimiento (1–4) tiene su propio seed en 20250221410000.

WITH paises AS (
  SELECT unnest(ARRAY['España', 'Valencia', 'Comunitat Valenciana', 'Alicante', 'Castellón']) AS pais
),
indicadores AS (
  SELECT id AS id_indicador, nombre AS nombre_indicador
  FROM public.definiciones_indicadores
  WHERE id_subdimension BETWEEN 5 AND 19
),
combinaciones AS (
  SELECT
    i.id_indicador,
    i.nombre_indicador,
    p.pais,
    (SELECT COALESCE(MAX(r.id), 0) FROM public.resultado_indicadores r) + row_number() OVER (ORDER BY i.id_indicador, p.pais) AS new_id,
    (35 + (i.id_indicador * 11 + (array_position(ARRAY['España', 'Valencia', 'Comunitat Valenciana', 'Alicante', 'Castellón'], p.pais))::int * 2) % 38)::numeric(20,6) AS valor_sintetico
  FROM indicadores i
  CROSS JOIN paises p
),
filtrar AS (
  SELECT c.new_id, c.id_indicador, c.nombre_indicador, c.valor_sintetico, c.pais
  FROM combinaciones c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.resultado_indicadores r2
    WHERE r2.nombre_indicador = c.nombre_indicador AND r2.pais = c.pais AND r2.periodo = 2024
  )
)
INSERT INTO public.resultado_indicadores (id, id_indicador, nombre_indicador, valor_calculado, periodo, pais)
SELECT new_id, id_indicador, nombre_indicador, valor_sintetico, 2024, pais
FROM filtrar;
