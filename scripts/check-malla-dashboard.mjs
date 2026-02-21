/**
 * Comprueba que las tablas y relaciones necesarias para la malla del dashboard estén bien.
 * Uso: node scripts/check-malla-dashboard.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const issues = [];
  const ok = [];

  // 1) dimensiones
  const { count: nDim, error: eDim } = await supabase.from('dimensiones').select('*', { count: 'exact', head: true });
  if (eDim) issues.push(`dimensiones: ${eDim.message}`);
  else if ((nDim ?? 0) < 7) issues.push(`dimensiones: hay ${nDim ?? 0}, se esperan 7`);
  else ok.push(`dimensiones: ${nDim} filas`);

  // 2) subdimensiones con nombre_dimension
  const { data: subData, error: eSub } = await supabase.from('subdimensiones').select('nombre, nombre_dimension');
  if (eSub) issues.push(`subdimensiones: ${eSub.message}`);
  else {
    const conNombreDim = (subData || []).filter((r) => r.nombre_dimension != null && r.nombre_dimension !== '').length;
    ok.push(`subdimensiones: ${subData?.length ?? 0} filas, ${conNombreDim} con nombre_dimension`);
    if (conNombreDim === 0) issues.push('subdimensiones: ninguna tiene nombre_dimension (el radar filtra por dimensión)');
  }

  // 3) definicion_indicadores (vista o tabla) con nombre_subdimension
  let nInd = 0;
  let conSub = 0;
  const { data: indData, error: eInd } = await supabase.from('definicion_indicadores').select('nombre, nombre_subdimension');
  if (eInd) {
    issues.push(`definicion_indicadores: ${eInd.message} (¿existe la vista o tabla?)`);
  } else {
    nInd = indData?.length ?? 0;
    conSub = (indData || []).filter((r) => r.nombre_subdimension != null && r.nombre_subdimension !== '').length;
    ok.push(`definicion_indicadores: ${nInd} filas, ${conSub} con nombre_subdimension`);
    if (conSub === 0 && nInd > 0) issues.push('definicion_indicadores: ningún indicador tiene nombre_subdimension');
  }

  // 4) resultado_indicadores: con nombre_indicador y datos Valencia/2024
  const { count: nRes, error: eRes } = await supabase.from('resultado_indicadores').select('*', { count: 'exact', head: true });
  if (eRes) issues.push(`resultado_indicadores: ${eRes.message}`);
  else ok.push(`resultado_indicadores: ${nRes ?? 0} filas total`);

  const { count: nConNombre, error: eConNombre } = await supabase
    .from('resultado_indicadores')
    .select('*', { count: 'exact', head: true })
    .not('nombre_indicador', 'is', null)
    .neq('nombre_indicador', '');
  if (!eConNombre) {
    ok.push(`resultado_indicadores con nombre_indicador relleno: ${nConNombre ?? 0}`);
    if ((nConNombre ?? 0) === 0) issues.push('resultado_indicadores: ningún registro tiene nombre_indicador (radar saldrá a 0; ejecuta backfill)');
  }

  const { count: nValencia, error: eVal } = await supabase
    .from('resultado_indicadores')
    .select('*', { count: 'exact', head: true })
    .in('pais', ['Valencia', 'Comunitat Valenciana'])
    .eq('periodo', 2024);
  if (!eVal) {
    ok.push(`resultado_indicadores Valencia 2024: ${nValencia ?? 0} filas`);
    if ((nValencia ?? 0) === 0) issues.push('resultado_indicadores: no hay filas para pais Valencia/Comunitat Valenciana y periodo 2024');
  }

  console.log('--- Comprobación malla dashboard ---\n');
  ok.forEach((l) => console.log('✓', l));
  if (issues.length) {
    console.log('\n⚠ Problemas:\n');
    issues.forEach((l) => console.log('  -', l));
    console.log('\nRevisa docs/RELACIONES_MALLA_DASHBOARD.md y docs/CHECKLIST_BD_FRONTEND.md');
    process.exit(1);
  }
  console.log('\n✓ Relaciones OK para la malla del dashboard.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
