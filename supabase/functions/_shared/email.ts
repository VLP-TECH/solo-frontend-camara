// Módulo compartido para envío de correos vía SMTP (AWS SES).
// Se invoca desde las Edge Functions create-user y notify-user-created.
//
// Variables de entorno requeridas (Supabase Secrets):
//   - SMTP_HOST     (p. ej. email-smtp.eu-west-1.amazonaws.com)
//   - SMTP_PORT     (465 TLS implícito. NO usar 587/2587: STARTTLS falla en el
//                    runtime Edge con "BadResource: Bad resource ID" en Deno.startTls,
//                    lo que crashea el isolate y devuelve 503.)
//   - SMTP_USER     (Access Key ID SMTP de SES, NO la de IAM general)
//   - SMTP_PASSWORD (Secret SMTP de SES)
//   - FROM_EMAIL    (remitente verificado en SES, p. ej. "Brainnova <contacto@brainnova.info>")

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/** Copia del correo de registro enviada al equipo (mismo dominio que FROM en sandbox SES). */
export const REGISTRATION_COPY_EMAIL = "contacto@brainnova.info";

const ACTIVATION_SUBJECT = "Tu acceso a Brainnova ya está activo";
const DEACTIVATION_SUBJECT = "Desactivación de tu cuenta de usuario en Brainnova";
const PLATFORM_URL = "https://brainnova.info/";
const CONTACT_EMAIL = "contacto@brainnova.info";

const WELCOME_SUBJECT = "Hemos recibido tu registro en Brainnova";

export interface UserNotificationPayload {
  email: string;
  firstName: string;
  lastName?: string;
  razonSocial: string;
  cif: string;
  role: string;
}

