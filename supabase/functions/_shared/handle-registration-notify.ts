import {
  sendRegistrationEmails,
  type UserNotificationPayload,
} from "./email.ts";

export const REGISTRATION_NOTIFY_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function normalizeRegistrationPayload(
  payload: UserNotificationPayload,
): UserNotificationPayload {
  return {
    email: payload.email,
    firstName: payload.firstName || "",
    lastName: payload.lastName || "",
    razonSocial: payload.razonSocial || "",
    cif: payload.cif || "",
    role: payload.role || "user",
  };
}

/** Envía bienvenida al usuario + aviso al equipo (contacto@brainnova.info, …). */
export async function handleRegistrationNotifyRequest(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: REGISTRATION_NOTIFY_CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" },
    });
  }

  let payload: UserNotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" },
    });
  }

  if (!payload.email) {
    return new Response(
      JSON.stringify({ error: "Missing required field: email" }),
      { status: 400, headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" } },
    );
  }

  const normalized = normalizeRegistrationPayload(payload);
  const result = await sendRegistrationEmails(normalized);

  if (!result.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        welcome: result.welcome,
        notify: result.notify,
      }),
      { status: 502, headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" },
  });
}
