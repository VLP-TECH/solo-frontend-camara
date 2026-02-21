# Relaciones para que la malla del dashboard funcione

## Cadena de datos del radar (malla)

```
dimensiones (7 filas)
    ↓ nombre
subdimensiones.nombre_dimension  ← debe coincidir (normalizado) con dimensiones.nombre
    ↓ nombre
definicion_indicadores.nombre_subdimension  ← debe coincidir con subdimensiones.nombre
    ↓ nombre
resultado_indicadores.nombre_indicador  ← debe ser = definicion_indicadores.nombre
    + pais (Valencia / Comunitat Valenciana / Alicante / Castellón)
    + periodo (año, ej. 2024)
    + valor_calculado
```

## Comprobaciones obligatorias

| # | Comprobación | Tabla / relación |
|---|----------------|------------------|
| 1 | Hay 7 dimensiones con `nombre` y `peso` | **dimensiones** |
| 2 | Hay subdimensiones con `nombre_dimension` = uno de los 7 nombres de dimensiones | **subdimensiones** |
| 3 | Cada subdimensión tiene `nombre` único (ej. "Digitalización básica", "E-commerce") | **subdimensiones** |
| 4 | Los indicadores tienen `nombre_subdimension` = uno de los nombres de subdimensiones | **definicion_indicadores** (o vista sobre definiciones_indicadores) |
| 5 | Cada indicador tiene `nombre` (ej. "Empresas que usan IA") | **definicion_indicadores** |
| 6 | En resultado_indicadores hay filas con `nombre_indicador` = ese mismo `nombre` del indicador | **resultado_indicadores** |
| 7 | Esas filas tienen `pais` = "Valencia" o "Comunitat Valenciana" (o Alicante/Castellón) y `periodo` = año seleccionado | **resultado_indicadores** |

## Resumen: qué debe estar bien relacionado

- **dimensiones ↔ subdimensiones:** por **nombre**: `subdimensiones.nombre_dimension` = `dimensiones.nombre` (el frontend normaliza mayúsculas/espacios).
- **subdimensiones ↔ indicadores:** por **nombre**: `definicion_indicadores.nombre_subdimension` = `subdimensiones.nombre`.
- **indicadores ↔ resultados:** por **nombre**: `resultado_indicadores.nombre_indicador` = `definicion_indicadores.nombre`.

Si en **resultado_indicadores** todo tiene `nombre_indicador` vacío, el radar sale a 0. Hay que rellenarlo con el script de backfill (componentes o resultados_fuente_crudo + datos_crudos).

## Cómo verificar en Supabase (SQL)

```sql
-- 1) Dimensiones
SELECT COUNT(*) AS n_dimensiones FROM dimensiones;

-- 2) Subdimensiones con nombre_dimension relleno
SELECT COUNT(*) AS n_subdimensiones, COUNT(nombre_dimension) AS con_nombre_dimension FROM subdimensiones;

-- 3) Indicadores con nombre_subdimension (vista o tabla definicion_indicadores)
SELECT COUNT(*) AS n_indicadores, COUNT(nombre_subdimension) AS con_subdimension FROM definicion_indicadores;

-- 4) Resultados con nombre_indicador relleno y datos para Valencia/periodo
SELECT COUNT(*) AS total_resultados,
       COUNT(CASE WHEN nombre_indicador IS NOT NULL AND nombre_indicador != '' THEN 1 END) AS con_nombre_indicador,
       COUNT(CASE WHEN pais IN ('Valencia','Comunitat Valenciana') AND periodo = 2024 THEN 1 END) AS valencia_2024
FROM resultado_indicadores;
```

Si `con_nombre_indicador` es 0 o `valencia_2024` es 0, el radar no tendrá datos hasta que rellenes `nombre_indicador` y/o tengas filas para ese territorio y año.

---

## Por qué una subdimensión sale a 0 (ej. “Interacción digital con la administración”)

El score de una subdimensión se calcula a partir de los **indicadores** asignados a ella y de los **resultados** en `resultado_indicadores` para el territorio y año elegidos. Puede salir 0 por:

1. **Ningún indicador asignado a la subdimensión**  
   En `definicion_indicadores` (o en la vista que usa `definiciones_indicadores` + `subdimensiones`) el campo `nombre_subdimension` debe coincidir con el `nombre` de la subdimensión (ej. `"Interacción digital con la administración"`). Si no hay filas con ese `nombre_subdimension`, la subdimensión tendrá 0 indicadores y score 0.

2. **Indicadores sin datos para ese territorio/año**  
   Aunque haya indicadores asignados, si en `resultado_indicadores` no hay filas con ese `nombre_indicador`, el `pais` (o variante) y el `periodo` seleccionados, el score será 0.

**Cómo comprobarlo en Supabase:**

```sql
-- Indicadores de la subdimensión "Interacción digital con la administración"
SELECT id, nombre, nombre_subdimension
FROM definicion_indicadores
WHERE nombre_subdimension ILIKE '%interacción%administración%'
   OR nombre_subdimension ILIKE '%Interacción digital con la administración%';

-- Si hay indicadores, comprobar si hay resultados para un territorio/año
SELECT nombre_indicador, pais, periodo, COUNT(*)
FROM resultado_indicadores
WHERE nombre_indicador IN (SELECT nombre FROM definicion_indicadores WHERE nombre_subdimension = 'Interacción digital con la administración')
  AND pais = 'España' AND periodo = 2023
GROUP BY nombre_indicador, pais, periodo;
```

Si la primera consulta no devuelve filas, hay que asignar indicadores a esa subdimensión en `definiciones_indicadores` (campo `id_subdimension` = id de la subdimensión “Interacción digital con la administración”). Si la segunda no devuelve filas, hace falta cargar datos en `resultado_indicadores` para esos indicadores, territorio y año.
