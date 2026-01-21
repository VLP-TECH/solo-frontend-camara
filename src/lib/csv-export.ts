// Utilidades para exportar datos a CSV

/**
 * Convierte un array de objetos a formato CSV
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Si no se proporcionan headers, usar las claves del primer objeto
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Crear la fila de encabezados
  const headerRow = csvHeaders.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",");
  
  // Crear las filas de datos
  const dataRows = data.map((row) =>
    csvHeaders
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '""';
        }
        // Escapar comillas y envolver en comillas
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  
  // Combinar headers y datos
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Descarga un string como archivo CSV
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Agregar BOM para Excel (UTF-8)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Exporta indicadores a CSV
 */
export function exportIndicadoresToCSV(indicadores: any[], dimensionNombre: string): void {
  const csvData = indicadores.map((ind) => ({
    "Nombre": ind.nombre || "",
    "Subdimensión": ind.subdimension || "",
    "Dimensión": ind.dimension || dimensionNombre,
    "Importancia": ind.importancia || "",
    "Fórmula": ind.formula || "",
    "Fuente": ind.fuente || "",
    "Origen": ind.origen_indicador || "",
    "Último Valor": ind.ultimoValor !== undefined ? ind.ultimoValor : "",
    "Último Período": ind.ultimoPeriodo || "",
    "Total Resultados": ind.totalResultados || 0,
  }));

  const csv = convertToCSV(csvData);
  const filename = `indicadores_${dimensionNombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Exporta datos de gráfico a CSV
 */
export function exportChartDataToCSV(
  data: any[],
  chartName: string,
  dimensionNombre: string
): void {
  if (!data || data.length === 0) {
    return;
  }

  const csv = convertToCSV(data);
  const filename = `grafico_${chartName}_${dimensionNombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Exporta datos históricos de un indicador a CSV
 */
export function exportHistoricDataToCSV(
  data: Array<{ periodo: number; valor: number }>,
  indicadorNombre: string
): void {
  if (!data || data.length === 0) {
    return;
  }

  const csvData = data.map((item) => ({
    "Período": item.periodo,
    "Valor": item.valor,
    "Indicador": indicadorNombre,
  }));

  const csv = convertToCSV(csvData);
  const filename = `historico_${indicadorNombre.replace(/\s+/g, "_").substring(0, 50)}_${new Date().toISOString().split("T")[0]}.csv`;
  downloadCSV(csv, filename);
}

