// Supabase Edge Function: envía correo cuando se crea un usuario desde admin-usuarios.
// Destinatarios: contacto@brainnova.info, chaume@vlptech.es
// Envío vía SMTP (AWS SES). Variables de entorno requeridas:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL (opcional)

import {
  sendUserCreatedEmail,
  type UserNotificationPayload,
} from "../_shared/email.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: UserNotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!payload.email || !payload.razonSocial || !payload.cif) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: email, razonSocial, cif",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await sendUserCreatedEmail(payload);

  if (!result.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: result.error ?? "SMTP send failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
