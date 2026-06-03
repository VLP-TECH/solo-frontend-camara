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

## 3. Checklist rápido

- [ ] `main` en GitHub actualizado
- [ ] EasyPanel rebuild hecho
- [ ] Secretos SMTP en Supabase
- [ ] Funciones desplegadas: `notify-user-created`, `notify-registration`, `notify-user-activated`, `create-user`
- [ ] Test `node scripts/test-notify-registration.mjs` OK
- [ ] Registro de prueba en `/auth` y correo recibido
