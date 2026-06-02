# Correos de registro (SMTP / AWS SES)

El frontend **no** guarda credenciales SMTP. Todo el envío va por **Edge Functions** en Supabase (`aoykpiievtadhwssugvs`).

## Flujos

| Origen | Función | Correos |
|--------|---------|---------|
| Registro público `/auth` | `notify-registration` | Bienvenida al usuario + aviso a `contacto@brainnova.info` (y `chaume@vlptech.es`) |
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
supabase link --project-ref aoykpiievtadhwssugvs
supabase functions deploy notify-registration
supabase functions deploy create-user
supabase functions deploy notify-user-created
```

Sin `notify-registration` desplegada, el registro público **no enviará** correos (el alta en Auth sigue funcionando).

## Prueba rápida

```bash
curl -X POST "https://aoykpiievtadhwssugvs.supabase.co/functions/v1/notify-registration" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{"email":"tu@email.com","firstName":"Test","razonSocial":"Test SA","cif":"B12345678","role":"user"}'
```

Respuesta esperada: `{"ok":true}`. Si falta SMTP: `502` con detalle en `welcome` / `notify`.

## Logs

Dashboard → **Edge Functions** → `notify-registration` → **Logs** (errores SMTP, secretos faltantes, etc.).
