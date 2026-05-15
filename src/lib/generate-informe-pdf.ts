/**
 * Plantilla A4 determinista para informes creados desde el diálogo.
 * Todo el contenido va por jsPDF (texto + JPEG embebidos), sin pasar por HTML/html2canvas
 * porque en modales/overlays suele producir PDFs en blanco.
 */
import { jsPDF } from "jspdf";

// —— geometría A4 (mm)
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 16;
const INNER_W_MM = PAGE_W_MM - MARGIN_MM * 2;

// —— colores marca (RGB 0–255)
const COLOR_ACCENT: [number, number, number] = [12, 108, 139];
const COLOR_TEXT: [number, number, number] = [31, 41, 55];
const COLOR_MUTED: [number, number, number] = [107, 114, 128];

/** Tamaños de fuente del formulario sobre el papel */
const FONT = {
  org: { pt: 9.5 },
  title: { pt: 17 },
  meta: { pt: 10 },
  body: { pt: 10.5 },
  section: { pt: 12 },
  graficaTitulo: { pt: 10.5 },
  caption: { pt: 8.5 },
} as const;

function ptToMm(pt: number): number {
  return (pt * 25.4) / 72;
}

function lineStepMm(fontSizePt: number, factor = 1.42): number {
  return ptToMm(fontSizePt) * factor;
}

function scaleDimsToMax(sw: number, sh: number, maxSidePx: number): [number, number] {
  if (sw <= 0 || sh <= 0) return [0, 0];
  const s = Math.min(1, maxSidePx / Math.max(sw, sh));
  return [Math.max(1, Math.round(sw * s)), Math.max(1, Math.round(sh * s))];
}

/**
 * URL (Storage u otra origen público/CORS) → JPEG data URL estable para PDF.
 */
async function rasterUrlToJpegDataUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null;

  function encodeJw(
    nw: number,
    nh: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): string | null {
    const [tw, th] = scaleDimsToMax(nw, nh, 2000);
    if (!tw || !th) return null;
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tw, th);
    draw(ctx, tw, th);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    try {
      const out = encodeJw(bmp.width, bmp.height, (ctx, tw, th) =>
        ctx.drawImage(bmp, 0, 0, tw, th)
      );
      return out;
    } finally {
      bmp.close?.();
    }
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const timer = window.setTimeout(() => resolve(null), 15000);
      img.onload = () => {
        window.clearTimeout(timer);
        try {
          const out = encodeJw(img.naturalWidth, img.naturalHeight, (ctx, tw, th) =>
            ctx.drawImage(img, 0, 0, tw, th)
          );
          resolve(out);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(null);
      };
      img.src = url;
    });
  }
}

export type InformePdfSource = {
  title: string;
  description: string;
  date: string;
  category?: string;
  portada: {
    imagenUrl: string;
    organizacion: string;
    subtitulo: string;
    textoAdicional: string;
  };
  secciones: { titulo: string; contenido: string }[];
  graficas: { titulo: string; url: string }[];
};

/**
 * Adapta alto/ancho imagen intrínseca al rectángulo util A4 en mm,
 * preservando proporción (como object-fit contain).
 */
function fitImageMm(
  iwPx: number,
  ihPx: number,
  maxWidthMm: number,
  maxHeightMm: number
): { widthMm: number; heightMm: number } {
  if (iwPx <= 0 || ihPx <= 0) return { widthMm: 0, heightMm: 0 };
  const ar = ihPx / iwPx;
  let wMm = maxWidthMm;
  let hMm = wMm * ar;
  if (hMm > maxHeightMm) {
    hMm = maxHeightMm;
    wMm = hMm / ar;
  }
  return { widthMm: wMm, heightMm: hMm };
}

