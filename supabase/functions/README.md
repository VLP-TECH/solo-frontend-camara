# Edge Functions

## create-user

Crea usuarios desde admin-usuarios usando `auth.admin.createUser`, **sin cambiar la sesión** del administrador. Solo usuarios con rol admin/superadmin pueden llamarla. Tras crear el usuario, envía el correo de notificación.

## notify-user-created

Envía un correo a **contacto@brainnova.info** y **chaume@vlptech.es** cuando se crea un usuario (usado internamente por `create-user`, también expuesto como endpoint independiente).

El envío se realiza por **SMTP (AWS SES)** usando la librería [`denomailer`](https://deno.land/x/denomailer). El módulo compartido vive en `supabase/functions/_shared/email.ts`.

### Configuración SMTP (AWS SES)

Datos del proveedor SMTP actual:

| Variable        | Valor                                       |
| --------------- | ------------------------------------------- |
| `SMTP_HOST`     | `email-smtp.eu-west-1.amazonaws.com`        |
| `SMTP_PORT`     | `587` (STARTTLS) — alternativa `465` (TLS)  |
| `SMTP_USER`     | Access Key ID **SMTP** de SES               |
| `SMTP_PASSWORD` | Secret SMTP de SES (NO la Secret Key de IAM)|
| `FROM_EMAIL`    | `Brainnova <contacto@brainnova.info>`       |

> Importante: el usuario y la contraseña deben ser las **credenciales SMTP** generadas en la consola de SES (Account dashboard → SMTP settings → Create SMTP credentials). NO sirven la Access Key/Secret de un usuario IAM normal.

> El remitente (`contacto@brainnova.info` o el dominio `brainnova.info`) debe estar **verificado** en SES, y la cuenta debe estar fuera del *sandbox* si se envía a destinatarios sin verificar.

### Configurar secretos en Supabase

```bash
supabase secrets set \
  SMTP_HOST=email-smtp.eu-west-1.amazonaws.com \
  SMTP_PORT=587 \
  SMTP_USER=AKIAXXXXXXXXXXXXXXXX \
  SMTP_PASSWORD='********' \
  FROM_EMAIL='Brainnova <contacto@brainnova.info>'
```

Para revisar los secretos configurados:

```bash
supabase secrets list
```

### Despliegue

```bash
supabase functions deploy create-user
supabase functions deploy notify-user-created
```

### Prueba local

Crea un fichero `.env.local` (no lo commitees) con las variables SMTP y arranca la función:

```bash
supabase functions serve notify-user-created --no-verify-jwt --env-file ./supabase/.env.local
```

Luego:

```bash
curl -X POST http://localhost:54321/functions/v1/notify-user-created \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","razonSocial":"Test SA","cif":"B12345678","role":"user"}'
```

### Migración desde Postmark

El envío anterior se hacía con la API HTTP de Postmark (`POSTMARK_SERVER_TOKEN`). Ya no se usa: puedes eliminar ese secreto si quieres limpiar:

```bash
supabase secrets unset POSTMARK_SERVER_TOKEN
```
