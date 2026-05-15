import { supabase } from "@/integrations/supabase/client";

/** PostgREST PGRST204: columna no existe en caché (p. ej. tabla en español vs inglés). */
export function isInformesUnknownColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "PGRST204") return true;
  const m = String(err.message ?? "");
  return m.includes("Could not find the") && m.includes("column of 'informes'");
}

/**
 * Inserta fila en `informes` (flujo PDF). Producción puede usar columnas en español
 * y las migraciones locales en inglés. Probamos ambos esquemas.
 */
export async function insertInformeCompatible(params: {
  id: string;
  titulo: string;
  descripcion: string;
  fechaDisplay: string;
  pdfUrl: string;
}): Promise<{ error: { message: string; code?: string } | null }> {
  const { id, titulo, descripcion, fechaDisplay, pdfUrl } = params;
  const rowEn: Record<string, unknown> = {
    id,
    title: titulo,
    description: descripcion,
    date: fechaDisplay,
    pages: 0,
    category: "Informes",
    format: "PDF",
    pdf_url: pdfUrl,
  };
  const rowEs: Record<string, unknown> = {
    id,
    titulo,
    descripcion,
    fecha: fechaDisplay,
    pdf_url: pdfUrl,
  };

  let lastErr: { message: string; code?: string } | null = null;
  for (const row of [rowEn, rowEs]) {
    const { error } = await supabase.from("informes" as any).insert([row]);
    if (!error) return { error: null };
    lastErr = error;
    if (!isInformesUnknownColumnError(error)) return { error };
  }
  return { error: lastErr };
}

/**
 * Inserta fila al crear informe desde el diálogo (HTML/editor): sin columnas anidadas inexistentes.
 * Guarda portada/secciones/gráficas serializadas en `contenido` cuando la columna existe.
 */
export async function insertInformeCreateRow(params: {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  contenidoJson: string;
  /** URL pública del PDF en Storage (opcional). */
  pdfUrl?: string | null;
}): Promise<{ error: { message: string; code?: string } | null }> {
  const { id, titulo, descripcion, fecha, contenidoJson, pdfUrl } = params;
  const pdf = pdfUrl ?? null;

  const rowEsRich: Record<string, unknown> = {
    id,
    titulo,
    descripcion,
    fecha,
    pdf_url: pdf,
    contenido: contenidoJson,
  };
  const rowEsMinimal: Record<string, unknown> = {
    id,
    titulo,
    descripcion,
    fecha,
    pdf_url: pdf,
  };
  const rowEn: Record<string, unknown> = {
    id,
    title: titulo,
    description: descripcion,
    date: fecha,
    pages: 0,
    category: "Informes",
    format: "PDF",
    pdf_url: pdf,
  };

  let lastErr: { message: string; code?: string } | null = null;
  for (const row of [rowEsRich, rowEsMinimal, rowEn]) {
    const { error } = await supabase.from("informes" as any).insert([row]);
    if (!error) return { error: null };
    lastErr = error;
    if (!isInformesUnknownColumnError(error)) return { error };
  }
  return { error: lastErr };
}
