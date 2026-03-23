# Edge Functions

## create-user

Crea usuarios desde admin-usuarios usando `auth.admin.createUser`, **sin cambiar la sesión** del administrador. Solo usuarios con rol admin/superadmin pueden llamarla. Tras crear el usuario, envía el correo de notificación.

## notify-user-created

Envía un correo a **contacto@brainnova.info** y **chaume@vlptech.es** cuando se crea un usuario (usado internamente por create-user).

### Configuración

1. **Postmark**: Crear cuenta en [postmarkapp.com](https://postmarkapp.com) y obtener un Server Token.
2. **Supabase Secrets**: Configurar el secreto en el proyecto:
   ```bash
   supabase secrets set POSTMARK_SERVER_TOKEN=xxxxxxxx
   ```
3. **Dominio (opcional)**: Para usar `noreply@brainnova.info` como remitente, verificar el sender signature/dominio en Postmark. Si no, se puede usar `FROM_EMAIL`:
   ```bash
   supabase secrets set FROM_EMAIL="Brainnova <tu-remitente-verificado@tudominio.com>"
   ```

### Despliegue

```bash
supabase functions deploy create-user
supabase functions deploy notify-user-created
```

### Prueba local

```bash
supabase functions serve notify-user-created --no-verify-jwt
```

Luego:
```bash
curl -X POST http://localhost:54321/functions/v1/notify-user-created \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","razonSocial":"Test SA","cif":"B12345678","role":"user"}'
```
