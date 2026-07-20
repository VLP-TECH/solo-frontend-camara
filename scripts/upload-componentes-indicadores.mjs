/**
 * Puebla public.componentes_indicadores en la instancia ACTUAL del frontend
 * (nfhfwiveuzdnntsmwfib) — el catálogo de componentes por indicador que usa la
 * página de Carga de datos para validar 'procesado' y 'descripcion_dato'.
 *
 * Modos:
 *   node scripts/upload-componentes-indicadores.mjs                  → migra el catálogo desde la instancia antigua (aoykpiievtadhwssugvs), reparando la codificación
 *   node scripts/upload-componentes-indicadores.mjs --con-observados → además añade los componentes observados en datos_crudos de la instancia actual
 *   node scripts/upload-componentes-indicadores.mjs ruta/al/csv      → sube desde CSV (id,id_indicador,descripcion_dato,fuente,rol)
 *   Añade --dry-run a cualquier modo para previsualizar sin escribir nada.
 *
 * Claves: por defecto usa la clave anon del frontend; exporta
 * SUPABASE_SERVICE_ROLE_KEY si la RLS bloquea la escritura.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Instancia ACTUAL (la que usa el frontend, src/integrations/supabase/client.ts)
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://nfhfwiveuzdnntsmwfib.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5maGZ3aXZldXpkbm50c213ZmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODgxOTYsImV4cCI6MjA5NjI2NDE5Nn0.635V7cld5MXmnw-NEbNso_TXt_K5zNr8DNJNoKRGMb4';

// Instancia ANTIGUA (origen de la migración del catálogo)
const OLD_URL = 'https://aoykpiievtadhwssugvs.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 100;

// ── Reparación de codificación ──────────────────────────────────────────────
// La instancia antigua almacenó los textos con bytes corruptos y la API los
// devuelve con U+FFFD (�). Se repara por diccionario (palabra exacta primero,
// sufijos frecuentes después). Si queda algún �, se avisa para revisión manual.
const WORD_FIXES = [
  ['N�', 'Nº'],
  ['a�os', 'años'], ['a�o', 'año'],
  ['b�sic', 'básic'],
  ['cl�ster', 'clúster'],
  ['cient�fic', 'científic'],
  ['p�blic', 'públic'],
  ['�ltim', 'últim'],
  ['m�vil', 'móvil'],
  ['t�cnic', 'técnic'],
  ['econ�mic', 'económic'],
];
const SUFFIX_FIXES = [
  ['ci�n', 'ción'], ['si�n', 'sión'], ['gi�n', 'gión'], ['xi�n', 'xión'],
  ['�gic', 'ógic'], ['�n', 'ón'],
];

function repairEncoding(s) {
  if (s == null) return null;
  let out = String(s);
  for (const [bad, good] of WORD_FIXES) out = out.replaceAll(bad, good);
  for (const [bad, good] of SUFFIX_FIXES) out = out.replaceAll(bad, good);
  return out;
}

// ── Fuentes de datos ────────────────────────────────────────────────────────
async function fetchOldCatalog() {
  const res = await fetch(
    `${OLD_URL}/rest/v1/componentes_indicadores?select=id,id_indicador,descripcion_dato,fuente,rol&order=id`,
    { headers: { apikey: OLD_KEY, Authorization: `Bearer ${OLD_KEY}` } },
  );
  if (!res.ok) throw new Error(`No se pudo leer el catálogo antiguo: HTTP ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({ ...r, descripcion_dato: repairEncoding(r.descripcion_dato) }));
}

/** Componentes realmente usados en datos_crudos de la instancia actual:
 *  distinct (id_indicador, descripcion_dato). rol = RESULTADO si aparece en
 *  filas procesado=TRUE (valor final), OBSERVADO si es un componente del cálculo. */
