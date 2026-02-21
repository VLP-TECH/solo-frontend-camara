/**
 * Sube el CSV resultado_fuentes_asociacion.csv a Supabase (tabla public.resultado_fuentes_asociacion).
 * Columnas: resultado_id, dato_crudo_id, dato_macro_id (id se genera en la tabla).
 *
 * Uso:
 *   node scripts/upload-resultado-fuentes-asociacion.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;

function parseIntOrNull(s) {
  if (s == null || String(s).trim() === '') return null;
  const n = parseInt(String(s).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function parseRow(line) {
  const parts = line.split(',').map((p) => p.trim());
  if (parts.length < 1) return null;
  const resultado_id = parseIntOrNull(parts[0]);
  if (resultado_id == null) return null;
  return {
    resultado_id,
    dato_crudo_id: parts.length > 1 ? parseIntOrNull(parts[1]) : null,
    dato_macro_id: parts.length > 2 ? parseIntOrNull(parts[2]) : null,
  };
}

async function main() {
  const defaultInProject = resolve(__dirname, 'data', 'resultado_fuentes_asociacion.csv');
  const defaultDownloads = resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'resultado_fuentes_asociacion.csv');
  const csvPath = process.argv[2] ?? (existsSync(defaultInProject) ? defaultInProject : defaultDownloads);
  console.log('Leyendo CSV:', csvPath);

  if (!existsSync(csvPath)) {
    console.error('No se encuentra el CSV. Usa: node scripts/upload-resultado-fuentes-asociacion.mjs <ruta/al/archivo.csv>');
    process.exit(1);
  }

  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.log('CSV solo con cabecera o vacío; no hay filas que subir.');
    return;
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row) rows.push(row);
  }

  console.log('Filas a subir:', rows.length);
  if (rows.length === 0) return;

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('resultado_fuentes_asociacion').insert(batch);
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
