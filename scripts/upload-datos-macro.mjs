/**
 * Sube el CSV datos_macro.csv a Supabase (tabla public.datos_macro).
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key node scripts/upload-datos-macro.mjs [ruta/al/archivo.csv]
 *
 * RLS: hace falta la Service Role Key (Dashboard → Settings → API → service_role) para poder insertar.
 * Si no pasas ruta, usa: ~/Downloads/datos_macro.csv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;

// Truncar a N caracteres. Si tu tabla tiene columnas varchar(30), el script ya trunca a 30.
const MAX_LEN = parseInt(process.env.DATOS_MACRO_MAX_VARCHAR, 10) || 30;
function trunc(s, len = MAX_LEN) {
  if (s == null || s === '') return null;
  const t = String(s);
  return t.length > len ? t.slice(0, len) : t;
}

function normalizeRow(row) {
  return {
    ...row,
    descripcion_dato: trunc(row.descripcion_dato),
    unidad: trunc(row.unidad),
    pais: trunc(row.pais),
    provincia: trunc(row.provincia),
    tamano_empresa: trunc(row.tamano_empresa),
    sector: trunc(row.sector),
    periodo: row.periodo != null && !Number.isNaN(row.periodo) ? row.periodo : 0,
  };
}

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 9) return null;
  const get = (i) => (parts[i] ?? '').trim();
  if (parts.length === 9) {
    const valor = get(3) === '' ? null : parseFloat(get(3));
    const periodo = get(4) === '' ? null : parseInt(get(4), 10);
    return {
      id: parseInt(get(0), 10),
      descripcion_dato: get(1) || null,
      unidad: get(2) || null,
      valor: Number.isNaN(valor) ? null : valor,
      periodo: Number.isNaN(periodo) ? null : periodo,
      pais: get(5) || null,
      provincia: get(6) || null,
      tamano_empresa: get(7) || null,
      sector: get(8) || null,
    };
  }
  const n = parts.length;
  const descripcion_dato = parts.slice(1, n - 7).join(',').trim() || null;
  const unidad = (parts[n - 7] ?? '').trim() || null;
  const valor = (parts[n - 6] ?? '').trim();
  const periodo = (parts[n - 5] ?? '').trim();
  const numValor = valor === '' ? null : parseFloat(valor);
  const numPeriodo = periodo === '' ? null : parseInt(periodo, 10);
  return {
    id: parseInt(parts[0], 10),
    descripcion_dato,
    unidad,
    valor: Number.isNaN(numValor) ? null : numValor,
    periodo: Number.isNaN(numPeriodo) ? null : numPeriodo,
    pais: (parts[n - 4] ?? '').trim() || null,
    provincia: (parts[n - 3] ?? '').trim() || null,
    tamano_empresa: (parts[n - 2] ?? '').trim() || null,
    sector: (parts[n - 1] ?? '').trim() || null,
  };
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'datos_macro.csv');
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY !== SUPABASE_KEY) {
    console.warn('Aviso: Usa SUPABASE_SERVICE_ROLE_KEY para evitar errores de RLS. Dashboard → Settings → API → service_role');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('datos_macro').upsert(batch, { onConflict: 'id' });
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
