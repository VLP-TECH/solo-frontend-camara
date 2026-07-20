import { useState, useRef, ChangeEvent, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, AlertCircle, CheckCircle2, Info, Download } from "lucide-react";
import { useAppMenuItems } from "@/hooks/useAppMenuItems";
import FloatingCamaraLogo from "@/components/FloatingCamaraLogo";
import { downloadCSV, convertToCSV } from "@/lib/csv-export";
import { filterDuplicateRows, type DedupeColumn } from "@/lib/csv-dedupe";
import { useToast } from "@/hooks/use-toast";

// ───────────────────────────────────────────────────────────────────────────
// Configuración por tabla: columnas REALES del esquema, tipos, requeridos y
// estrategia de carga (append vs upsert). Mantener sincronizado con la BD.
// ───────────────────────────────────────────────────────────────────────────
type ColType = "text" | "int" | "numeric" | "date" | "bool";
interface ColSpec {
  name: string;
  type: ColType;
  required?: boolean;
  /** Decimales con los que la BD almacena la columna (solo numeric); usado para detectar duplicados. */
  scale?: number;
}
interface TableSpec {
  label: string;
  description: string;
  columns: ColSpec[];
  /** Columna PK para upsert. */
  pk: string;
  /** true si el PK lo genera la BD (secuencia): se omite del CSV salvo para actualizar. */
  pkAuto: boolean;
  example: Record<string, unknown>[];
}

const TABLE_SPECS = {
  resultado_indicadores: {
    label: "resultado_indicadores (resultados calculados — dashboards)",
    description:
      "Valores calculados por periodo y territorio. Es lo que muestran los dashboards. Sube sin columna 'id' para añadir filas nuevas; incluye 'id' solo si quieres actualizar filas existentes.",
    pk: "id",
    pkAuto: true,
    columns: [
      { name: "nombre_indicador", type: "text", required: true },
      { name: "valor_calculado", type: "numeric", scale: 6 },
      { name: "pais", type: "text" },
      { name: "provincia", type: "text" },
      { name: "periodo", type: "int", required: true },
      { name: "id_indicador", type: "int" },
      { name: "fecha_calculo", type: "date" },
      { name: "unidad_tipo", type: "text" },
      { name: "unidad_display", type: "text" },
      { name: "sector", type: "text" },
      { name: "tamano_empresa", type: "text" },
    ],
    example: [
      {
        nombre_indicador: "Densidad de startups",
        valor_calculado: 34.86,
        pais: "España",
        provincia: "Valencia",
        periodo: 2024,
        id_indicador: 4,
        fecha_calculo: "2024-01-15",
        unidad_tipo: "PORCENTAJE",
        unidad_display: "% Población 16-74 años",
        sector: "Servicios",
        tamano_empresa: "Grande",
      },
      {
        nombre_indicador: "Densidad de startups",
        valor_calculado: 28.1,
        pais: "España",
        provincia: "Alicante",
        periodo: 2024,
        id_indicador: 4,
        fecha_calculo: "2024-01-15",
        unidad_tipo: "PORCENTAJE",
        unidad_display: "% Población 16-74 años",
        sector: "Industria",
        tamano_empresa: "Mediana",
      },
    ],
  },
  definiciones_indicadores: {
    label: "definiciones_indicadores (alta/edición de indicadores)",
    description:
      "Catálogo de indicadores. La columna 'id' es obligatoria (no se autogenera) y 'nombre' es único: si subes un nombre ya existente, se actualiza esa definición (upsert por id).",
    pk: "id",
    pkAuto: false,
    columns: [
      { name: "id", type: "int", required: true },
      { name: "nombre", type: "text", required: true },
      { name: "id_subdimension", type: "int" },
      { name: "origen_indicador", type: "text" },
      { name: "formula", type: "text", required: true },
      { name: "importancia", type: "text", required: true },
      { name: "fuente", type: "text" },
    ],
    example: [
      {
        id: 1001,
        nombre: "Nuevo indicador de ejemplo",
        id_subdimension: 2,
        origen_indicador: "EIDES",
        formula: "RATIO",
        importancia: "Media",
        fuente: "https://ejemplo.org",
      },
    ],
  },
  datos_crudos: {
    label: "datos_crudos (datos fuente originales)",
    description:
      "Datos sin procesar por indicador. 'id' se autogenera: súbelo solo para actualizar. 'periodo' (año) es obligatorio. Las filas con procesado=TRUE (valores finales) se promocionan automáticamente a resultado_indicadores para que aparezcan en los dashboards.",
    pk: "id",
    pkAuto: true,
    columns: [
      { name: "nombre_indicador", type: "text" },
      { name: "valor", type: "numeric", scale: 2 },
      { name: "unidad", type: "text" },
      { name: "pais", type: "text" },
      { name: "provincia", type: "text" },
      { name: "periodo", type: "int", required: true },
      { name: "descripcion_dato", type: "text" },
      { name: "id_indicador", type: "int" },
      { name: "tamano_empresa", type: "text" },
      { name: "sector", type: "text" },
      { name: "procesado", type: "bool" },
    ],
    example: [
      {
        nombre_indicador: "Empresas con web propia",
        valor: 8.84,
        unidad: "%(empresas)",
        pais: "España",
        provincia: "Valencia",
        periodo: 2024,
        descripcion_dato: "Porcentaje de empresas con web",
        id_indicador: 75,
        tamano_empresa: "10 persons employed or more",
        sector: "Servicios",
        procesado: false,
      },
    ],
  },
  datos_macro: {
    label: "datos_macro (indicadores macroeconómicos)",
    description:
      "Datos macro por territorio. 'id' se autogenera: súbelo solo para actualizar. 'periodo' (año) es obligatorio.",
    pk: "id",
    pkAuto: true,
    columns: [
      { name: "valor", type: "numeric", scale: 2 },
      { name: "unidad", type: "text" },
      { name: "pais", type: "text" },
      { name: "provincia", type: "text" },
      { name: "periodo", type: "int", required: true },
      { name: "descripcion_dato", type: "text" },
      { name: "sector", type: "text" },
      { name: "tamano_empresa", type: "text" },
    ],
    example: [
      {
        valor: 218317,
        unidad: "poblacion",
        pais: "España",
        provincia: "Valencia",
        periodo: 2024,
        descripcion_dato: "Población total entre 16 y 74 años",
        sector: "",
        tamano_empresa: "",
      },
    ],
  },
} satisfies Record<string, TableSpec>;

