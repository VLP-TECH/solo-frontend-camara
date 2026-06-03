# Correos de registro (SMTP / AWS SES)

El frontend **no** guarda credenciales SMTP. Todo el envío va por **Edge Functions** en Supabase (`aoykpiievtadhwssugvs`).

**AWS SES:** credenciales SMTP en secretos del proyecto (ya configurado por el dueño).

Si la cuenta SES está en **sandbox**, solo se puede enviar a direcciones del dominio `brainnova.info` (p. ej. `contacto@brainnova.info`). Para añadir `chaume@vlptech.es` cuando salgáis de sandbox: secreto `NOTIFY_TEAM_EMAILS=chaume@vlptech.es`.

**Paso pendiente habitual:** redesplegar funciones tras cambios en código (ver abajo).

## Flujos

| Origen | Función | Correos |
|--------|---------|---------|
| Registro público `/auth` | `notify-user-created` (primario) o `notify-registration` (respaldo) | Bienvenida al usuario + aviso a `contacto@brainnova.info` (y `chaume@vlptech.es`) |
| Admin `/admin-usuarios` | `create-user` | Los mismos dos correos |

## Secretos (solo dueño del proyecto en Supabase)

Dashboard → **Project Settings → Edge Functions → Secrets**, o CLI con cuenta con permisos:

```bash
supabase secrets set \
  SMTP_HOST=email-smtp.eu-west-1.amazonaws.com \
  SMTP_PORT=587 \
  SMTP_USER='<SMTP_ACCESS_KEY_ID>' \
  SMTP_PASSWORD='<SMTP_SECRET>' \
  FROM_EMAIL='Brainnova <contacto@brainnova.info>'
```

Usar credenciales **SMTP de SES** (Create SMTP credentials), no la Secret Key IAM genérica.

## Despliegue de funciones (obligatorio tras cambios en código)

```bash
supabase login
chmod +x scripts/deploy-email-functions.sh
./scripts/deploy-email-functions.sh
```

O manualmente:

```bash
supabase functions deploy notify-user-created --project-ref aoykpiievtadhwssugvs
supabase functions deploy notify-registration --project-ref aoykpiievtadhwssugvs
supabase functions deploy create-user --project-ref aoykpiievtadhwssugvs
```

Sin redesplegar `notify-user-created` con la versión actual, el registro público solo enviará el aviso interno (versión antigua), no el correo de bienvenida al usuario.

## Prueba rápida

```bash
node scripts/test-notify-registration.mjs tu@email.com
```

```bash
curl -X POST "https://aoykpiievtadhwssugvs.supabase.co/functions/v1/notify-user-created" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{"email":"tu@email.com","firstName":"Test","razonSocial":"Test SA","cif":"B12345678","role":"user"}'
```

Respuesta esperada: `{"ok":true}`. Si falta SMTP: `502` con detalle en `welcome` / `notify`.

## Logs

Dashboard → **Edge Functions** → `notify-registration` → **Logs** (errores SMTP, secretos faltantes, etc.).
