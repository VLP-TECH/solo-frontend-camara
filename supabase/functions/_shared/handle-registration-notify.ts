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
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...REGISTRATION_NOTIFY_CORS, "Content-Type": "application/json" },
  });
}

export async function handleRegistrationNotifyRequest(
  req: Request,
): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: REGISTRATION_NOTIFY_CORS });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let payload: UserNotificationPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!payload.email) {
      return jsonResponse({ error: "Missing required field: email" }, 400);
    }

    const normalized = normalizeRegistrationPayload(payload);
    const result = await sendRegistrationEmails(normalized);

    if (!result.ok) {
      return jsonResponse(
        { ok: false, welcome: result.welcome, copy: result.copy },
        502,
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("handleRegistrationNotifyRequest error:", err);
    return jsonResponse({ ok: false, error: String(err) }, 502);
  }
}