type SupportedTable = keyof typeof TABLE_SPECS;

// ── Parser CSV con soporte de comillas y delimitador ; o , ────────────────────
function detectDelimiter(line: string): ";" | "," {
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  if (semis === 0 && commas === 0) return ";";
  return semis >= commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("El archivo CSV está vacío.");
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((l) => parseCsvLine(l, delimiter));
  return { headers, rows };
}

// ── Coerción/validación por tipo ──────────────────────────────────────────────
function coerce(value: string, type: ColType): { ok: boolean; value?: unknown; msg?: string } {
  const v = (value ?? "").trim();
  if (v === "") return { ok: true, value: null };
  switch (type) {
    case "int": {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, msg: `"${v}" no es un entero` };
      return { ok: true, value: n };
    }
    case "numeric": {
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n)) return { ok: false, msg: `"${v}" no es un número` };
      return { ok: true, value: n };
    }
    case "date": {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: true, value: v };
      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return { ok: true, value: `${m[3]}-${m[2]}-${m[1]}` };
      return { ok: false, msg: `"${v}" no es una fecha válida (usa AAAA-MM-DD)` };
    }
    case "bool": {
      const low = v.toLowerCase();
      if (["true", "1", "si", "sí", "t", "yes"].includes(low)) return { ok: true, value: true };
      if (["false", "0", "no", "f"].includes(low)) return { ok: true, value: false };
      return { ok: false, msg: `"${v}" no es booleano (true/false)` };
    }
    default:
      return { ok: true, value: v };
  }
}

// ── Catálogo (para validar datos_crudos contra las fórmulas/componentes) ───────
type CatalogoDatosCrudos = {
  /** id_indicador → { formula, nombre } */
  indById: Map<number, { formula: string; nombre: string }>;
  /** id_indicador → set de descripcion_dato (componentes) esperados por el catálogo */
  componentesPorId: Map<number, Set<string>>;
  /** Descripciones con rol RESULTADO: filas de valor final, legítimas con procesado=TRUE. */
  resultadosPorId: Map<number, Set<string>>;
};

