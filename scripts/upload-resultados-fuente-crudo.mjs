/**
 * Sube el CSV resultados_fuente_crudo.csv a Supabase (tabla public.resultados_fuente_crudo).
 *
 * Uso:
 *   node scripts/upload-resultados-fuente-crudo.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;

function parseRow(line) {
  const parts = line.split(',').map((p) => p.trim());
  if (parts.length < 2) return null;
  const id_resultado = parseInt(parts[0], 10);
  const id_dato_crudo = parseInt(parts[1], 10);
  if (Number.isNaN(id_resultado) || Number.isNaN(id_dato_crudo)) return null;
  return { id_resultado, id_dato_crudo };
}

async function main() {
  const defaultInProject = resolve(__dirname, 'data', 'resultados_fuente_crudo.csv');
  const defaultDownloads = resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'resultados_fuente_crudo.csv');
  const csvPath = process.argv[2] ?? (existsSync(defaultInProject) ? defaultInProject : defaultDownloads);
  console.log('Leyendo CSV:', csvPath);

  if (!existsSync(csvPath)) {
    console.error('No se encuentra el CSV. Usa: node scripts/upload-resultados-fuente-crudo.mjs <ruta/al/archivo.csv>');
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

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('resultados_fuente_crudo')
      .upsert(batch, { onConflict: 'id_resultado,id_dato_crudo' });
    if (error) {
      console.error('Error en lote', Math.floor(i / BATCH_SIZE) + 1, error.message);
      err += batch.length;
    } else {
      ok += batch.length;
      if (ok % 5000 === 0 || ok === rows.length) console.log('Subidas', ok, '/', rows.length);
    }
  }

  console.log('Listo. OK:', ok, 'Errores:', err);
  if (err > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
