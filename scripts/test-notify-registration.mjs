#!/usr/bin/env node
/**
 * Prueba el envío de correos de registro contra Supabase (producción por defecto).
 * Uso: node scripts/test-notify-registration.mjs [email-de-prueba]
 */
const PROJECT_URL = process.env.SUPABASE_URL || "https://aoykpiievtadhwssugvs.supabase.co";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveWtwaWlldnRhZGh3c3N1Z3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDkyMzksImV4cCI6MjA3MTc4NTIzOX0.8XoaRingLHPyGtuHgtfHnkVF6SDP8u64nrdOco9v4JY";

const testEmail = process.argv[2] || "test-registro@example.com";
const body = {
  email: testEmail,
  firstName: "Prueba",
  lastName: "Registro",
  razonSocial: "Empresa Test SA",
  cif: "B12345678",
  role: "user",
};

const functions = ["notify-user-created", "notify-registration"];

async function probe(name) {
  const url = `${PROJECT_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n--- ${name} ---`);
  console.log(`HTTP ${res.status}`);
  console.log(text.slice(0, 500));
  return res.status;
}

(async () => {
  for (const fn of functions) {
    await probe(fn);
  }
})();