/** Construye el PDF A4 con una plantilla fija por bloques */
export async function generateInformePdfBlob(src: InformePdfSource): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = MARGIN_MM;
  const x = MARGIN_MM;
  const bottom = (): number => PAGE_H_MM - MARGIN_MM;
  const newPageIf = (reservedMm: number) => {
    if (y + reservedMm <= bottom()) return;
    doc.addPage();
    y = MARGIN_MM;
  };

  /** Escribe párrafos con partir de línea al ancho util */
  const writeParagraph = (
    raw: string,
    fontSizePt: number,
    opts?: { bold?: boolean; rgb?: [number, number, number] }
  ) => {
    const text = raw.replace(/\r\n/g, "\n").trim();
    if (!text) return;

    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(fontSizePt);
    const rgb = opts?.rgb ?? COLOR_TEXT;
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);

    const lines = doc.splitTextToSize(text, INNER_W_MM) as unknown as string[];
    const lh = lineStepMm(fontSizePt);

    for (const line of lines) {
      if (typeof line !== "string") continue;
      newPageIf(lh + 2);
      doc.text(line, x, y, { baseline: "top" });
      y += lh;
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
    y += 2.8;
  };

  const writeSectionHeading = (label: string, pt = FONT.section.pt) => {
    if (!label?.trim()) return;
    newPageIf(ptToMm(pt) + 12);
    y += pt === FONT.section.pt ? 4 : 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pt);
    doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    const lines = doc.splitTextToSize(label.trim(), INNER_W_MM) as unknown as string[];
    const lh = lineStepMm(pt);
    for (const line of lines) {
      newPageIf(lh + 2);
      doc.text(line, x, y, { baseline: "top" });
      y += lh;
    }
    doc.setDrawColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
    doc.setLineWidth(0.35);
    doc.line(x, y + 2, x + INNER_W_MM, y + 2);
    doc.setDrawColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
    y += 7;
    y += 7;
    doc.setFontSize(FONT.body.pt);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
  };

  /** Imagen dentro del contenido útil de A4; por defecto ancho hasta INNER_W_MM, alto hasta ~95 mm */
  const placeImageMm = async (url: string, maxHeightMm = 92) => {
    if (!url.trim()) return;
    const jpeg = await rasterUrlToJpegDataUrl(url.trim());
    if (!jpeg) {
      newPageIf(ptToMm(FONT.body.pt) * 3);
      doc.setFontSize(FONT.caption.pt);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      const msg =
        "(No se ha podido cargar la imagen; revisa URL o política CORS del storage.)";
      const failLines = doc.splitTextToSize(msg, INNER_W_MM) as unknown as string[];
      const capLh = lineStepMm(FONT.caption.pt);
      for (const line of failLines) {
        newPageIf(capLh + 2);
        doc.text(line, x, y, { baseline: "top" });
        y += capLh;
      }
      y += 2;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      return;
    }

    const props = doc.getImageProperties(jpeg);
    const { widthMm, heightMm } = fitImageMm(
      props.width,
      props.height,
      INNER_W_MM,
      Math.min(maxHeightMm, PAGE_H_MM - 2 * MARGIN_MM - ptToMm(32))
    );

    if (widthMm < 5 || heightMm < 5) return;

    newPageIf(heightMm + 14);
    // Borde muy suave opcional:
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.rect(x, y, widthMm, heightMm);

    doc.addImage(jpeg, "JPEG", x, y, widthMm, heightMm);

    doc.setDrawColor(...COLOR_TEXT);
    y += heightMm + 8;
  };

  // —— CABECERA (banda marca)
  doc.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
  doc.rect(0, 0, PAGE_W_MM, 5.5, "F");

  y = Math.max(MARGIN_MM, 21);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT.org.pt);
  doc.setTextColor(...COLOR_MUTED);
  const orgLine =
    doc.splitTextToSize(src.portada.organizacion.trim() || "—", INNER_W_MM) as unknown as string[];
  const orgLh = lineStepMm(FONT.org.pt);
  for (const line of orgLine) {
    doc.text(line, x, y, { baseline: "top" });
    y += orgLh;
  }
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_TEXT);

  writeParagraph(src.title, FONT.title.pt, { bold: true, rgb: COLOR_ACCENT });

  const metaPts: string[] = [`Fecha: ${src.date || "—"}`];
  if (src.category?.trim()) metaPts.push(`Categoría: ${src.category}`);
  metaPts.forEach((m) =>
    writeParagraph(m, FONT.meta.pt, {
      rgb: COLOR_MUTED,
    })
  );
  y -= 1;

  if (src.description?.trim())
    writeParagraph(src.description.trim(), FONT.body.pt);

  writeSectionHeading("Portada");

  if (src.portada.subtitulo.trim()) writeParagraph(src.portada.subtitulo.trim(), FONT.body.pt);
  if (src.portada.textoAdicional.trim()) writeParagraph(src.portada.textoAdicional.trim(), FONT.body.pt);

  if (src.portada.imagenUrl.trim()) {
    doc.setFontSize(FONT.caption.pt);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.setFont("helvetica", "italic");
    newPageIf(ptToMm(FONT.caption.pt) + 2);
    doc.text("Imagen de portada", x, y, { baseline: "top" });
    y += lineStepMm(FONT.caption.pt) + 3;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);

    await placeImageMm(src.portada.imagenUrl, 105);
  }

  for (const sec of src.secciones) {
    if (!sec.titulo.trim() && !sec.contenido.trim()) continue;

    writeSectionHeading(sec.titulo.trim() || "Sección");
    if (sec.contenido.trim()) writeParagraph(sec.contenido.trim(), FONT.body.pt);
  }

  for (const gr of src.graficas) {
    if (!gr.titulo.trim() && !gr.url.trim()) continue;

    y += 2;
    writeParagraph(gr.titulo.trim() || "Gráfica", FONT.graficaTitulo.pt, { bold: true });

    if (gr.url.trim()) await placeImageMm(gr.url, 88);
  }

  /** Pie paginador */
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(`Página ${i} / ${total}`, PAGE_W_MM / 2, PAGE_H_MM - 6, {
      align: "center",
      baseline: "bottom",
    });
  }

  return doc.output("blob") as Blob;
}
