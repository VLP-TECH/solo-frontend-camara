/**
 * Sube el CSV resultados_indicadores a Supabase (tabla public.resultado_indicadores).
 * El CSV no incluye id_indicador ni nombre_indicador; el frontend filtra por nombre_indicador,
 * así que para que aparezcan en la app habrá que rellenarlos después (p. ej. con un UPDATE o vista).
 *
 * Uso:
 *   node scripts/upload-resultados-indicadores.mjs [ruta/al/archivo.csv]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://aoykpiievtadhwssugvs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY';

const BATCH_SIZE = 500;

function trim(s) {
  return s == null ? null : String(s).trim() || null;
}
function parseNum(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).trim());
  return Number.isNaN(n) ? null : n;
}
/** Evita overflow en columnas numeric: redondea a 6 decimales y acota (p. ej. numeric(12,6)). */
function safeNumeric(v) {
  if (v == null || Number.isNaN(v)) return null;
  const max = 999999.999999;
  const min = -max;
  const r = Math.round(Number(v) * 1e6) / 1e6;
  return r > max ? max : r < min ? min : r;
}
function parseDate(s) {
  const t = trim(s);
  if (!t || t.length < 10) return null;
  return t.slice(0, 10);
}
/** Año entero desde fecha YYYY-MM-DD (la tabla suele tener periodo como integer). */
function parsePeriodoAsYear(s) {
  const t = trim(s);
  if (!t || t.length < 4) return null;
  const y = parseInt(t.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < 10) return null;
  const id = parseInt(parts[0].trim(), 10);
  if (Number.isNaN(id)) return null;
  return {
    id,
    valor_calculado: safeNumeric(parseNum(parts[1])),
    fecha_calculo: parseDate(parts[2]),
    unidad_tipo: trim(parts[3]),
    unidad_display: trim(parts[4]),
    periodo: parsePeriodoAsYear(parts[5]),
    pais: trim(parts[6]),
    provincia: trim(parts[7]),
    sector: trim(parts[8]),
    tamano_empresa: trim(parts[9]),
  };
}

async function main() {
  const defaultInProject = resolve(__dirname, 'data', 'resultados_indicadores.csv');
  const defaultDownloads = resolve(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'resultados_indicadores (1).csv');
  const csvPath = process.argv[2] ?? (existsSync(defaultInProject) ? defaultInProject : defaultDownloads);
  console.log('Leyendo CSV:', csvPath);

  if (!existsSync(csvPath)) {
    console.error('No se encuentra el CSV. Usa: node scripts/upload-resultados-indicadores.mjs <ruta/al/archivo.csv>');
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
    if (row) {
      if (row.nombre_indicador == null || row.nombre_indicador === '') row.nombre_indicador = '';
      if (row.periodo == null || Number.isNaN(row.periodo)) {
        const fromFecha = row.fecha_calculo ? parseInt(String(row.fecha_calculo).slice(0, 4), 10) : null;
        row.periodo = Number.isNaN(fromFecha) ? 2000 : fromFecha;
      }
      rows.push(row);
    }
  }

  console.log('Filas a subir:', rows.length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('resultado_indicadores').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Error en lote', Math.floor(i / BATCH_SIZE) + 1, error.message);
      err += batch.length;
    } else {
      ok += batch.length;
      if (ok % 2000 === 0 || ok === rows.length) console.log('Subidas', ok, '/', rows.length);
    }
  }

  console.log('Listo. OK:', ok, 'Errores:', err);
  if (err > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