async function fetchObservedComponents() {
  const pageSize = 1000;
  const seen = new Map(); // "id|desc" → { id_indicador, descripcion_dato, esResultado }
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/datos_crudos?select=id_indicador,descripcion_dato,procesado&descripcion_dato=neq.&id_indicador=not.is.null`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Range: `${from}-${from + pageSize - 1}` } },
    );
    if (!res.ok) throw new Error(`No se pudo leer datos_crudos: HTTP ${res.status}`);
    const rows = await res.json();
    for (const r of rows) {
      const desc = (r.descripcion_dato ?? '').trim();
      if (!desc) continue;
      const key = `${r.id_indicador}|${desc}`;
      const prev = seen.get(key) ?? { id_indicador: r.id_indicador, descripcion_dato: desc, esResultado: false };
      if (r.procesado === true) prev.esResultado = true;
      seen.set(key, prev);
    }
    if (rows.length < pageSize) break;
  }
  return [...seen.values()];
}

function parseCsvRow(line) {
  const parts = line.split(',');
  if (parts.length < 5) return null;
  const id = parseInt(parts[0].trim(), 10);
  const id_indicador = parseInt(parts[1].trim(), 10);
  const descripcion_dato = parts.length === 5
    ? (parts[2] ?? '').trim() || null
    : parts.slice(2, -2).join(',').trim() || null;
  const fuente = (parts[parts.length - 2] ?? '').trim();
  const rol = (parts[parts.length - 1] ?? '').trim();
  if (Number.isNaN(id) || !rol) return null;
  if (fuente !== 'DATOS_CRUDOS' && fuente !== 'DATOS_MACRO') return null;
  return { id, id_indicador: Number.isNaN(id_indicador) ? null : id_indicador, descripcion_dato: descripcion_dato === 'nan' ? null : descripcion_dato, fuente, rol };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const conObservados = args.includes('--con-observados');
  const csvPath = args.find((a) => !a.startsWith('--'));

  let rows;
  if (csvPath) {
    console.log('Leyendo CSV:', resolve(csvPath));
    const lines = readFileSync(resolve(csvPath), 'utf-8').split(/\r?\n/).filter((l) => l.trim());
    rows = lines.slice(1).map(parseCsvRow).filter(Boolean);
  } else {
    console.log('Migrando catálogo desde la instancia antigua…');
    rows = await fetchOldCatalog();
    const rotos = rows.filter((r) => r.descripcion_dato?.includes('�'));
    if (rotos.length) {
      console.warn(`⚠️  ${rotos.length} descripciones siguen con caracteres rotos (revisar a mano):`);
      rotos.forEach((r) => console.warn(`   id=${r.id}: ${r.descripcion_dato}`));
    }
  }

  if (conObservados) {
    console.log('Añadiendo componentes observados en datos_crudos de la instancia actual…');
    const observed = await fetchObservedComponents();
    const known = new Set(rows.map((r) => `${r.id_indicador}|${r.descripcion_dato}`));
    let nextId = Math.max(1000, ...rows.map((r) => r.id + 1));
    for (const o of observed) {
      if (known.has(`${o.id_indicador}|${o.descripcion_dato}`)) continue;
      rows.push({
        id: nextId++,
        id_indicador: o.id_indicador,
        descripcion_dato: o.descripcion_dato,
        fuente: 'DATOS_CRUDOS',
        rol: o.esResultado ? 'RESULTADO' : 'OBSERVADO',
      });
    }
  }

  console.log(`\nFilas del catálogo (${rows.length}):`);
  for (const r of rows) {
    console.log(`  ${String(r.id).padStart(4)}  ind ${String(r.id_indicador).padStart(3)}  [${r.rol}] ${r.descripcion_dato ?? '(sin descripción)'}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no se ha escrito nada.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('componentes_indicadores').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Error en lote', Math.floor(i / BATCH_SIZE) + 1, error.message);
      err += batch.length;
    } else {
      ok += batch.length;
      console.log('Subidas', ok, '/', rows.length);
    }
  }
  console.log('Listo. OK:', ok, 'Errores:', err);
  if (err > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
