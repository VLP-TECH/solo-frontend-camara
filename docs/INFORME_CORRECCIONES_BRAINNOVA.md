# Informe de correcciones — Plataforma BRAINNOVA (Cámara Valencia)

**Fecha:** 2026-06-25
**Ámbito:** Frontend `solo-frontend-camara`, base de datos Supabase `nfhfwiveuzdnntsmwfib` (brainnova-prod) y backend de ingesta/score.

---

## 1. Resumen ejecutivo

Se revisaron los "números raros" e indicadores vacíos reportados en el dashboard
(`/dashboard` y `/kpis`). El diagnóstico concluyó que **la mayoría de los
síntomas no venían de fallos de cálculo, sino del estado de los datos** (cargas
con codificación corrupta, duplicados, indicadores sin propagar, valores
absolutos mal etiquetados y un periodo 2026 anómalo). Se corrigieron tanto los
**datos en producción** como varios **bugs reales del frontend**, y se alineó la
metodología de cálculo.

**Metodología confirmada con el cliente (2026-06-25):** la normalización canónica
es **Min-Max** `((valor − mín) / (máx − mín)) × 100`; el frontend
(`dashboard-snapshot.ts`) es la fuente de verdad. El backend se alineó a la misma
fórmula (pendiente de aplicar por su equipo).

---

## 2. Correcciones de DATOS (en producción, ya visibles)

| # | Acción | Detalle |
|---|--------|---------|
| 1 | Codificación corregida en `datos_crudos` | 1.274 filas: "Espa�a"→"España", "A Coru�a"→"A Coruña", "2M�"→"2M€", nombres de indicador, etc. |
| 2 | `id_indicador` rellenado | 455 filas que estaban a NULL por el nombre corrupto (impedía que el ETL las viera). |
| 3 | Deduplicado de conflictos | Se eliminaron 1.969 filas duplicadas con valores en conflicto (regla acordada: **última carga gana**). |
| 4 | Reingesta de `resultado_indicadores` | Regenerado con el pipeline oficial del backend (proceso validado como determinista). |
| 5 | Densidad 2026 (web/redes) recalculada | Valores ×100 corruptos (8624, 882…) recalculados desde numerador/denominador. |
| 6 | Periodo 2026 eliminado | Año anómalo (incompleto, sin comparación UE) que descolocaba la comparativa. Web/redes vuelven a 2023. |
| 7 | **Retirada de 5 indicadores incorrectos** | Ver sección 4. |

---

## 3. Correcciones de CÓDIGO (en GitHub `main`, **pendientes de redeploy en EasyPanel**)

| Commit | Cambio | Efecto |
|--------|--------|--------|
| `2be90d3` | Paginar carga de `resultado_indicadores` | Corrige el truncado silencioso a 1000 filas (años con >1000 filas falseaban min/max). |
| `3899aba` | Territorios valencianos por `provincia` | Valencia/Alicante/Castellón se guardan como `pais='España'`+`provincia='…'`; antes no se mostraban. |
| `2b71a7f` | Columna "%" de /kpis = Min-Max real | Antes usaba `min(100, valor)`, que clampaba a 100% cualquier indicador absoluto. |
| `7b67606` | "Último Valor" usa España | Antes tomaba la 1ª fila de un país cualquiera (p. ej. Uso de Internet mostraba 21,01 de Chequia en vez de 11,37 de España). |
| `ff525c7` | Unidad en la columna España | Muestra "493.921.730 EUR", "1.363 Nº de Empresas", "61,9 % Empresas"… para distinguir absolutos de porcentajes. |
| `ae841b9` | Comunitat Valenciana agregada de provincias | Las tarjetas "Dimensión más fuerte/débil en CV" se reconstruyen como media de Valencia/Alicante/Castellón. |

> **Backend** (`services.py`): se alineó la normalización a Min-Max. Como el repo
> del backend pertenece a otro equipo, el cambio se entregó como **parche**
> (`/tmp/backend-score-min-max.patch`) para que lo apliquen ellos.

