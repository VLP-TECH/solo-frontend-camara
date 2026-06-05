-- Marca de "contraseña ya establecida vía enlace de acceso" (un solo uso por usuario).
-- Una vez fijada, los enlaces de /establecer-password dejan de poder sobrescribir
-- la contraseña de ese usuario, aunque se genere un enlace nuevo al re-validarlo.
alter table public.profiles
  add column if not exists password_set_at timestamptz;
