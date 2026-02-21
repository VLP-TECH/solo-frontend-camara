/**
 * Sube el CSV subdimensiones.csv a Supabase (tabla public.subdimensiones).
 * Rellena nombre_dimension consultando la tabla dimensiones.
 *
 * Uso:
 *   node scripts/upload-subdimensiones.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 50;

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 4) return null;
  const id = parseInt(parts[0].trim(), 10);
  const nombre = (parts[1] ?? '').trim();
  const peso = parseInt(parts[2].trim(), 10) || 0;
  const id_dimension = parseInt(parts[3].trim(), 10);
  if (Number.isNaN(id) || !nombre || Number.isNaN(id_dimension)) return null;
  return { id, nombre, peso, id_dimension };
}

async function main() {
  const defaultInProject = resolve(__dirname, 'data', 'subdimensiones.csv');
  const defaultDownloads = resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'subdimensiones.csv');
  const csvPath = process.argv[2] ?? (existsSync(defaultInProject) ? defaultInProject : defaultDownloads);
  console.log('Leyendo CSV:', csvPath);

  if (!existsSync(csvPath)) {
    console.error('No se encuentra el CSV. Usa: node scripts/upload-subdimensiones.mjs <ruta/al/subdimensiones.csv>');
    console.error('O coloca subdimensiones.csv en scripts/data/ o en ~/Downloads');
    process.exit(1);
  }
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV vacío o sin filas de datos.');
    process.exit(1);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row) rows.push(row);
  }

  console.log('Filas a subir:', rows.length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Mapa fallback por si dimensiones no tiene id (solo nombre/peso)
  const dimMapFallback = new Map([
    [1, 'Apoyo al emprendimiento e innovación'],
    [2, 'Capital humano'],
    [3, 'Ecosistema y colaboración'],
    [4, 'Infraestructura digital'],
    [5, 'Servicios públicos digitales'],
    [6, 'Sostenibilidad digital'],
    [7, 'Transformación digital empresarial'],
  ]);

  let dimMap = dimMapFallback;
  const { data: dimensiones, error: errDim } = await supabase.from('dimensiones').select('*');
  if (!errDim && dimensiones && dimensiones.length > 0) {
    const first = dimensiones[0];
    const idKey = 'id' in first ? 'id' : 'id_dimension' in first ? 'id_dimension' : null;
    if (idKey && 'nombre' in first) {
      dimMap = new Map(dimensiones.map((d) => [d[idKey], d.nombre]));
    }
  }

  for (const row of rows) {
    row.nombre_dimension = dimMap.get(row.id_dimension) ?? null;
  }

  const rowsWithId = rows.map((r) => ({ ...r }));
  const rowsWithoutId = rows.map(({ id, ...rest }) => rest);

  let useUpsert = true;
  const { error: probeError } = await supabase.from('subdimensiones').select('id').limit(1);
  if (probeError && (probeError.message.includes("'id'") || probeError.message.includes('schema cache'))) {
    useUpsert = false;
    console.log('Tabla sin columna id: insertando solo nombre, peso, id_dimension, nombre_dimension.');
  }
  const payloads = useUpsert ? rowsWithId : rowsWithoutId;

  let ok = 0;
  let err = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { error } = useUpsert
      ? await supabase.from('subdimensiones').upsert(batch, { onConflict: 'id' })
      : await supabase.from('subdimensiones').insert(batch);
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
