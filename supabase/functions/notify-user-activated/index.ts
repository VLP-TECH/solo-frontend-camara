// Aviso al usuario cuando un admin activa su cuenta desde /admin-usuarios.
import {
  sendUserActivatedEmail,
  type UserActivationPayload,
} from "../_shared/email.ts";

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

    let payload: UserActivationPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!payload.email) {
      return jsonResponse({ error: "Missing required field: email" }, 400);
    }

    const result = await sendUserActivatedEmail({
      email: payload.email,
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
    });

    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, 502);
    }
    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("notify-user-activated error:", err);
    return jsonResponse({ ok: false, error: String(err) }, 502);
  }
});