async function fetchCatalogoDatosCrudos(): Promise<CatalogoDatosCrudos> {
  const indById = new Map<number, { formula: string; nombre: string }>();
  const componentesPorId = new Map<number, Set<string>>();
  const resultadosPorId = new Map<number, Set<string>>();
  try {
    // El cliente tipado no conoce estas tablas de referencia.
    const sb = supabase as unknown as {
      from: (t: string) => { select: (c: string) => Promise<{ data: Record<string, unknown>[] | null }> };
    };
    const defs = await sb.from("definicion_indicadores").select("id, nombre, formula");
    (defs.data || []).forEach((d) => {
      const id = Number(d.id);
      if (Number.isFinite(id)) indById.set(id, { formula: String(d.formula ?? ""), nombre: String(d.nombre ?? "") });
    });
    const comps = await sb.from("componentes_indicadores").select("id_indicador, descripcion_dato, rol");
    (comps.data || []).forEach((c) => {
      const id = Number(c.id_indicador);
      if (!Number.isFinite(id) || !c.descripcion_dato) return;
      const desc = String(c.descripcion_dato).trim();
      const target = String(c.rol ?? "").toUpperCase() === "RESULTADO" ? resultadosPorId : componentesPorId;
      const set = target.get(id) ?? new Set<string>();
      set.add(desc);
      target.set(id, set);
    });
  } catch {
    /* Catálogo no disponible → se omiten los checks de catálogo (no bloquea). */
  }
  return { indById, componentesPorId, resultadosPorId };
}

