-- Usar solo Supabase Storage para PDFs: dejar de apuntar a rutas locales que dan 404.
-- Las URLs que empiezan por /informes/ no existen en producción; se sustituyen por null
-- hasta que un admin suba el PDF desde la app (que lo guarda en Storage).
UPDATE public.informes
SET pdf_url = NULL
WHERE pdf_url IS NOT NULL
  AND pdf_url NOT LIKE 'http%'
  AND pdf_url <> '';
