/**
 * Utilidad para leer archivos CSV con codificación correcta
 * Maneja automáticamente la detección de codificación (UTF-8, Windows-1252, ISO-8859-1)
 */
export async function fetchCSVWithEncoding(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  
  // Intentar decodificar como UTF-8 primero
  try {
    const utf8Text = new TextDecoder('utf-8', { fatal: true }).decode(arrayBuffer);
    // Verificar si hay caracteres de reemplazo (indicador de codificación incorrecta)
    if (!utf8Text.includes('\uFFFD')) {
      return utf8Text;
    }
  } catch {
    // UTF-8 falló, continuar con otras codificaciones
  }
  
  // Intentar Windows-1252 (común en archivos CSV de Windows/Excel)
  try {
    return new TextDecoder('windows-1252').decode(arrayBuffer);
  } catch {
    // Si falla, intentar ISO-8859-1 (Latin-1)
    try {
      return new TextDecoder('iso-8859-1').decode(arrayBuffer);
    } catch {
      // Último recurso: usar UTF-8 aunque tenga errores
      return new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
    }
  }
}

/**
 * Parsea una línea CSV separada por punto y coma
 */
export function parseCSVLine(line: string): string[] {
  return line.split(';').map(cell => cell.trim());
}




