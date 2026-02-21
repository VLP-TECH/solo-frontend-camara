/**
 * Sube el CSV definiciones_indicadores.csv a Supabase (tabla public.definiciones_indicadores).
 *
 * Uso:
 *   node scripts/upload-definiciones-indicadores.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 50;
const MAX_LEN = parseInt(process.env.DEFINICIONES_MAX_VARCHAR, 10) || 200;

function trunc(s, len = MAX_LEN) {
  if (s == null || s === '') return null;
  const t = String(s).trim();
  return t.length > len ? t.slice(0, len) : t;
}

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 7) return null;
  const n = parts.length;
  const id = parseInt(parts[0].trim(), 10);
  const nombre = n === 7 ? parts[1].trim() : parts.slice(1, n - 5).join(',').trim();
  const id_subdimension = (parts[n - 5] ?? '').trim();
  const origen_indicador = (parts[n - 4] ?? '').trim() || null;
  const formula = (parts[n - 3] ?? '').trim();
  const importancia = (parts[n - 2] ?? '').trim();
  const fuente = (parts[n - 1] ?? '').trim() || null;
  if (Number.isNaN(id) || !nombre || !formula || !importancia) return null;
  const numSub = id_subdimension === '' ? null : parseInt(id_subdimension, 10);
  return {
    id,
    nombre: trunc(nombre, 100),
    id_subdimension: Number.isNaN(numSub) ? null : numSub,
    origen_indicador: trunc(origen_indicador, 50),
    formula: trunc(formula, 20),
    importancia: trunc(importancia, 10),
    fuente: trunc(fuente, 200),
  };
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'definiciones_indicadores.csv');
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
    const { error } = await supabase.from('definiciones_indicadores').upsert(batch, { onConflict: 'id' });
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
