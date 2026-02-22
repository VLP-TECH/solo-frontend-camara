# Checklist: Base de datos ↔ /dimensiones y /dashboard

## Tablas que usa el frontend en /dimensiones y /dashboard

| Tabla | Uso | Columnas clave |
|-------|-----|----------------|
| **dimensiones** | Listado de 7 dimensiones BRAINNOVA, pesos | `nombre`, `peso` (opcional: `id`) |
| **subdimensiones** | Agrupación por dimensión, scores en radar | `nombre`, `nombre_dimension`, `peso` (opcional: `id`, `id_dimension`) |
| **definicion_indicadores** | Listado de indicadores y subdimensión | `nombre`, `nombre_subdimension`, `importancia`, `formula`, `fuente`, `origen_indicador` (opcional: `activo`) |
| **resultado_indicadores** | Valores calculados, filtros por territorio/año | `nombre_indicador`, `valor_calculado`, `periodo`, `pais`, `provincia` |

- El frontend consulta la tabla **definicion_indicadores** (singular). Si en Supabase solo tienes **definiciones_indicadores**, ejecuta la migración que crea la **vista** `definicion_indicadores` (`20250221340000_view_definicion_indicadores_from_definiciones.sql`) para que /dimensiones y /dashboard lean los indicadores con `nombre_subdimension` rellenado desde `subdimensiones`.

## Orden recomendado de datos

1. **dimensiones** – 7 filas (seed o CSV).
2. **subdimensiones** – 19 filas; deben tener `nombre_dimension` para que el filtro por dimensión funcione (el script de subida lo rellena desde `dimensiones` si existe `id_dimension`).
3. **definiciones_indicadores** (o tabla `definicion_indicadores`) – ~86 filas; si usas la vista, debe existir `definiciones_indicadores` con `id_subdimension` coherente con `subdimensiones.id`.
4. **resultado_indicadores** – con `nombre_indicador` y `periodo` rellenados para que aparezcan KPIs y radar.

## Qué comprobar en /dashboard

- **Radar**: Si el backend (Brainnova) no está disponible, se usa fallback con `getSubdimensionesConScores` (Supabase). Para que salgan scores hace falta:
  - `dimensiones` y `subdimensiones` con `nombre_dimension` correcto.
  - `definicion_indicadores` (o vista) con `nombre_subdimension` que coincida con `subdimensiones.nombre`.
  - `resultado_indicadores` con filas donde `nombre_indicador` = nombre del indicador, `pais`/`provincia` y `periodo` según filtros.
- **Filtros provincia/año**: Se rellenan con `getFiltrosGlobales()` (API) o listas por defecto. La “primera provincia/periodo disponible” viene de `resultado_indicadores` (`getFirstAvailableProvinciaPeriodo`), así que debe haber al menos una fila con `pais` tipo "Valencia"/"Alicante"/"Castellón" o "Comunitat Valenciana".

## Qué comprobar en /dimensiones

- **Listado de dimensiones**: Sale de `getDimensiones()` → tabla `dimensiones` (`nombre`, `peso`).
- **Scores por dimensión**: `getDimensionScore()` → `getSubdimensionesConScores()` → mismos requisitos que el radar (subdimensiones, indicadores, resultado_indicadores).
- **Indicadores por dimensión**: `getIndicadoresConDatos()` → lee `definicion_indicadores` y `resultado_indicadores`, y asocia subdimensión → dimensión vía `subdimensiones.nombre_dimension`. Si `nombre_subdimension` en indicadores no coincide con `subdimensiones.nombre` (por normalización), algunos indicadores pueden no asignarse a ninguna dimensión.

## Radar o scores a cero

**Causa habitual:** En `resultado_indicadores` el CSV no traía `nombre_indicador`, así que se cargó como `''`. El frontend filtra por `nombre_indicador` = nombre del indicador, por eso no encuentra filas y todo sale a 0.

**Solución:** Rellenar `nombre_indicador` desde la cadena resultado → componente → indicador. Ejecuta en el SQL Editor la migración **`20250221350000_backfill_resultado_indicadores_nombre_indicador.sql`**. Ese UPDATE usa `componentes_resultados` y `componentes_indicadores` + `definiciones_indicadores` para asignar el nombre del indicador a cada fila. Necesitas tener esas tablas cargadas (CSV componentes-resultados y componentes-indicadores).

**Territorio:** El dashboard filtra por `pais` = "Valencia", "Alicante", "Castellón" o "Comunitat Valenciana". Si en `resultado_indicadores` solo tienes `pais` = "España" u otros países, no habrá datos para Valencia.

