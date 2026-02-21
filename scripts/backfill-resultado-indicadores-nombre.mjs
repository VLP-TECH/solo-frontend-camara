/**
 * Rellena nombre_indicador en resultado_indicadores.
 * Prueba dos cadenas:
 * 1) componentes_resultados → componentes_indicadores → definiciones_indicadores
 * 2) Si no hay mapeo: resultados_fuente_crudo → datos_crudos.id_indicador → definiciones_indicadores
 *
 * Uso: node scripts/backfill-resultado-indicadores-nombre.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 100;

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Cargando definiciones_indicadores...');
  const { data: di, error: errDi } = await supabase.from('definiciones_indicadores').select('id, nombre');
  if (errDi) {
    console.error('Error definiciones_indicadores:', errDi.message);
    process.exit(1);
  }
  const nombreById = new Map((di || []).map((row) => [row.id, row.nombre]));

  let resultadoIdToNombre = new Map();

  // Camino 1: componentes_resultados → componentes_indicadores → definiciones_indicadores
  const { data: cr } = await supabase.from('componentes_resultados').select('id_resultado, id_componente');
  const { data: ci } = await supabase.from('componentes_indicadores').select('id, id_indicador');
  const ciById = new Map((ci || []).map((row) => [row.id, row.id_indicador]));
  if (cr?.length) {
    for (const row of cr) {
      const idIndicador = ciById.get(row.id_componente);
      if (idIndicador == null) continue;
      const nombre = nombreById.get(idIndicador);
      if (!nombre) continue;
      resultadoIdToNombre.set(row.id_resultado, nombre);
    }
    console.log('Mapeo (componentes):', resultadoIdToNombre.size, 'entradas');
  }

  // Camino 2 si el primero está vacío: resultados_fuente_crudo → datos_crudos.id_indicador → definiciones_indicadores
  if (resultadoIdToNombre.size === 0) {
    console.log('Probando resultados_fuente_crudo → datos_crudos...');
    const { data: rfc, error: errRfc } = await supabase.from('resultados_fuente_crudo').select('id_resultado, id_dato_crudo');
    if (errRfc) {
      console.error('Error resultados_fuente_crudo:', errRfc.message);
      process.exit(1);
    }
    console.log('  resultados_fuente_crudo:', rfc?.length ?? 0, 'filas');
    if (rfc?.length) {
      const { data: dc, error: errDc } = await supabase.from('datos_crudos').select('id, id_indicador');
      if (errDc) {
        console.error('  Error datos_crudos:', errDc.message);
      } else {
        const conIndicador = (dc || []).filter((r) => r.id_indicador != null);
        console.log('  datos_crudos:', dc?.length ?? 0, 'filas, con id_indicador:', conIndicador.length);
        const idIndicadorByDatoId = new Map((dc || []).map((row) => [row.id, row.id_indicador]));
        for (const row of rfc) {
          const idIndicador = idIndicadorByDatoId.get(row.id_dato_crudo);
          if (idIndicador == null) continue;
          const nombre = nombreById.get(idIndicador);
          if (!nombre) continue;
          resultadoIdToNombre.set(row.id_resultado, nombre);
        }
        console.log('  Mapeo (resultados_fuente_crudo + datos_crudos):', resultadoIdToNombre.size, 'entradas');
      }
    }
  }

  if (resultadoIdToNombre.size === 0) {
    console.log('No hay mapeo posible. Carga componentes_resultados + componentes_indicadores, o revisa resultados_fuente_crudo y datos_crudos (id_indicador).');
    return;
  }

  let from = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const maxRows = 50000;

  while (from < maxRows) {
    const { data: rows, error } = await supabase
      .from('resultado_indicadores')
      .select('id, nombre_indicador')
      .order('id', { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (error) {
      console.error('Error leyendo resultado_indicadores:', error.message);
      break;
    }
    if (!rows?.length) break;

    const needsFill = (r) => (r.nombre_indicador == null || r.nombre_indicador === '') && resultadoIdToNombre.has(r.id);
    const toUpdate = rows.filter(needsFill);
    for (let i = 0; i < toUpdate.length; i += 50) {
      const batch = toUpdate.slice(i, i + 50);
      const promises = batch.map((r) =>
        supabase.from('resultado_indicadores').update({ nombre_indicador: resultadoIdToNombre.get(r.id) }).eq('id', r.id)
      );
      const results = await Promise.all(promises);
      const ok = results.filter((r) => !r.error).length;
      totalUpdated += ok;
      if (results.some((r) => r.error)) {
        results.filter((r) => r.error).forEach((r) => console.error('Update error:', r.error?.message));
      }
    }
    totalSkipped += rows.length - toUpdate.length;
    from += rows.length;
    if (from % 1000 === 0 || rows.length < BATCH_SIZE) console.log('Procesadas', from, 'filas, actualizadas', totalUpdated);
    if (rows.length < BATCH_SIZE) break;
  }

  console.log('Listo. Filas actualizadas:', totalUpdated, '(sin mapeo:', totalSkipped, ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
