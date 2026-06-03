// Registro público (/auth). Alias de la misma lógica que notify-user-created.
import { handleRegistrationNotifyRequest } from "../_shared/handle-registration-notify.ts";

Deno.serve(handleRegistrationNotifyRequest);
