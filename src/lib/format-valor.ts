// Formato compartido de valores con unidad para tablas, tarjetas y tooltips.

/** Formatea un valor con su unidad (ej. "61,9 % Empresas"). Enteros grandes
 * sin decimales; el resto con 1 decimal. Los importes en EUR se abrevian:
 * ≥1M → M€ (1.518.520.400 EUR → 1518,5 M€); ≥1.000 → K€ (950.000 EUR → 950 K€). */
export function fmtValorUnidad(valor: number, unidad?: string | null): string {
  const esEuro = !!unidad && /^(eur|euros?|€)$/i.test(unidad.trim());
  if (esEuro && Math.abs(valor) >= 1_000_000) {
    const millones = (valor / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 1 });
    return `${millones} M€`;
  }
  if (esEuro && Math.abs(valor) >= 1_000) {
    const miles = (valor / 1_000).toLocaleString("es-ES", { maximumFractionDigits: 1 });
    return `${miles} K€`;
  }
  const num = valor.toLocaleString("es-ES", {
    maximumFractionDigits: Math.abs(valor) >= 1000 ? 0 : 1,
  });
  return unidad ? `${num} ${unidad}` : num;
}

/** Número compacto para ejes de gráficas: 4.200.000.000 → "4.200 M"; 12.500 → "12,5 K". */
export function fmtNumeroCompacto(valor: number): string {
  if (!Number.isFinite(valor)) return "";
  if (Math.abs(valor) >= 1_000_000) {
    return `${(valor / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} M`;
  }
  if (Math.abs(valor) >= 1_000) {
    return `${(valor / 1_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} K`;
  }
  return valor.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}
