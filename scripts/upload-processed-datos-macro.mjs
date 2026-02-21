/**
 * Sube el CSV processed_datos_macro.csv a Supabase (tabla public.processed_datos_macro).
 *
 * Uso:
 *   node scripts/upload-processed-datos-macro.mjs [ruta/al/archivo.csv]
 *
 * Si no pasas ruta, usa: ~/Downloads/processed_datos_macro.csv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 11) return null;
  const get = (i) => (parts[i] ?? '').trim();
  if (parts.length === 11) {
    const valor = get(3) === '' ? null : parseFloat(get(3));
    return {
      id: parseInt(get(0), 10),
      id_dato_macro: parseInt(get(1), 10),
      descripcion_dato: get(2) || null,
      valor: Number.isNaN(valor) ? null : valor,
      unidad_tipo: get(4) || null,
      unidad_display: get(5) || null,
      periodo: get(6) || null,
      pais: get(7) || null,
      provincia: get(8) || null,
      tamano_empresa: get(9) || null,
      sector: get(10) || null,
    };
  }
  const n = parts.length;
  const descripcion_dato = parts.slice(2, n - 8).join(',').trim() || null;
  const valor = (parts[n - 8] ?? '').trim();
  const numValor = valor === '' ? null : parseFloat(valor);
  return {
    id: parseInt(parts[0], 10),
    id_dato_macro: parseInt(parts[1], 10),
    descripcion_dato,
    valor: Number.isNaN(numValor) ? null : numValor,
    unidad_tipo: (parts[n - 7] ?? '').trim() || null,
    unidad_display: (parts[n - 6] ?? '').trim() || null,
    periodo: (parts[n - 5] ?? '').trim() || null,
    pais: (parts[n - 4] ?? '').trim() || null,
    provincia: (parts[n - 3] ?? '').trim() || null,
    tamano_empresa: (parts[n - 2] ?? '').trim() || null,
    sector: (parts[n - 1] ?? '').trim() || null,
  };
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'processed_datos_macro.csv');
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
    if (row && !Number.isNaN(row.id)) rows.push(row);
  }

  console.log('Filas a subir:', rows.length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('processed_datos_macro').upsert(batch, { onConflict: 'id' });
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
