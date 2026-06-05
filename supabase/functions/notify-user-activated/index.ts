// Aviso al usuario cuando un admin cambia el estado de su cuenta en /admin-usuarios.
//   action: "activated"   -> "Tu acceso a Brainnova ya está activo" (+ enlace para
//                            establecer contraseña, único y válido 6 horas).
//   action: "deactivated" -> "Desactivación de tu cuenta de usuario en Brainnova"
// (action por defecto: "activated", para compatibilidad con llamadas previas.)
//
// Solo admins/superadmins pueden invocarla (verificación manual del JWT del caller).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  sendUserActivatedEmail,
  sendUserDeactivatedEmail,
  type UserActivationPayload,
} from "../_shared/email.ts";
import {
  ACCESS_LINK_TTL_HOURS,
  buildAccessLink,
  generateAccessToken,
} from "../_shared/access.ts";

interface ActivationRequest extends UserActivationPayload {
  action?: "activated" | "deactivated";
}

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

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // --- Verificar que el caller es admin/superadmin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization required" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const callerRole = (callerProfile?.role as string)?.toLowerCase?.()?.trim?.();
    if (callerRole !== "admin" && callerRole !== "superadmin") {
      return jsonResponse({ error: "Forbidden: admin role required" }, 403);
    }

    let payload: ActivationRequest;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!payload.email) {
      return jsonResponse({ error: "Missing required field: email" }, 400);
    }

    const emailPayload: UserActivationPayload = {
      email: payload.email,
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
    };

    if (payload.action === "deactivated") {
      const result = await sendUserDeactivatedEmail(emailPayload);
      if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 502);
      return jsonResponse({ ok: true }, 200);
    }

    // --- Activación: generar enlace único para establecer contraseña ---
    let accessLink: string | undefined;
    try {
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, password_set_at")
        .eq("email", payload.email)
        .maybeSingle();

      if (targetProfile?.password_set_at) {
        // El usuario ya estableció su contraseña por este flujo: no generamos
        // un enlace nuevo (un solo uso por usuario). Se envía el correo sin enlace.
        console.log("Usuario ya tiene contraseña establecida, sin enlace:", payload.email);
      } else if (targetProfile?.user_id) {
        const token = generateAccessToken();
        const expiresAt = new Date(
          Date.now() + ACCESS_LINK_TTL_HOURS * 60 * 60 * 1000,
        ).toISOString();

        const { error: insertError } = await supabaseAdmin
          .from("password_setup_tokens")
          .insert({
            user_id: targetProfile.user_id,
            email: payload.email,
            token,
            expires_at: expiresAt,
          });

        if (insertError) {
          console.error("password_setup_tokens insert error:", insertError.message);
        } else {
          accessLink = buildAccessLink(token);
        }
      } else {
        console.warn("No profile found for email, sending activation without link:", payload.email);
      }
    } catch (linkErr) {
      // Si falla la generación del enlace, enviamos el correo de activación igualmente.
      console.error("Access link generation error:", linkErr);
    }

    const result = await sendUserActivatedEmail(emailPayload, accessLink);
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, 502);
    }
    return jsonResponse({ ok: true, accessLinkSent: Boolean(accessLink) }, 200);
  } catch (err) {
    console.error("notify-user-activated error:", err);
    return jsonResponse({ ok: false, error: String(err) }, 502);
  }
});
