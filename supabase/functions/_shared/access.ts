// Utilidades compartidas para el flujo de "establecer contraseña" tras validar
// un usuario en /admin-usuarios (enlace de acceso único válido 6 horas).

/** Horas de validez del enlace de acceso único. */
export const ACCESS_LINK_TTL_HOURS = 6;

/** Base URL del frontend (página /establecer-password). */
export function getAppBaseUrl(): string {
  return (Deno.env.get("APP_BASE_URL") || "https://brainnova.info").replace(/\/+$/, "");
}

/** Genera un token aleatorio seguro (64 hex chars = 32 bytes). */
export function generateAccessToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Construye el enlace de acceso a /establecer-password. */
export function buildAccessLink(token: string): string {
  return `${getAppBaseUrl()}/establecer-password?token=${token}`;
}

/**
 * Mismas reglas que la validación del frontend:
 * mín. 8 caracteres, mayúscula, minúscula, número y carácter especial.
 * Devuelve un mensaje de error o null si es válida.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe contener al menos un número";
  }
  if (!/[a-z]/.test(password)) {
    return "La contraseña debe contener al menos una letra minúscula";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe contener al menos una letra mayúscula";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "La contraseña debe contener al menos un carácter especial";
  }
  return null;
}
