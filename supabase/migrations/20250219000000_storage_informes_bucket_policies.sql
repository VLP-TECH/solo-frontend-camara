-- Políticas de Storage para el bucket "informes" (PDFs de informes).
-- El bucket "informes" debe crearse manualmente en Supabase Dashboard:
--   Storage → New bucket → Name: informes → Public: Sí
--
-- Lectura pública: cualquiera puede ver los PDFs (URL pública).
CREATE POLICY "informes_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'informes');

-- Subida: solo usuarios autenticados pueden subir (los admins suben desde la app).
CREATE POLICY "informes_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'informes');

-- Actualizar y reemplazar: para que upsert funcione al subir de nuevo.
CREATE POLICY "informes_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'informes');

CREATE POLICY "informes_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'informes');
