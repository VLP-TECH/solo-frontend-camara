/**
 * Verifica que la tabla informes en Supabase permita leer y guardar pdf_url.
 * Uso: node scripts/verify-informes-supabase.mjs
 */
const SUPABASE_URL = "https://aoykpiievtadhwssugvs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function main() {
  console.log("1. Leyendo tabla informes (columnas: id, pdf_url)...");
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/informes?select=id,pdf_url`, { headers });
  if (!getRes.ok) {
    console.error("ERROR al leer:", getRes.status, getRes.statusText, await getRes.text());
    process.exit(1);
  }
  const rows = await getRes.json();
  console.log("   Filas encontradas:", rows.length);
  rows.forEach((r) => console.log("   -", r.id, "| pdf_url:", r.pdf_url ? r.pdf_url.substring(0, 60) + "..." : "null"));

  const testId = "brainnova-2025";
  const testPdfUrl = "https://aoykpiievtadhwssugvs.supabase.co/storage/v1/object/public/informes/verificacion-test.pdf";

  console.log("\n2. Actualizando pdf_url para id =", testId, "...");
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/informes?id=eq.${encodeURIComponent(testId)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ pdf_url: testPdfUrl }),
  });
  const patchText = await patchRes.text();
  if (!patchRes.ok) {
    console.error("   ERROR PATCH:", patchRes.status, patchText);
  } else {
    const updated = patchText ? JSON.parse(patchText) : [];
    console.log("   Filas actualizadas:", updated.length);
  }

  console.log("\n3. Leyendo de nuevo para comprobar persistencia...");
  const getRes2 = await fetch(`${SUPABASE_URL}/rest/v1/informes?select=id,pdf_url`, { headers });
  const rows2 = await getRes2.json();
  const row = rows2.find((r) => r.id === testId);
  if (row && row.pdf_url) {
    console.log("   OK: pdf_url guardado en Supabase:", row.pdf_url.substring(0, 70) + "...");
  } else {
    console.log("   FALLO: pdf_url no persistió o la fila no existe. Row:", row);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