export function buildUserWelcomeHtml(payload: UserNotificationPayload): string {
  const nombre = `${payload.firstName} ${payload.lastName || ""}`.trim();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Hemos recibido tu registro</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0c6c8b;">¡Gracias por registrarte en Brainnova!</h2>
  <p>Hola${nombre ? ` ${nombre}` : ""},</p>
  <p>Hemos recibido tu solicitud de registro en la plataforma Brainnova. Validaremos tu acceso y te daremos de alta en el sistema.</p>
  <p>Recibirás una notificación cuando tu cuenta esté activa y puedas acceder con tu correo <strong>${payload.email}</strong>.</p>
  <p style="color: #666; font-size: 12px; margin-top: 24px;">Este correo se ha generado automáticamente desde la plataforma Brainnova. Si no has solicitado este registro, puedes ignorar este mensaje.</p>
</body>
</html>
`;
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

function readSmtpConfig(): SmtpConfig | { error: string } {
  const host = Deno.env.get("SMTP_HOST");
  const portStr = Deno.env.get("SMTP_PORT") ?? "465";
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from =
    Deno.env.get("FROM_EMAIL") ||
    "Brainnova <contacto@brainnova.info>";

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!password) missing.push("SMTP_PASSWORD");
  if (missing.length > 0) {
    return { error: `Missing SMTP env vars: ${missing.join(", ")}` };
  }

  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port) || port <= 0) {
    return { error: `Invalid SMTP_PORT: ${portStr}` };
  }

  return {
    host: host!,
    port,
    user: user!,
    password: password!,
    from,
  };
}

const SMTP_SEND_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    }),
  ]);
}

export async function sendEmailSmtp(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const cfg = readSmtpConfig();
  if ("error" in cfg) {
    console.error("SMTP config error:", cfg.error);
    return { ok: false, error: cfg.error };
  }

  const useImplicitTls = cfg.port === 465;
  const client = new SMTPClient({
    connection: {
      hostname: cfg.host,
      port: cfg.port,
      tls: useImplicitTls,
      auth: {
        username: cfg.user,
        password: cfg.password,
      },
    },
  });

  try {
    await withTimeout(
      client.send({
        from: cfg.from,
        to: params.to,
        subject: params.subject,
        content: "Notificación Brainnova",
        html: params.html,
      }),
      SMTP_SEND_TIMEOUT_MS,
      "SMTP send",
    );
    return { ok: true };
  } catch (err) {
    console.error("SMTP send error:", err);
    return { ok: false, error: String(err) };
  } finally {
    try {
      await client.close();
    } catch (closeErr) {
      console.warn("SMTP close error:", closeErr);
    }
  }
}

/** Copia del mismo correo de bienvenida para contacto@brainnova.info. */
export async function sendRegistrationCopyEmail(
  payload: UserNotificationPayload,
  html: string,
): Promise<SendEmailResult> {
  return await sendEmailSmtp({
    to: [REGISTRATION_COPY_EMAIL],
    subject: `[Copia registro] ${WELCOME_SUBJECT} — ${payload.email}`,
    html,
  });
}

/** Correo de bienvenida al usuario que se registra. */
export async function sendUserWelcomeEmail(
  payload: UserNotificationPayload,
  html?: string,
): Promise<SendEmailResult> {
  const body = html ?? buildUserWelcomeHtml(payload);
  return await sendEmailSmtp({
    to: [payload.email],
    subject: WELCOME_SUBJECT,
    html: body,
  });
}

/**
 * Bienvenida al usuario + copia idéntica a contacto@brainnova.info.
 */
export async function sendRegistrationEmails(
  payload: UserNotificationPayload,
): Promise<{ welcome: SendEmailResult; copy: SendEmailResult; ok: boolean }> {
  const html = buildUserWelcomeHtml(payload);
  // Secuencial: dos conexiones SMTP en paralelo suelen provocar 503/timeout en Edge Functions.
  const welcome = await sendUserWelcomeEmail(payload, html);
  const copy = await sendRegistrationCopyEmail(payload, html);
  return { welcome, copy, ok: welcome.ok && copy.ok };
}

export interface UserActivationPayload {
  email: string;
  firstName?: string;
  lastName?: string;
}

export function buildUserActivatedHtml(payload: UserActivationPayload): string {
  const nombre = `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${ACTIVATION_SUBJECT}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="color: #0c6c8b;">Tu acceso a Brainnova ya está activo</h2>
  <p>Estimado/a${nombre ? ` ${nombre}` : ""},</p>
  <p>Te informamos que tu cuenta de usuario se ha activado correctamente en <strong>Brainnova</strong>, el Panel de Economía Digital impulsado por Cámara Valencia.</p>
  <p>A partir de ahora puedes acceder a la plataforma y:</p>
  <ul>
    <li>Explorar dashboards interactivos de economía digital.</li>
    <li>Analizar indicadores por territorio y periodo.</li>
    <li>Descargar informes y contenidos diseñados para apoyar la toma de decisiones.</li>
  </ul>
  <p>Acceso a la plataforma: <a href="${PLATFORM_URL}" style="color: #0c6c8b;">Brainnova | Ecosistema Digital de la Comunidad Valenciana</a></p>
  <p>Si tienes cualquier duda sobre el acceso o el uso de la plataforma, puedes contactar con nosotros a través de <a href="mailto:${CONTACT_EMAIL}" style="color: #0c6c8b;">${CONTACT_EMAIL}</a>.</p>
  <p style="margin-top: 24px;">Un saludo cordial,<br>Equipo Brainnova<br>Cámara Valencia</p>
</body>
</html>
`;
}

/** Correo al usuario cuando un admin activa su cuenta. */
export async function sendUserActivatedEmail(
  payload: UserActivationPayload,
): Promise<SendEmailResult> {
  return await sendEmailSmtp({
    to: [payload.email],
    subject: ACTIVATION_SUBJECT,
    html: buildUserActivatedHtml(payload),
  });
}

export function buildUserDeactivatedHtml(payload: UserActivationPayload): string {
  const nombre = `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${DEACTIVATION_SUBJECT}</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="color: #0c6c8b;">Desactivación de tu cuenta de usuario en Brainnova</h2>
  <p>Estimado/a${nombre ? ` ${nombre}` : ""},</p>
  <p>Te informamos que tu cuenta de usuario en <strong>Brainnova</strong> ha sido desactivada correctamente.</p>
  <p>Desde este momento, ya no tendrás acceso al Panel de Economía Digital ni a sus contenidos y funcionalidades asociadas.</p>
  <p>Si consideras que esta desactivación se ha realizado por error o necesitas volver a acceder a la plataforma en el futuro, puedes ponerte en contacto con nosotros a través de <a href="mailto:${CONTACT_EMAIL}" style="color: #0c6c8b;">${CONTACT_EMAIL}</a>.</p>
  <p>Gracias por tu interés y esperamos tenerte de vuelta pronto.</p>
  <p style="margin-top: 24px;">Un saludo cordial,<br>Equipo Brainnova<br>Cámara Valencia</p>
</body>
</html>
`;
}

/** Correo al usuario cuando un admin desactiva su cuenta. */
export async function sendUserDeactivatedEmail(
  payload: UserActivationPayload,
): Promise<SendEmailResult> {
  return await sendEmailSmtp({
    to: [payload.email],
    subject: DEACTIVATION_SUBJECT,
    html: buildUserDeactivatedHtml(payload),
  });
}
