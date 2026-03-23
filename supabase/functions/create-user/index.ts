// Edge Function: crea usuario con auth.admin.createUser (no cambia la sesión del admin)
// Solo admins pueden llamarla. Envía correo de notificación tras crear.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
const DESTINATARIOS = ["contacto@brainnova.info", "chaume@vlptech.es"];
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Brainnova <noreply@brainnova.info>";

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  razonSocial: string;
  cif: string;
  role: string;
}

function buildEmailHtml(payload: Omit<CreateUserPayload, "password">): string {
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

async function sendNotificationEmail(payload: Omit<CreateUserPayload, "password">): Promise<void> {
  if (!POSTMARK_SERVER_TOKEN) {
    console.error("POSTMARK_SERVER_TOKEN not configured");
    return;
  }
  const html = buildEmailHtml(payload);
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: DESTINATARIOS.join(","),
      Subject: `[Brainnova] Nuevo usuario registrado: ${payload.email}`,
      HtmlBody: html,
      MessageStream: "outbound",
    }),
  });

  // Postmark puede responder con JSON o texto; capturamos ambos para depurar.
  const responseText = await res.text().catch(() => "");
  if (!res.ok) {
    let responseJson: unknown = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = responseText;
    }
    console.error("Postmark API error:", {
      status: res.status,
      body: responseJson,
    });
  }
}

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verificar que el caller está autenticado
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = (profile?.role as string)?.toLowerCase?.()?.trim?.();
  if (role !== "admin" && role !== "superadmin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!payload.email || !payload.password || !payload.firstName || !payload.razonSocial || !payload.cif) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: email, password, firstName, razonSocial, cif" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Crear usuario con admin API (no cambia la sesión del cliente)
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      first_name: payload.firstName,
      last_name: payload.lastName || "",
    },
  });

  if (createError) {
    return new Response(
      JSON.stringify({ error: createError.message }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (!createData.user) {
    return new Response(JSON.stringify({ error: "User creation failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Actualizar perfil (puede existir por trigger) o insertar si no existe
  const profileData = {
    role: payload.role || "user",
    active: true,
    razon_social: payload.razonSocial,
    cif: payload.cif,
    first_name: payload.firstName,
    last_name: payload.lastName || null,
  };
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(profileData)
    .eq("user_id", createData.user.id);

  if (updateError) {
    const { error: insertError } = await supabaseAdmin.from("profiles").insert({
      user_id: createData.user.id,
      email: createData.user.email,
      ...profileData,
    });
    if (insertError) console.warn("Profile insert fallback:", insertError.message);
  }

  // Enviar correo de notificación (fire-and-forget)
  try {
    await sendNotificationEmail({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    razonSocial: payload.razonSocial,
    cif: payload.cif,
    role: payload.role || "user",
    });
  } catch (err) {
    console.error("Email notification error:", err);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: createData.user.id,
      email: createData.user.email,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
