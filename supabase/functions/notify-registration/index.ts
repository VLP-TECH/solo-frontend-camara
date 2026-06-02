// Edge Function: se llama desde el registro público (Auth.tsx) tras un signUp correcto.
// Envía dos correos:
//   1. Bienvenida al usuario que se registra ("validaremos tu acceso y te daremos de alta").
//   2. Aviso al equipo (contacto@brainnova.info, …) de que hay un nuevo registro.
// Envío vía SMTP (AWS SES). Variables de entorno requeridas:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL (opcional)

import {
  sendRegistrationEmails,
  type UserNotificationPayload,
} from "../_shared/email.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let payload: UserNotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!payload.email) {
    return new Response(
      JSON.stringify({ error: "Missing required field: email" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Normaliza campos opcionales para que las plantillas no muestren "undefined".
  const normalized: UserNotificationPayload = {
    email: payload.email,
    firstName: payload.firstName || "",
    lastName: payload.lastName || "",
    razonSocial: payload.razonSocial || "",
    cif: payload.cif || "",
    role: payload.role || "user",
  };

  const result = await sendRegistrationEmails(normalized);

  if (!result.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        welcome: result.welcome,
        notify: result.notify,
      }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
