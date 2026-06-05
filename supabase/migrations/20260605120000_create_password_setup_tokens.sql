-- Tokens de un solo uso para que un usuario establezca su contraseña tras ser
-- validado por un admin en /admin-usuarios. El enlace de acceso caduca a las 6 horas.
--
-- Flujo:
--   1. Admin pulsa "Activar" -> Edge Function notify-user-activated genera un token,
--      lo guarda aquí (expires_at = now() + 6h) y envía el correo con el enlace.
--   2. El usuario abre /establecer-password?token=... y define su contraseña.
--   3. Edge Function set-password valida el token (no usado, no caducado),
--      fija la contraseña en auth.users y marca used_at.
create table if not exists public.password_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_setup_tokens_token
  on public.password_setup_tokens (token);
create index if not exists idx_password_setup_tokens_user_id
  on public.password_setup_tokens (user_id);

-- RLS activado y SIN políticas: solo el service_role (Edge Functions) puede
-- leer/escribir. Los clientes anon/authenticated no tienen acceso a estos tokens.
alter table public.password_setup_tokens enable row level security;
