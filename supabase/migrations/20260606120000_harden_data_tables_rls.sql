-- Endurecer RLS de las tablas de datos: la ESCRITURA (insert/update/delete) queda
-- restringida a admin/superadmin; la LECTURA pública se mantiene (dashboards).
-- Antes existían políticas "WITH CHECK true" para public que permitían a cualquiera
-- (incluso anon) insertar. La carga por CSV desde /carga-datos la hacen admins
-- autenticados, así que con esto sigue funcionando y se cierra el agujero.

-- Helper inline: ¿el usuario actual es admin o superadmin?
--   exists(select 1 from profiles where user_id=auth.uid() and lower(role) in ('admin','superadmin'))

-- ============ datos_crudos ============
drop policy if exists "Allow insert and select datos_crudos" on public.datos_crudos;
drop policy if exists "Allow insert for data loading"        on public.datos_crudos;
drop policy if exists "Admins can manage datos_crudos"       on public.datos_crudos;
-- lectura: mantener "Anyone can view datos_crudos" (SELECT true) ya existente.
create policy "admin_write_datos_crudos" on public.datos_crudos
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')));

-- ============ datos_macro ============
drop policy if exists "Allow insert and select datos_macro" on public.datos_macro;
drop policy if exists "Allow insert for data loading"       on public.datos_macro;
drop policy if exists "Admins can manage datos_macro"       on public.datos_macro;
create policy "admin_write_datos_macro" on public.datos_macro
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')));

-- ============ resultado_indicadores ============
drop policy if exists "Allow insert and select resultado_indicadores" on public.resultado_indicadores;
drop policy if exists "Allow insert for data loading"                 on public.resultado_indicadores;
drop policy if exists "Admins can manage resultado_indicadores"       on public.resultado_indicadores;
-- lectura: mantener "Anyone can view resultado_indicadores" (SELECT true) ya existente.
create policy "admin_write_resultado_indicadores" on public.resultado_indicadores
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')));

-- ============ definiciones_indicadores ============
-- Solo tenía "Allow insert and select" (ALL true). La sustituimos por lectura
-- pública + escritura admin (mantiene los dashboards que leen la vista
-- definicion_indicadores, que se apoya en esta tabla).
drop policy if exists "Allow insert and select definiciones_indicadores" on public.definiciones_indicadores;
create policy "Anyone can view definiciones_indicadores" on public.definiciones_indicadores
  for select to public using (true);
create policy "admin_write_definiciones_indicadores" on public.definiciones_indicadores
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and lower(p.role) in ('admin','superadmin')));