---

## 4. Datos retirados por incorrectos ("Latency - Datapoints")

A petición del cliente, se retiraron de Supabase 5 indicadores cuyos datapoints
eran incorrectos (valores absolutos mal etiquetados como %, valores imposibles
como 1698% o cifras de escala errónea como 2,9·10¹⁶ €):

| id | Indicador | Filas eliminadas (crudos / resultado) |
|----|-----------|----------------------------------------|
| 23 | Crecimiento del empleo en sectores tecnológicos | 520 / 260 |
| 29 | Densidad de empresas proveedoras TIC y digitales | 312 / 52 |
| 30 | Contribución económica del sector TIC | 4 / 0 |
| 69 | Número de empresas que realizan I+D en el sector TIC | 9 / 4 |
| 76 | Inversión total en redes del sector de las comunicaciones electrónicas | 8 / 4 |

**Consecuencias (correctas y esperadas):**
- Estos 5 indicadores quedan vacíos hasta que el cliente envíe datos válidos.
- Desaparecen los "100%" espurios que inflaban dimensiones: Transformación
  digital pasa de 84→71 y Capital humano de 73→62 (cifras más realistas).
- **Las tarjetas de Comunitat Valenciana vuelven a "Sin datos"**: los únicos
  indicadores con desglose provincial valenciano eran "Crecimiento del empleo" y
  "Densidad TIC", precisamente los retirados. No queda dato valenciano válido en
  el sistema. El código de agregación CV es correcto y funcionará en cuanto
  entren datos provinciales buenos.

---

## 5. Pendiente del lado del CLIENTE (datos)

1. **Datos UE para indicadores solo-España.** Varios indicadores absolutos
   (empleo, inversión, nº de empresas) solo traen valor de España. Min-Max sin
   otros países da 100 por definición. Se necesitan los valores europeos para
   normalizar de forma significativa.
2. **Reenvío corregido de los 5 indicadores retirados**, si se quieren mostrar:
   con valores reales, en la unidad correcta (% o ratio donde corresponda) y, a
   ser posible, con comparación europea.
3. **Datos provinciales valencianos válidos** (Valencia/Alicante/Castellón) para
   poblar el índice de la Comunitat Valenciana.
4. **Revisar `Contribución económica del sector TIC`**: el dato de origen tenía
   un valor imposible (2,9·10¹⁶ €). Debe enviarse como ratio TIC/PIB.

---

## 6. Pendiente TÉCNICO

1. **Redeploy del frontend en EasyPanel** (servicio frontend → Deploy desde
   `main`). Sin esto, los 6 arreglos de código de la sección 3 no se ven en
   producción. (Los cambios de datos sí están vivos sin redeploy.)
2. **Backend:** aplicar el parche Min-Max en `services.py` y añadir un blindaje
   en la ingesta: **rechazar valores >100 en indicadores `PORCENTAJE`** (y/o
   cambiar la regla de dedup de "última carga gana" a "valor válido gana"), para
   que una carga corrupta no vuelva a colarse.

---

## 7. Notas de calidad de datos detectadas (para futuras cargas)

- Las cargas de CSV deben venir en **UTF-8** (se detectó mojibake por latin-1).
- Cada celda conceptual (indicador × país × año × provincia × sector × tamaño)
  debe tener **un único valor**; se hallaron ~1.000 celdas con valores en
  conflicto por cargas apiladas.
- No usar periodos futuros/incompletos (p. ej. 2026) salvo que se carguen
  completos y con comparación UE.
- Distinguir claramente **indicadores de porcentaje** de **indicadores de valor
  absoluto** (€, nº de empresas, suscripciones), e indicar la unidad correcta en
  `unidad_display`.

---

*Backups de datos previos a las correcciones: `backup-supabase-20260625-full/`
(volcado completo vía service_role).*
