// Edge Function pública: el usuario establece su contraseña usando el token de
// acceso único recibido por correo (válido 6 horas) tras ser validado por un admin.
//
// POST { token, password }
//   - Valida el token (existe, no usado, no caducado).
//   - Fija la contraseña en auth.users (auth.admin.updateUserById).
//   - Marca el perfil como activo y el token como usado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validatePassword } from "../_shared/access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface SetPasswordPayload {
  token?: string;
  password?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let payload: SetPasswordPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const token = (payload.token || "").trim();
    const password = payload.password || "";

    if (!token) {
      return jsonResponse({ error: "Falta el token de acceso." }, 400);
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return jsonResponse({ error: pwdError }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Buscar el token
    const { data: row, error: tokenError } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("token lookup error:", tokenError.message);
      return jsonResponse({ error: "No se pudo validar el enlace." }, 500);
    }
    if (!row) {
      return jsonResponse({ error: "El enlace no es válido.", code: "invalid" }, 400);
    }
    if (row.used_at) {
      return jsonResponse(
        { error: "Este enlace ya se ha utilizado.", code: "used" },
        400,
      );
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        { error: "El enlace ha caducado. Solicita uno nuevo.", code: "expired" },
        400,
      );
    }

    // Un solo uso por usuario: si ya estableció su contraseña por este flujo,
    // el enlace no puede sobrescribirla (aunque se haya generado uno nuevo).
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("password_set_at")
      .eq("user_id", row.user_id)
      .maybeSingle();
    if (prof?.password_set_at) {
      return jsonResponse(
        {
          error:
            "Ya has establecido tu contraseña con este enlace. Si necesitas cambiarla, inicia sesión y hazlo desde tu perfil.",
          code: "already_set",
        },
        400,
      );
    }

    // Fijar la contraseña en auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      row.user_id,
      { password, email_confirm: true },
    );
    if (updateError) {
      console.error("updateUserById error:", updateError.message);
      return jsonResponse({ error: "No se pudo establecer la contraseña." }, 500);
    }

    // Asegurar perfil activo y marcar la contraseña como establecida (un solo uso).
    await supabaseAdmin
      .from("profiles")
      .update({
        active: true,
        password_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id);

    // Marcar token como usado
    await supabaseAdmin
      .from("password_setup_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("set-password error:", err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
});
