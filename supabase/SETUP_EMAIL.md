# Correos de registro (SMTP / AWS SES)

El frontend **no** guarda credenciales SMTP. Todo el envío va por **Edge Functions** en Supabase (`aoykpiievtadhwssugvs`).

**AWS SES:** credenciales SMTP en secretos del proyecto (ya configurado por el dueño).

Si la cuenta SES está en **sandbox**, el correo al usuario solo llega a emails verificados o del dominio permitido; la **copia** a `contacto@brainnova.info` sí puede enviarse (mismo dominio que el remitente).

**Paso pendiente habitual:** redesplegar funciones tras cambios en código (ver abajo).

## Flujos

| Origen | Función | Correos |
|--------|---------|---------|
| Registro público `/auth` | `notify-user-created` (primario) o `notify-registration` (respaldo) | Bienvenida al usuario + **copia** del mismo correo a `contacto@brainnova.info` |
| Admin `/admin-usuarios` | `create-user` | Igual: bienvenida + copia a `contacto@brainnova.info` |

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

## Error 403 al hacer `supabase functions deploy`

Mensaje: *"Your account does not have the necessary privileges to access this endpoint"*.

**Causa:** la CLI está logueada con una cuenta que **no es Owner/Admin** del proyecto `aoykpiievtadhwssugvs` (Brainnova). En `supabase projects list` ese proyecto **no debe aparecer** en tu lista; solo lo puede desplegar quien tenga acceso en la organización del proyecto.

**Qué hacer:**

1. **Dueño del proyecto Brainnova** (cuenta que creó `aoykpiievtadhwssugvs`):
   - Supabase Dashboard → **Organization Settings → Members** → invitar tu usuario con rol **Owner** o **Administrator**, **o**
   - Clonar el repo, ejecutar en su máquina:
     ```bash
     supabase login
     supabase functions deploy notify-user-created --project-ref aoykpiievtadhwssugvs
     supabase functions deploy create-user --project-ref aoykpiievtadhwssugvs
     ```
2. Tras la invitación, en tu máquina: `supabase login` de nuevo y comprueba que `aoykpiievtadhwssugvs` sale en `supabase projects list` antes de desplegar.

3. **Alternativa (sin CLI local):** GitHub Actions en este repo (`.github/workflows/deploy-supabase-functions.yml`). El **Owner** de Supabase añade en GitHub → *Settings → Secrets and variables → Actions*:
   - `SUPABASE_ACCESS_TOKEN` — token personal en [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
   - `SUPABASE_PROJECT_REF` = `aoykpiievtadhwssugvs`  
   Luego: *Actions → Deploy Supabase Edge Functions (email) → Run workflow*.

El aviso `Docker is not running` **no** provoca el 403; el bloqueo es solo de permisos en la plataforma.

**Comprobar tu acceso ahora:**

```bash
supabase projects list | grep aoykpiievtadhwssugvs
```

Si no imprime nada, el 403 seguirá aunque hagas `supabase login` otra vez.

## Despliegue de funciones (obligatorio tras cambios en código)

Solo si tu usuario tiene acceso al proyecto:

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

Respuesta esperada: `{"ok":true}`. Si falta SMTP: `502` con detalle en `welcome` / `copy`.

## Logs

Dashboard → **Edge Functions** → `notify-registration` → **Logs** (errores SMTP, secretos faltantes, etc.).
