-- Optimización de filtros + normalización de país.
--
-- 1) Normaliza "Iceland" → "Islandia" (el resto de países ya están en español).
--    "Desconocido" se deja como está en BD; el frontend ya lo excluye de los filtros
--    y del cálculo. Si se prefiere limpiarlo en origen, descomentar el segundo UPDATE.
--
-- 2) Crea get_filtros_globales(): devuelve en UNA sola consulta los valores DISTINCT
--    de país/provincia/sector/tamaño/años aplicando los filtros ya seleccionados.
--    Sustituye a la paginación de ~16k filas que hace hoy el frontend (17 peticiones).

-- 1) Normalización de país -------------------------------------------------
update public.resultado_indicadores set pais = 'Islandia' where pais = 'Iceland';
-- update public.resultado_indicadores set pais = null where pais = 'Desconocido';

-- 2) RPC de filtros (distinct en servidor) ---------------------------------
-- `periodo` se trata con left(periodo::text,4) para soportar tanto integer como date.
create or replace function public.get_filtros_globales(
  p_nombre_indicador text default null,
  p_pais text default null,
  p_anio int default null,
  p_sector text default null,
  p_tamano text default null
)
returns json
language sql
stable
security invoker
as $$
  with f as (
    select pais, provincia, sector, tamano_empresa, periodo
    from public.resultado_indicadores
    where (p_nombre_indicador is null or nombre_indicador = p_nombre_indicador)
      and (p_pais is null or pais = p_pais)
      and (p_anio is null or left(periodo::text, 4) = p_anio::text)
      and (p_sector is null or sector = p_sector)
      and (p_tamano is null or tamano_empresa = p_tamano)
  )
  select json_build_object(
    'paises', coalesce((select json_agg(x order by x) from (
        select distinct pais x from f
        where pais is not null and btrim(pais) <> '' and lower(btrim(pais)) <> 'desconocido') s), '[]'::json),
    'provincias', coalesce((select json_agg(x order by x) from (
        select distinct provincia x from f where provincia is not null and btrim(provincia) <> '') s), '[]'::json),
    'sectores', coalesce((select json_agg(x order by x) from (
        select distinct sector x from f where sector is not null and btrim(sector) <> '') s), '[]'::json),
    'tamanos_empresa', coalesce((select json_agg(x order by x) from (
        select distinct tamano_empresa x from f where tamano_empresa is not null and btrim(tamano_empresa) <> '') s), '[]'::json),
    'anios', coalesce((select json_agg(y order by y desc) from (
        select distinct left(periodo::text, 4)::int y from f where periodo is not null) s), '[]'::json)
  );
$$;

grant execute on function public.get_filtros_globales(text, text, int, text, text) to anon, authenticated;
