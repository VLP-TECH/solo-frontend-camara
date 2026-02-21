/**
 * Sube el CSV datos_crudos.csv a Supabase (tabla public.datos_crudos).
 *
 * Uso:
 *   node scripts/upload-datos-crudos.mjs [ruta/al/archivo.csv]
 *
 * Si no pasas ruta, usa: ~/Downloads/datos_crudos.csv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;
const MAX_LEN = parseInt(process.env.DATOS_CRUDOS_MAX_VARCHAR, 10) || 30;

function trunc(s, len = MAX_LEN) {
  if (s == null || s === '') return null;
  const t = String(s);
  return t.length > len ? t.slice(0, len) : t;
}

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 11) return null;
  const get = (i) => (parts[i] ?? '').trim();
  const last = parts.length - 1;
  const sector = parts.length === 11 ? (get(9) || null) : parts.slice(9, last).join(',').trim() || null;
  const procesadoStr = (parts[last] ?? '').trim().toLowerCase();
  const procesado = procesadoStr === 't' || procesadoStr === 'true' || procesadoStr === '1';
  const valor = get(4) === '' ? null : parseFloat(get(4));
  const periodo = get(5) === '' ? null : parseInt(get(5), 10);
  return {
    id: parseInt(get(0), 10),
    id_indicador: get(1) === '' ? null : parseInt(get(1), 10),
    descripcion_dato: get(2) || null,
    unidad: get(3) || null,
    valor: Number.isNaN(valor) ? null : valor,
    periodo: Number.isNaN(periodo) || periodo === null ? 0 : periodo,
    pais: get(6) || null,
    provincia: get(7) || null,
    tamano_empresa: get(8) || null,
    sector,
    procesado,
  };
}

function normalizeRow(row) {
  return {
    ...row,
    descripcion_dato: trunc(row.descripcion_dato),
    unidad: trunc(row.unidad, 40),
    pais: trunc(row.pais),
    provincia: trunc(row.provincia),
    tamano_empresa: trunc(row.tamano_empresa),
    sector: trunc(row.sector, 300),
  };
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'datos_crudos.csv');
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
    if (row && !Number.isNaN(row.id)) rows.push(normalizeRow(row));
  }

  console.log('Filas a subir:', rows.length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('datos_crudos').upsert(batch, { onConflict: 'id' });
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
