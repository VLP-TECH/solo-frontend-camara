/**
 * Sube el CSV valores_referencia.csv a Supabase (tabla public.valores_referencia).
 *
 * Uso:
 *   node scripts/upload-valores-referencia.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 50;

function parseNum(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).trim());
  return Number.isNaN(n) ? null : n;
}

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 6) return null;
  const id = parseInt(parts[0].trim(), 10);
  const id_indicador = parseInt(parts[1].trim(), 10);
  const periodo = parseInt(parts[2].trim(), 10);
  const valor_min_global = parseNum(parts[3]);
  const valor_media_eu = parseNum(parts[4]);
  const valor_top_eu = parseNum(parts[5]);
  if (Number.isNaN(id) || Number.isNaN(id_indicador) || Number.isNaN(periodo)) return null;
  return {
    id,
    id_indicador,
    periodo,
    valor_min_global,
    valor_media_eu,
    valor_top_eu,
  };
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'valores_referencia.csv');
  console.log('Leyendo CSV:', csvPath);

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
    const { error } = await supabase.from('valores_referencia').upsert(batch, { onConflict: 'id' });
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
