// Edge Function: crea usuario con auth.admin.createUser (no cambia la sesión del admin).
// Solo admins/superadmins pueden llamarla. Tras crear el usuario envía correo SMTP.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendRegistrationEmails } from "../_shared/email.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  razonSocial: string;
  cif: string;
  role: string;
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

  // Enviar correos (fire-and-forget, errores no bloquean la creación):
  //   - aviso al equipo (contacto@brainnova.info, …)
  //   - bienvenida al usuario creado
  const notificationPayload = {
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    razonSocial: payload.razonSocial,
    cif: payload.cif,
    role: payload.role || "user",
  };
  try {
    const emailResult = await sendRegistrationEmails(notificationPayload);
    if (!emailResult.copy.ok) {
      console.error("Registration copy email failed:", emailResult.copy.error);
    }
    if (!emailResult.welcome.ok) {
      console.error("Welcome email failed:", emailResult.welcome.error);
    }
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
