# Pasar a producción (Brainnova)

## 1. Frontend (EasyPanel / Docker)

El código en `main` de GitHub despliega el panel (hosts `*.easypanel.host`).

1. Confirma que `main` está actualizado (`git push origin main`).
2. En **EasyPanel** → proyecto frontend → **Redeploy** / rebuild desde `main`.
3. Variables de entorno en EasyPanel (si aplica): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (el repo ya embebe URL/anon en `client.ts` si no hay `.env`).

Comprobar: abrir la URL de producción y `/auth`, `/informes`, `/kpis`.

## 2. Supabase Edge Functions (correos registro)

Requiere CLI con acceso a `aoykpiievtadhwssugvs` (cuenta Thinkia / Javier).

```bash
./scripts/verify-supabase-access.sh   # debe salir ✅
```

### 2a. Secretos SMTP (obligatorio)

Dashboard: [Edge Functions → Secrets](https://supabase.com/dashboard/project/aoykpiievtadhwssugvs/settings/functions)

O CLI:

```bash
supabase secrets set \
  SMTP_HOST=email-smtp.eu-west-1.amazonaws.com \
  SMTP_PORT=465 \
  SMTP_USER='<SES_SMTP_USER>' \
  SMTP_PASSWORD='<SES_SMTP_PASSWORD>' \
  FROM_EMAIL='Brainnova <contacto@brainnova.info>' \
  --project-ref aoykpiievtadhwssugvs
```

### 2b. Desplegar funciones

```bash
./scripts/deploy-email-functions.sh
```

### 2c. Probar

```bash
node scripts/test-notify-registration.mjs contacto@brainnova.info
```

Esperado: `HTTP 200` y `{"ok":true}`.

## 2d. Enlace de acceso al validar usuario (establecer contraseña, 6 h)

Al pulsar **Activar** en `/admin-usuarios`, el correo de aceptación incluye un
enlace único (`/establecer-password?token=...`) que **caduca a las 6 horas**.
El usuario define su contraseña y se guarda en `auth.users`.

1. **Migración** (tabla de tokens). Aplicar a producción:

   ```bash
   supabase db push --project-ref aoykpiievtadhwssugvs
   # o ejecutar supabase/migrations/20260605120000_create_password_setup_tokens.sql
   # en el SQL editor del dashboard.
   ```

2. **Función** `set-password` (ya incluida en `deploy-email-functions.sh`).

3. **Variable opcional** `APP_BASE_URL` (base del enlace; por defecto
   `https://brainnova.info`):

   ```bash
   supabase secrets set APP_BASE_URL='https://brainnova.info' --project-ref aoykpiievtadhwssugvs
   ```

> El token se valida en servidor (no usado y no caducado) antes de fijar la
> contraseña. La tabla `password_setup_tokens` tiene RLS sin políticas: solo el
> `service_role` (Edge Functions) la lee/escribe.

## 3. Checklist rápido

- [ ] `main` en GitHub actualizado
- [ ] EasyPanel rebuild hecho
- [ ] Secretos SMTP en Supabase
- [ ] Migración `password_setup_tokens` aplicada (`supabase db push`)
- [ ] Funciones desplegadas: `notify-user-created`, `notify-registration`, `notify-user-activated`, `set-password`, `create-user`
- [ ] (Opcional) `APP_BASE_URL` configurada
- [ ] Test `node scripts/test-notify-registration.mjs` OK
- [ ] Registro de prueba en `/auth` y correo recibido
- [ ] Validar un usuario en `/admin-usuarios` y comprobar enlace de contraseña
