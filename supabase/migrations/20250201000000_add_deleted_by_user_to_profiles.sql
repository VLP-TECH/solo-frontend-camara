-- Flag de borrado por usuario: no se borra físicamente el registro,
-- se marca y se bloquea el acceso.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.profiles.deleted_by_user IS 'True si el usuario solicitó la baja; el registro se mantiene pero el acceso queda bloqueado.';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Fecha/hora en que el usuario solicitó la baja.';
