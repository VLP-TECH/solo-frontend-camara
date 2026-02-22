-- Seed resultado_indicadores para el indicador "Personas Servicio Banca Electronica"
-- (dimensión Servicios Públicos Digitales) en España y territorios valencianos, mismo
-- flujo que el resto de dimensiones: filas en resultado_indicadores con nombre_indicador
-- para que el score y el detalle de dimensión tengan datos.
--
-- Pipeline estándar (resto de dimensiones): CSV resultado_indicadores + componentes_resultados
-- + backfill nombre_indicador. Esta migración inserta solo las combinaciones (pais, periodo)
-- que falten para este indicador; los valores reales deben venir del mismo CSV/ETL que
-- alimenta el resto (o actualizar valor_calculado después con datos de fuente oficial).
--
-- periodo: en BD puede ser integer (año) o date; se inserta como entero 2024.

WITH paises AS (
  SELECT unnest(ARRAY['España', 'Valencia', 'Comunitat Valenciana', 'Alicante', 'Castellón']) AS pais
),
indicador AS (
  SELECT id AS id_indicador, nombre AS nombre_indicador
  FROM public.definiciones_indicadores
  WHERE nombre = 'Personas Servicio Banca Electronica'
  LIMIT 1
),
base AS (
  SELECT n.pais, i.id_indicador, i.nombre_indicador,
         (SELECT COALESCE(MAX(r.id), 0) FROM public.resultado_indicadores r) + row_number() OVER (ORDER BY n.pais) AS new_id
  FROM paises n
  CROSS JOIN indicador i
),
filtrar AS (
  SELECT b.new_id, b.id_indicador, b.nombre_indicador, b.pais
  FROM base b
  WHERE NOT EXISTS (
    SELECT 1 FROM public.resultado_indicadores r2
    WHERE r2.nombre_indicador = b.nombre_indicador AND r2.pais = b.pais AND r2.periodo = 2024
  )
)
INSERT INTO public.resultado_indicadores (id, id_indicador, nombre_indicador, valor_calculado, periodo, pais)
SELECT new_id, id_indicador, nombre_indicador, 0, 2024, pais
FROM filtrar;

-- Comentario: para sustituir por valores reales, actualizar desde la misma fuente/ETL
-- que usa el resto de dimensiones, o: UPDATE resultado_indicadores SET valor_calculado = <valor>
-- WHERE nombre_indicador = 'Personas Servicio Banca Electronica' AND pais = '...' AND periodo = 2024;
