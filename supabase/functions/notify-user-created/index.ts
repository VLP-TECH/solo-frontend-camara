// Supabase Edge Function: envía correo cuando se crea un usuario desde admin-usuarios
// Destinatarios: contacto@brainnova.info, chaume@vlptech.es
// Requiere: RESEND_API_KEY en Supabase Edge Function Secrets

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DESTINATARIOS = ["contacto@brainnova.info", "chaume@vlptech.es"];
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Brainnova <noreply@brainnova.info>";

interface UserCreatedPayload {
  email: string;
  firstName: string;
  lastName?: string;
  razonSocial: string;
  cif: string;
  role: string;
}

function buildEmailHtml(payload: UserCreatedPayload): string {
  const fecha = new Date().toLocaleString("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nuevo usuario registrado</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0c6c8b;">Nuevo usuario registrado en Brainnova</h2>
  <p>Se ha dado de alta un nuevo usuario en la plataforma.</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${payload.email}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Nombre</td><td style="padding: 8px; border: 1px solid #ddd;">${payload.firstName} ${payload.lastName || ""}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Razón Social</td><td style="padding: 8px; border: 1px solid #ddd;">${payload.razonSocial}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CIF</td><td style="padding: 8px; border: 1px solid #ddd;">${payload.cif}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Rol</td><td style="padding: 8px; border: 1px solid #ddd;">${payload.role}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Fecha de alta</td><td style="padding: 8px; border: 1px solid #ddd;">${fecha}</td></tr>
  </table>
  <p style="color: #666; font-size: 12px;">Este correo se ha generado automáticamente desde la plataforma Brainnova.</p>
</body>
</html>
`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured", ok: false }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let payload: UserCreatedPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!payload.email || !payload.razonSocial || !payload.cif) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: email, razonSocial, cif" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const html = buildEmailHtml(payload);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: DESTINATARIOS,
        subject: `[Brainnova] Nuevo usuario registrado: ${payload.email}`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Failed to send email", ok: false }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error sending email:", err);
    return new Response(
      JSON.stringify({ error: String(err), ok: false }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
