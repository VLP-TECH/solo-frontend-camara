/**
 * Script para subir datos_macro desde un CSV a Supabase.
 * Uso: node scripts/upload-datos-macro.js <ruta-al-csv>
 * Ejemplo: node scripts/upload-datos-macro.js /Users/chaumesanchez/Downloads/datos_macro_rows.csv
 *
 * Necesita variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
 * (o las lee del cliente por defecto si existen en el proyecto).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://aoykpiievtadhwssugvs.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("CSV vacío");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    while (cols.length < headers.length) cols.push("");
    return cols;
  });
  return { headers, rows };
}

// Columnas que tiene la tabla datos_macro en Supabase (solo las que existen en el schema)
const DATOS_MACRO_COLUMNS = new Set([
  "id",
  "descripcion_dato",
  "unidad",
  "valor",
  "periodo",
  "pais",
  "provincia",
]);

// Límite varchar(30) en Supabase para columnas de texto. Si amplías la columna en la tabla, sube este valor.
const VARCHAR_MAX_LENGTH = 30;

function rowToRecord(headers, cols, columnsToUse) {
  const row = {};
  headers.forEach((h, i) => {
    if (!columnsToUse.has(h)) return;
    let v = cols[i]?.trim() ?? "";
    if (v === "") {
      row[h] = null;
      return;
    }
    if (h === "id" || h === "periodo") {
      const n = Number(v);
      row[h] = isNaN(n) ? v : n;
      return;
    }
    if (h === "valor") {
      const n = Number(v);
      row[h] = isNaN(n) ? v : n;
      return;
    }
    if (typeof v === "string" && v.length > VARCHAR_MAX_LENGTH) {
      v = v.slice(0, VARCHAR_MAX_LENGTH);
    }
    row[h] = v;
  });
  return row;
}

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const csvPath = args.find((a) => !a.startsWith("--")) || join(__dirname, "../datos_macro_rows.csv");

  if (replace) {
    console.log("Eliminando filas existentes en datos_macro...");
    const { error: delError } = await supabase.from("datos_macro").delete().gte("id", 0);
    if (delError) {
      console.error("Error al vaciar tabla:", delError.message);
      process.exit(1);
    }
    console.log("Tabla vaciada.");
  }

  console.log("Leyendo CSV:", csvPath);
  const text = readFileSync(csvPath, "utf-8");
  const { headers, rows } = parseCsv(text);
  console.log("Columnas:", headers.join(", "));
  console.log("Filas:", rows.length);

  const payload = rows
    .map((cols) => rowToRecord(headers, cols, DATOS_MACRO_COLUMNS))
    .filter((row) => Object.values(row).some((v) => v != null && v !== ""));

  if (payload.length === 0) {
    console.error("No hay filas válidas para insertar.");
    process.exit(1);
  }

  const chunkSize = 500;
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const num = Math.floor(i / chunkSize) + 1;
    const total = Math.ceil(payload.length / chunkSize);
    try {
      const { data, error } = await supabase
        .from("datos_macro")
        .insert(chunk)
        .select("id");

      if (error) {
        console.error(`Chunk ${num}/${total} error:`, error.message);
        totalErrors += chunk.length;
        continue;
      }
      totalInserted += data?.length ?? chunk.length;
      console.log(`Chunk ${num}/${total}: insertadas ${chunk.length} filas`);
    } catch (e) {
      console.error(`Chunk ${num}/${total} excepción:`, e.message);
      totalErrors += chunk.length;
    }
  }

  console.log("\nResumen: insertadas", totalInserted, "filas.", totalErrors > 0 ? `Errores: ${totalErrors}.` : "");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