const DataUpload = () => {
  const navigate = useNavigate();
  const { roles, loading: permissionsLoading } = usePermissions();
  const { profile, isAdmin, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();

  const [selectedTable, setSelectedTable] = useState<SupportedTable | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState<string>("");
  const [avisoCatalogo, setAvisoCatalogo] = useState<string | null>(null);
  const [catalogWarnings, setCatalogWarnings] = useState<string[]>([]);
  const [warningsDialogOpen, setWarningsDialogOpen] = useState(false);
  const pendingUploadRef = useRef<{ payload: Record<string, unknown>[]; hasId: boolean } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rowsAffected, setRowsAffected] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const role = profile?.role?.toLowerCase().trim();
  const isAdminLike = isAdmin || roles.isAdmin || roles.isSuperAdmin || role === "admin" || role === "superadmin";
  const isLoading = permissionsLoading || profileLoading;
  const menuItems = useAppMenuItems();

  const spec = selectedTable ? TABLE_SPECS[selectedTable] : null;

  const resetMessages = () => {
    setError(null);
    setValidationErrors([]);
    setErrorDialogOpen(false);
    setAvisoCatalogo(null);
    setCatalogWarnings([]);
    setWarningsDialogOpen(false);
    pendingUploadRef.current = null;
    setSuccessMessage(null);
    setRowsAffected(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
    resetMessages();
  };

  const handleDownloadExample = (table: SupportedTable) => {
    const csv = convertToCSV(TABLE_SPECS[table].example as Record<string, unknown>[]);
    downloadCSV(csv, `plantilla_${table}_${new Date().toISOString().split("T")[0]}.csv`);
  };

  // Valida cabeceras + filas. Devuelve payload listo o lanza con lista de errores.
  const validate = (
    headers: string[],
    rows: string[][],
    tableSpec: TableSpec,
    catalog?: CatalogoDatosCrudos,
  ): { payload: Record<string, unknown>[]; hasId: boolean; warnings: string[] } => {
    const errs: string[] = [];
    // Avisos de coherencia con el catálogo: se muestran pero NO bloquean la subida.
    const warns: string[] = [];
    const allowed = new Set(tableSpec.columns.map((c) => c.name));
    if (tableSpec.pkAuto) allowed.add("id"); // 'id' opcional para actualizar

    // Cabeceras desconocidas
    const unknown = headers.filter((h) => h && !allowed.has(h));
    if (unknown.length) errs.push(`Columnas no reconocidas (corrígelas o usa la plantilla): ${unknown.join(", ")}`);

    // Requeridos ausentes
    const missing = tableSpec.columns.filter((c) => c.required && !headers.includes(c.name)).map((c) => c.name);
    if (missing.length) errs.push(`Faltan columnas obligatorias: ${missing.join(", ")}`);

    if (errs.length) {
      const e = new Error("validation");
      (e as Error & { list?: string[] }).list = errs;
      throw e;
    }

    const colType = new Map(tableSpec.columns.map((c) => [c.name, c.type] as const));
    colType.set("id", "int");
    const requiredCols = tableSpec.columns.filter((c) => c.required).map((c) => c.name);

    const payload: Record<string, unknown>[] = [];
    rows.forEach((cols, idx) => {
      const lineNo = idx + 2; // +1 cabecera, +1 base-1
      // Codificación: el carácter de reemplazo U+FFFD indica que el CSV no está
      // en UTF-8 (típico mojibake "Espa�a", "2M�"). Avisar para que se corrija.
      if (cols.some((c) => c.includes("�"))) {
        if (errs.length < 25)
          errs.push(`Fila ${lineNo}: caracteres corruptos por codificación. Guarda el CSV en UTF-8 (la "ñ" o el "€" se han dañado).`);
      }
      const obj: Record<string, unknown> = {};
      let empty = true;
      headers.forEach((h, i) => {
        if (!h || !allowed.has(h)) return;
        const raw = cols[i] ?? "";
        if (raw.trim() !== "") empty = false;
        const res = coerce(raw, colType.get(h) || "text");
        if (!res.ok) {
          if (errs.length < 25) errs.push(`Fila ${lineNo}, columna "${h}": ${res.msg}`);
          return;
        }
        obj[h] = res.value;
      });
      if (empty) return; // saltar filas vacías
      // requeridos no nulos
      for (const rc of requiredCols) {
        if (obj[rc] === null || obj[rc] === undefined) {
          if (errs.length < 25) errs.push(`Fila ${lineNo}: falta el valor obligatorio "${rc}"`);
        }
      }

      // ── Checks de catálogo (solo datos_crudos, si el catálogo está disponible) ──
      if (catalog && catalog.indById.size > 0) {
        const idInd = typeof obj.id_indicador === "number" ? obj.id_indicador : null;
        if (idInd != null) {
          const meta = catalog.indById.get(idInd);
          const comps = catalog.componentesPorId.get(idInd);
          const resultados = catalog.resultadosPorId.get(idInd);
          const tieneComponentes = !!comps && comps.size > 0;
          const valor = typeof obj.valor === "number" ? obj.valor : null;
          const desc = typeof obj.descripcion_dato === "string" ? obj.descripcion_dato.trim() : "";
          const esProcesado = obj.procesado === true;
          const nombre = meta?.nombre ?? "";
          // Las unidades "por cada 100" (suscripciones/habitantes) pueden superar 100 legítimamente.
          const permiteMas100 = /100\s*personas|100\s*habitantes|suscripciones/i.test(nombre);
          // Las filas componente (procesado=FALSE o unidad sin "%") traen recuentos absolutos
          // (numerador/denominador), no porcentajes: no se les aplica el límite de 100.
          const unidadRow = typeof obj.unidad === "string" ? obj.unidad : "";
          const esComponente = obj.procesado === false || (unidadRow !== "" && !unidadRow.includes("%"));

          // (3) Valor sospechoso para un PORCENTAJE
          if (
            meta?.formula === "PORCENTAJE" &&
            valor != null &&
            valor > 100 &&
            !permiteMas100 &&
            !esComponente &&
            warns.length < 25
          ) {
            warns.push(`Fila ${lineNo}: «${nombre}» es un porcentaje y esta fila trae ${valor}, que supera 100. Si la fila es un componente del cálculo (un recuento absoluto), márcala con procesado=FALSE y una unidad sin «%»; si de verdad es el porcentaje final, revisa la escala (¿está multiplicado ×10 o ×100?).`);
          }

          // (1) El catálogo espera este indicador por componentes (procesado=FALSE).
          // Si la descripción figura en el catálogo como RESULTADO, la fila es el
          // valor final legítimo y no genera aviso.
          const esResultadoConocido = !!resultados && desc !== "" && resultados.has(desc);
          if (tieneComponentes && esProcesado && !esResultadoConocido && warns.length < 25) {
            warns.push(`Fila ${lineNo}: según el catálogo, «${nombre}» se calcula a partir de componentes; lo habitual es enviar los componentes con procesado=FALSE y dejar el cálculo a la plataforma. Si esta fila ya es el valor final calculado, puedes ignorar este aviso.`);
          }

          // (2) descripcion_dato no coincide con ningún componente del catálogo
          if (tieneComponentes && desc && !comps!.has(desc) && !esResultadoConocido && warns.length < 25) {
            warns.push(`Fila ${lineNo}: descripcion_dato "${desc}" no figura entre los componentes que el catálogo espera para «${nombre}» (${[...comps!].map((c) => `"${c}"`).join(" / ")}). Comprueba que no sea una errata; si es un componente nuevo, este aviso es solo informativo.`);
          }
        }
      }

      payload.push(obj);
    });

    if (errs.length) {
      const e = new Error("validation");
      (e as Error & { list?: string[] }).list = errs;
      throw e;
    }
    if (payload.length === 0) throw new Error("No hay filas de datos válidas en el CSV.");

    return { payload, hasId: headers.includes("id"), warnings: warns };
  };

  // Lee las filas existentes de la tabla (paginado) para detectar duplicados en modo insert.
  // Filtra por nombre_indicador o periodo cuando el CSV los trae, para no descargar la tabla entera.
  const fetchExistingRows = async (
    table: SupportedTable,
    columns: DedupeColumn[],
    payload: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> => {
    const filterCol = ["nombre_indicador", "periodo"].find(
      (c) => columns.some((k) => k.name === c) && payload.some((r) => r[c] != null),
    );
    const filterVals = filterCol
      ? [...new Set(payload.map((r) => r[filterCol]).filter((v) => v != null))]
      : [];

    const pageSize = 1000;
    const existing: Record<string, unknown>[] = [];
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(table as never)
        .select(columns.map((c) => c.name).join(","))
        .range(from, from + pageSize - 1);
      if (filterCol && filterVals.length) query = query.in(filterCol, filterVals as never[]);
      const { data, error } = await query;
      if (error) throw new Error(`No se pudieron comprobar duplicados: ${error.message}`);
      existing.push(...((data as unknown as Record<string, unknown>[]) || []));
      if (!data || data.length < pageSize) break;
    }
    return existing;
  };

  const handleUpload = async () => {
    resetMessages();
    if (!isAdminLike) return setError("Solo los administradores pueden subir datos.");
    if (!selectedTable || !spec) return setError("Selecciona primero la tabla de destino.");
    if (!file) return setError("Selecciona un archivo CSV.");
    if (!file.name.toLowerCase().endsWith(".csv")) return setError("El archivo debe tener extensión .csv");

    try {
      setUploading(true);
      const text = await file.text();
      const { headers, rows } = parseCsv(text);

      // Para datos_crudos, cargamos el catálogo (fórmulas + componentes) para
      // validar contra él (procesado, descripcion_dato, valores imposibles).
      const catalog =
        selectedTable === "datos_crudos" ? await fetchCatalogoDatosCrudos() : undefined;

      // Si para datos_crudos no hay catálogo de componentes, avisamos EN PANTALLA
      // de que los checks de 'procesado' y 'descripcion_dato' no se han podido ejecutar.
      if (selectedTable === "datos_crudos") {
        const sinComponentes =
          !catalog ||
          catalog.indById.size === 0 ||
          [...catalog.componentesPorId.values()].every((s) => s.size === 0);
        setAvisoCatalogo(
          sinComponentes
            ? "Aviso: no se ha podido validar 'procesado' ni 'descripcion_dato' contra el catálogo de componentes (no disponible en la base de datos). Revisa esos campos manualmente antes de subir."
            : null,
        );
      }

      const { payload, hasId, warnings } = validate(headers, rows, spec, catalog);
      setCatalogWarnings(warnings);

      // Con avisos de catálogo: pausar y pedir el OK del usuario antes de subir.
      if (warnings.length > 0) {
        pendingUploadRef.current = { payload, hasId };
        setWarningsDialogOpen(true);
        return;
      }

      await performUpload(payload, hasId);
    } catch (err) {
      const list = (err as Error & { list?: string[] }).list;
      if (list?.length) {
        setError("El CSV no pasó la validación. Corrige estos puntos y vuelve a intentarlo:");
        setValidationErrors(list);
        setErrorDialogTitle("El CSV tiene errores");
      } else {
        setError((err as Error).message || "Error al procesar el CSV.");
        setValidationErrors([]);
        setErrorDialogTitle("No se pudo procesar el CSV");
      }
      setErrorDialogOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // Promociona a resultado_indicadores los valores finales (procesado=TRUE) de una
  // subida a datos_crudos, para que los dashboards los muestren sin paso manual.
  // Deduplica contra lo existente: re-subir el mismo CSV no duplica resultados.
  const promoteProcessedToResultados = async (
    rows: Record<string, unknown>[],
  ): Promise<{ inserted: number; skipped: number; errors: string[] }> => {
    const finales = rows.filter(
      (r) => r.procesado === true && r.valor != null && typeof r.nombre_indicador === "string" && r.nombre_indicador,
    );
    if (finales.length === 0) return { inserted: 0, skipped: 0, errors: [] };

    const hoy = new Date().toISOString().slice(0, 10);
    const mapped = finales.map((r) => ({
      nombre_indicador: r.nombre_indicador,
      valor_calculado: r.valor,
      pais: r.pais ?? null,
      provincia: r.provincia ?? null,
      periodo: r.periodo,
      id_indicador: r.id_indicador ?? null,
      fecha_calculo: hoy,
      unidad_tipo: typeof r.unidad === "string" && r.unidad.includes("%") ? "PORCENTAJE" : null,
      unidad_display: r.unidad ?? null,
      sector: r.sector ?? null,
      tamano_empresa: r.tamano_empresa ?? null,
    }));

    // Clave de deduplicación sin fecha_calculo ni unidades: idempotente entre re-subidas.
    const keyCols: DedupeColumn[] = [
      { name: "nombre_indicador", type: "text" },
      { name: "valor_calculado", type: "numeric", scale: 6 },
      { name: "pais", type: "text" },
      { name: "provincia", type: "text" },
      { name: "periodo", type: "int" },
      { name: "id_indicador", type: "int" },
      { name: "sector", type: "text" },
      { name: "tamano_empresa", type: "text" },
    ];
    const existing = await fetchExistingRows("resultado_indicadores", keyCols, mapped);
    const { fresh, skipped } = filterDuplicateRows(mapped, existing, keyCols);
    if (fresh.length === 0) return { inserted: 0, skipped, errors: [] };

    const errors: string[] = [];
    let inserted = 0;
    for (let i = 0; i < fresh.length; i += 500) {
      const chunk = fresh.slice(i, i + 500);
      const query = (supabase.from("resultado_indicadores" as never) as never) as {
        insert: (rows: unknown[]) => { select: () => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
      };
      const resp = await query.insert(chunk).select();
      if (resp.error) errors.push(resp.error.message);
      else inserted += resp.data?.length || chunk.length;
    }
    return { inserted, skipped, errors };
  };

  // Sube el payload ya validado (deduplicación + insert/upsert por bloques).
  const performUpload = async (payload: Record<string, unknown>[], hasId: boolean) => {
    if (!selectedTable || !spec) return;
    try {
      setUploading(true);

      // Estrategia: upsert si el PK viene en el CSV (o el PK no es autogenerado); si no, insert.
      const useUpsert = hasId || !spec.pkAuto;

      // En modo insert no hay PK que evite duplicados: omitir filas idénticas a las
      // ya existentes (numéricos comparados a la escala con la que los guarda la BD).
      let rowsToWrite = payload;
      let skippedDuplicates = 0;
      if (!useUpsert) {
        const dedupeCols = spec.columns as DedupeColumn[];
        const existing = await fetchExistingRows(selectedTable, dedupeCols, payload);
        const result = filterDuplicateRows(payload, existing, dedupeCols);
        rowsToWrite = result.fresh;
        skippedDuplicates = result.skipped;
      }

      if (rowsToWrite.length === 0) {
        const msg = `Sin cambios: las ${skippedDuplicates} filas del CSV ya existen en "${selectedTable}".`;
        setSuccessMessage(msg);
        setRowsAffected(0);
        toast({ title: "Sin filas nuevas", description: msg });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        return;
      }

      const chunkSize = 500;
      let affected = 0;
      const errors: string[] = [];

      for (let i = 0; i < rowsToWrite.length; i += chunkSize) {
        const chunk = rowsToWrite.slice(i, i + chunkSize);
        const n = Math.floor(i / chunkSize) + 1;
        try {
          // El cliente tipado no conoce estas tablas administrativas:
          const query = (supabase.from(selectedTable as never) as never) as {
            insert: (rows: unknown[]) => { select: () => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }> };
            upsert: (rows: unknown[], opts: { onConflict: string }) => { select: () => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }> };
          };
          const resp = useUpsert
            ? await query.upsert(chunk, { onConflict: spec.pk }).select()
            : await query.insert(chunk).select();

          if (resp.error) {
            errors.push(`Bloque ${n}: ${resp.error.message}`);
          } else {
            affected += resp.data?.length || chunk.length;
          }
        } catch (e) {
          errors.push(`Bloque ${n}: ${(e as Error).message || "error"}`);
        }
      }

      // Promoción automática: los valores finales de datos_crudos pasan a
      // resultado_indicadores para que los dashboards (radar, malla, filtros)
      // ofrezcan también los nuevos periodos e indicadores.
      let promoNote = "";
      if (affected > 0 && selectedTable === "datos_crudos") {
        try {
          const promo = await promoteProcessedToResultados(rowsToWrite);
          if (promo.errors.length) errors.push(...promo.errors.map((m) => `Promoción a resultado_indicadores: ${m}`));
          if (promo.inserted > 0) {
            promoNote = ` ${promo.inserted} valor(es) finales promocionados a resultado_indicadores (dashboards)${promo.skipped > 0 ? `; ${promo.skipped} ya estaban` : ""}.`;
          } else if (promo.skipped > 0) {
            promoNote = ` Los ${promo.skipped} valores finales ya estaban en resultado_indicadores.`;
          }
        } catch (e) {
          errors.push(`Promoción a resultado_indicadores: ${(e as Error).message || "error"}`);
        }
      }

      if (affected > 0) {
        setRowsAffected(affected);
        const verb = useUpsert ? "insertadas/actualizadas" : "insertadas";
        const dupNote = skippedDuplicates > 0 ? ` ${skippedDuplicates} duplicada(s) omitida(s).` : "";
        const msg = errors.length
          ? `${affected} filas ${verb} en "${selectedTable}". ${errors.length} incidencia(s).${dupNote}${promoNote}`
          : `✅ ${affected} filas ${verb} correctamente en "${selectedTable}".${dupNote}${promoNote}`;
        setSuccessMessage(msg);
        if (errors.length) {
          setValidationErrors(errors);
          setErrorDialogTitle("Subida parcial: algunos bloques fallaron");
          setErrorDialogOpen(true);
        }
        toast({ title: errors.length ? "Subida parcial" : "Subida exitosa", description: msg });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
      } else {
        setError("No se insertó ninguna fila.");
        setValidationErrors(errors);
        setErrorDialogTitle("No se insertó ninguna fila");
        setErrorDialogOpen(true);
      }
    } catch (err) {
      setError((err as Error).message || "Error al subir los datos.");
      setValidationErrors([]);
      setErrorDialogTitle("No se pudo completar la subida");
      setErrorDialogOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // El usuario acepta subir pese a los avisos del catálogo.
  const confirmUploadWithWarnings = async () => {
    setWarningsDialogOpen(false);
    const pending = pendingUploadRef.current;
    pendingUploadRef.current = null;
    if (pending) await performUpload(pending.payload, pending.hasId);
  };

  const cancelUploadWithWarnings = () => {
    setWarningsDialogOpen(false);
    pendingUploadRef.current = null;
    toast({
      title: "Subida cancelada",
      description: "No se ha subido ninguna fila. Puedes corregir el CSV y volver a intentarlo.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0c6c8b] mx-auto mb-4" />
              <p className="text-muted-foreground">Verificando permisos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdminLike) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Acceso restringido
            </CardTitle>
            <CardDescription>
              Solo los usuarios con rol administrador o superadmin pueden acceder a la carga de datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Rol actual: {profile?.role || "No disponible"}</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Volver al dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <FloatingCamaraLogo />

      {/* Aviso emergente cuando el CSV tiene problemas */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorDialogTitle || "El CSV tiene errores"}
            </DialogTitle>
            <DialogDescription>
              {error || "Se han detectado problemas en el archivo. Corrige estos puntos y vuelve a subirlo."}
            </DialogDescription>
          </DialogHeader>
          {validationErrors.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-red-700 max-h-72 overflow-y-auto">
              {validationErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación cuando hay avisos de catálogo: no son errores, se pide el OK antes de subir */}
      <Dialog open={warningsDialogOpen} onOpenChange={(open) => { if (!open) cancelUploadWithWarnings(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Info className="h-5 w-5" />
              Revisa estos avisos antes de subir
            </DialogTitle>
            <DialogDescription>
              No son errores: el CSV es válido y se puede subir. Solo hay filas que conviene revisar por si
              hubiera un error de escala o una errata. Puedes subir igualmente o cancelar para corregirlas.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 space-y-1 text-sm text-amber-800 max-h-72 overflow-y-auto">
            {catalogWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={cancelUploadWithWarnings}>
              Cancelar
            </Button>
            <Button onClick={confirmUploadWithWarnings} className="bg-amber-600 hover:bg-amber-700 text-white">
              Subir igualmente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gray-100 flex">
        <aside className="hidden md:flex w-64 bg-[#0c6c8b] text-white flex-col">
          <div className="p-6">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = item.active;
                const disabled = item.disabled;
                return (
                  <button
                    key={item.label}
                    onClick={() => !disabled && item.href && navigate(item.href)}
                    disabled={disabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      active ? "bg-[#0a5a73] text-white" : disabled ? "text-blue-300 opacity-50 cursor-not-allowed" : "text-blue-100 hover:bg-[#0a5a73]/50"
                    }`}
                    style={active ? { borderLeft: "4px solid #4FD1C7" } : {}}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto p-6">
            <p className="text-xs text-blue-200">Versión 2026</p>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="bg-[#0c6c8b] text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Carga de datos (CSV)</h2>
          </header>

          <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-50">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-[#0c6c8b]" />
                    Subir CSV a la base de datos
                  </CardTitle>
                  <CardDescription>
                    Selecciona la tabla de destino y el archivo CSV. Descarga la plantilla de esa tabla para
                    asegurar que las columnas coinciden con la base de datos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Tabla de destino</Label>
                    <Select value={selectedTable} onValueChange={(v) => { setSelectedTable(v as SupportedTable); resetMessages(); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la tabla donde cargar los datos" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TABLE_SPECS) as SupportedTable[]).map((t) => (
                          <SelectItem key={t} value={t}>{TABLE_SPECS[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {spec && (
                      <Alert className="bg-muted/60">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-sm">Cómo se cargan estos datos</AlertTitle>
                        <AlertDescription className="text-xs space-y-2">
                          <p>{spec.description}</p>
                          <p>
                            <span className="font-medium">Columnas válidas:</span>{" "}
                            {spec.columns.map((c) => `${c.name}${c.required ? "*" : ""}`).join(", ")}
                            {spec.pkAuto ? "  (id opcional)" : ""}
                          </p>
                          <p className="text-muted-foreground">* = obligatoria</p>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadExample(selectedTable as SupportedTable)}>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar plantilla de {selectedTable}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Archivo CSV</Label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <Input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Seleccionar CSV
                      </Button>
                      <span className="text-sm text-muted-foreground truncate">
                        {file ? file.name : "Ningún archivo seleccionado"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Primera fila = nombres de columnas. Separador ; o , (autodetectado). Decimales con . o ,.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={handleUpload} disabled={uploading || !file || !selectedTable} className="bg-[#0c6c8b] hover:bg-[#0a5a73]">
                      {uploading ? "Procesando..." : "Validar y subir"}
                    </Button>
                  </div>

                  {avisoCatalogo && (
                    <Alert className="border-amber-300 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800">Validación parcial</AlertTitle>
                      <AlertDescription className="text-amber-800">{avisoCatalogo}</AlertDescription>
                    </Alert>
                  )}

                  {catalogWarnings.length > 0 && (
                    <Alert className="border-amber-300 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800">
                        Avisos del catálogo ({catalogWarnings.length}) — no son errores
                      </AlertTitle>
                      <AlertDescription className="text-amber-800">
                        <p className="text-xs mb-2">
                          Estos avisos no invalidan el CSV; solo señalan filas que conviene revisar por si
                          hubiera un error de escala o una errata:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-xs max-h-48 overflow-y-auto">
                          {catalogWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Detalle ({validationErrors.length})</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-4 space-y-1 text-xs max-h-48 overflow-y-auto">
                          {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {successMessage && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle>Resultado</AlertTitle>
                      <AlertDescription>
                        {successMessage}
                        {rowsAffected !== null && <span className="block text-xs mt-1">Filas afectadas: <span className="font-semibold">{rowsAffected}</span></span>}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DataUpload;
