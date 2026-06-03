// Aviso de nuevo registro / alta (admin o público). Bienvenida + aviso al equipo.
import { handleRegistrationNotifyRequest } from "../_shared/handle-registration-notify.ts";

Deno.serve(handleRegistrationNotifyRequest);
