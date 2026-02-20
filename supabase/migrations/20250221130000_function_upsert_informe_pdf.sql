-- Función SQL para hacer upsert de pdf_url en informes sin depender del esquema exacto.
-- Esta función maneja internamente el upsert y evita problemas de PGRST204.

CREATE OR REPLACE FUNCTION upsert_informe_pdf(
  p_id text,
  p_pdf_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Intentar UPDATE primero
  UPDATE public.informes
  SET pdf_url = p_pdf_url
  WHERE id = p_id;
  
  -- Si no se actualizó ninguna fila, hacer INSERT
  IF NOT FOUND THEN
    INSERT INTO public.informes (id, pdf_url)
    VALUES (p_id, p_pdf_url)
    ON CONFLICT (id) DO UPDATE SET pdf_url = p_pdf_url;
  END IF;
END;
$$;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION upsert_informe_pdf(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_informe_pdf(text, text) TO anon;