## Errores frecuentes

- **“No se encontró dimensión para subdimensión”**: Revisar que `subdimensiones.nombre_dimension` coincida (normalizado) con los `nombre` de `dimensiones`, y que en `definicion_indicadores` el campo `nombre_subdimension` coincida con `subdimensiones.nombre`.
- **Radar o scores en 0**: Comprobar que existan filas en `resultado_indicadores` para el `nombre_indicador`, `pais`/`provincia` y `periodo` que usa el filtro. Si todos los `nombre_indicador` están vacíos o no coinciden con los nombres de `definicion_indicadores`, no habrá datos.
- **Vista definicion_indicadores**: Si falla la creación de la vista (p. ej. no existe `subdimensiones.id`), crear antes la tabla `subdimensiones` con columna `id` (migración `20250221280000_create_subdimensiones_if_not_exists.sql`) y opcionalmente ejecutar el script de subida de subdimensiones.

## Migraciones relacionadas (orden sugerido)

1. `20250221180000_seed_dimensiones_from_csv.sql`
2. `20250221280000_create_subdimensiones_if_not_exists.sql`
3. `20250221260000_create_definiciones_indicadores_if_not_exists.sql`
4. `20250221340000_view_definicion_indicadores_from_definiciones.sql` (solo si no tienes tabla `definicion_indicadores`)
5. `20250221290000_create_resultado_indicadores_if_not_exists.sql` (+ `20250221300000_drop_resultado_indicadores_nombre_indicador_fkey.sql` si aplica)
6. **Después de cargar resultado_indicadores y componentes:** `20250221350000_backfill_resultado_indicadores_nombre_indicador.sql` (rellena `nombre_indicador` para que el radar y KPIs dejen de salir a 0).
7. **Opcional – Servicios Públicos Digitales (España/Valencia):** `20250221400000_seed_resultado_indicadores_servicios_publicos_espana_valencia.sql` inserta filas para el indicador "Personas Servicio Banca Electronica" en España y territorios valencianos si no existen (mismo pipeline que el resto; ver **Pipeline de datos** en `docs/RELACIONES_MALLA_DASHBOARD.md`).
8. **Opcional – Emprendimiento e Innovación (datos sintéticos):** `20250221410000_seed_resultado_indicadores_emprendimiento_innovacion_sintetico.sql` inserta datos sintéticos (valor_calculado en rango ~30–75) para todos los indicadores de la dimensión Emprendimiento e Innovación (subdimensiones 1–4) en España y territorios valencianos, periodo 2024, para desarrollo/demo.
9. **Opcional – Resto de dimensiones (datos sintéticos):** `20250221420000_seed_resultado_indicadores_sintetico_resto_dimensiones.sql` inserta datos sintéticos para indicadores de subdimensiones 5–19 (Capital Humano, Ecosistema, Infraestructura, Servicios Públicos, Sostenibilidad, Transformación Digital) en los mismos territorios y 2024, para que todas las dimensiones tengan datos de demo.

Luego ejecutar los scripts de subida de CSV en el mismo orden (dimensiones → subdimensiones → definiciones_indicadores → resultado_indicadores; y componentes_resultados, componentes_indicadores si los tienes). Por último, ejecutar el backfill de `nombre_indicador`. Para que todas las dimensiones (incl. Servicios Públicos Digitales) tengan datos para España/Valencia, incluir esos territorios en el CSV de resultado_indicadores o ejecutar la migración de seed anterior.

## Carga CSV "Latency - Datapoints"

Para cargar el archivo **20260220 Latency - Datapoints** (columnas: nombre_indicador, Periodo, valor_calculado, Pais, Provincia, Sector, Tamaño_empresa, fecha_calculo) en `resultado_indicadores`:

- **Comando:** `npm run upload-latency-datapoints` o `node scripts/upload-latency-datapoints.mjs [ruta/al/archivo.csv]`. Por defecto usa `~/Downloads/20260220 Latency - Datapoints.csv`.
- Si el archivo está en **XLSX**, exportar a CSV desde Excel (Guardar como → CSV UTF-8) y usar ese CSV.
- **Importante:** Para que esos indicadores aparezcan en la malla y en el radar del dashboard, los mismos nombres deben existir en **definiciones_indicadores** con `id_subdimension` asignado. Si no existen, las filas se insertan en `resultado_indicadores` pero no se asociarán a ninguna dimensión hasta que se den de alta en definiciones_indicadores.
