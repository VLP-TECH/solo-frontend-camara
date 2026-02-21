-- Rellena nombre_indicador en resultado_indicadores desde la cadena:
-- resultado_indicadores.id → componentes_resultados.id_resultado → componentes_indicadores (id_indicador) → definiciones_indicadores.nombre
-- Así el dashboard y /dimensiones pueden mostrar datos en lugar de 0 cuando filtran por nombre_indicador.

UPDATE resultado_indicadores r
SET nombre_indicador = sub.nombre
FROM (
  SELECT DISTINCT ON (cr.id_resultado) cr.id_resultado, di.nombre
  FROM componentes_resultados cr
  JOIN componentes_indicadores ci ON ci.id = cr.id_componente
  JOIN definiciones_indicadores di ON di.id = ci.id_indicador
  ORDER BY cr.id_resultado, ci.id_indicador
) sub
WHERE r.id = sub.id_resultado
  AND (r.nombre_indicador IS NULL OR r.nombre_indicador = '');
