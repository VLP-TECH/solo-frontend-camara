import { supabase } from "@/integrations/supabase/client";

export interface RegistrationNotifyBody {
  email: string;
  firstName: string;
  lastName: string;
  razonSocial: string;
  cif: string;
  role: string;
}

type NotifyResult = {
  ok?: boolean;
  welcome?: { error?: string };
  copy?: { error?: string };
  error?: string;
};

const FUNCTION_CANDIDATES = ["notify-user-created", "notify-registration"] as const;

function isNotifySuccess(data: NotifyResult | null, fnError: Error | null): boolean {
  if (fnError) return false;
  if (data?.ok === false) return false;
  if (data?.error) return false;
  return data?.ok === true;
}

async function invokeOnce(
  functionName: (typeof FUNCTION_CANDIDATES)[number],
  body: RegistrationNotifyBody,
): Promise<{ ok: boolean; functionName: string; detail?: unknown }> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  const result = data as NotifyResult | null;
  if (isNotifySuccess(result, error)) {
    return { ok: true, functionName };
  }
  return {
    ok: false,
    functionName,
    detail: error?.message || result?.welcome?.error || result?.copy?.error || result || data,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tras signUp: envía correo al usuario y aviso a contacto@brainnova.info.
 * Prueba notify-user-created (ya desplegada en prod) y notify-registration como respaldo.
 */
export async function sendRegistrationNotifyEmails(
  body: RegistrationNotifyBody,
): Promise<{ ok: boolean; usedFunction?: string }> {
  for (const functionName of FUNCTION_CANDIDATES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await invokeOnce(functionName, body);
        if (res.ok) return { ok: true, usedFunction: res.functionName };
        if (attempt === 0) await sleep(400);
      } catch (e) {
        if (attempt === 1) {
          console.warn(`[registration-notify] ${functionName} exception:`, e);
        } else {
          await sleep(400);
        }
      }
    }
  }
  return { ok: false };
}
