-- Políticas de Storage para el bucket "informes" (idempotente).
-- El bucket "informes" debe existir: Storage → New bucket → Name: informes → Public: Sí
-- Ejecutar este SQL en Supabase (SQL Editor) si en producción la subida de PDFs falla.

DROP POLICY IF EXISTS "informes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "informes_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "informes_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "informes_authenticated_delete" ON storage.objects;

CREATE POLICY "informes_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'informes');

CREATE POLICY "informes_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'informes');

CREATE POLICY "informes_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'informes');

CREATE POLICY "informes_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'informes');
