import { supabase } from "@/integrations/supabase/client";

export interface ActivationNotifyBody {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Envía al usuario el correo "Tu acceso a Brainnova ya está activo"
 * cuando un admin activa su cuenta. No bloquea el cambio de estado:
 * devuelve { ok: false } si falla, para que la UI lo avise sin romper.
 */
export async function sendActivationNotifyEmail(
  body: ActivationNotifyBody,
): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "notify-user-activated",
      { body },
    );
    const result = data as { ok?: boolean; error?: string } | null;
    if (error || result?.ok !== true) {
      return { ok: false, detail: error?.message || result?.error || data };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : e };
  }
}
