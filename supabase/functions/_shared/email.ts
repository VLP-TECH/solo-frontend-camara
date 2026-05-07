// Módulo compartido para envío de correos vía SMTP (AWS SES).
// Se invoca desde las Edge Functions create-user y notify-user-created.
//
// Variables de entorno requeridas (Supabase Secrets):
//   - SMTP_HOST     (p. ej. email-smtp.eu-west-1.amazonaws.com)
//   - SMTP_PORT     (587 con STARTTLS, 465 con TLS implícito)
//   - SMTP_USER     (Access Key ID SMTP de SES, NO la de IAM general)
//   - SMTP_PASSWORD (Secret SMTP de SES)
//   - FROM_EMAIL    (remitente verificado en SES, p. ej. "Brainnova <contacto@brainnova.info>")

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export const NOTIFICATION_RECIPIENTS = [
  "contacto@brainnova.info",
  "chaume@vlptech.es",
];

export interface UserNotificationPayload {
  email: string;
  firstName: string;
  lastName?: string;
  razonSocial: string;
  cif: string;
  role: string;
}

export function buildUserCreatedHtml(payload: UserNotificationPayload): string {
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
  const portStr = Deno.env.get("SMTP_PORT") ?? "587";
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

export async function sendEmailSmtp(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const cfg = readSmtpConfig();
  if ("error" in cfg) {
    console.error("SMTP config error:", cfg.error);
    return { ok: false, error: cfg.error };
  }

  // Puerto 465 -> TLS implícito; resto (587, 25, 2587) -> STARTTLS.
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
    await client.send({
      from: cfg.from,
      to: params.to,
      subject: params.subject,
      content: "Notificación Brainnova",
      html: params.html,
    });
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

export async function sendUserCreatedEmail(
  payload: UserNotificationPayload,
  recipients: string[] = NOTIFICATION_RECIPIENTS,
): Promise<SendEmailResult> {
  return await sendEmailSmtp({
    to: recipients,
    subject: `[Brainnova] Nuevo usuario registrado: ${payload.email}`,
    html: buildUserCreatedHtml(payload),
  });
}
