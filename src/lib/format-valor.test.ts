import { describe, expect, it } from "vitest";
import { fmtNumeroCompacto, fmtValorUnidad } from "./format-valor";

describe("fmtValorUnidad", () => {
  it("EUR grandes en M€ y medianos en K€", () => {
    expect(fmtValorUnidad(1518520400, "EUR")).toBe("1518,5 M€");
    expect(fmtValorUnidad(295901000000, "EUR")).toBe("295.901 M€");
    expect(fmtValorUnidad(950000, "EUR")).toBe("950 K€");
    expect(fmtValorUnidad(12500, "EUR")).toBe("12,5 K€");
    expect(fmtValorUnidad(950, "EUR")).toBe("950 EUR");
  });

  it("otras unidades sin abreviar", () => {
    expect(fmtValorUnidad(61.9, "% Empresas")).toBe("61,9 % Empresas");
    expect(fmtValorUnidad(2224378, "empresas")).toBe("2.224.378 empresas");
  });

  it("sin unidad devuelve solo el número localizado", () => {
    expect(fmtValorUnidad(48.96679578)).toBe("49");
    expect(fmtValorUnidad(48.96679578, null)).toBe("49");
  });
});

describe("fmtNumeroCompacto", () => {
  it("abrevia miles y millones para ejes", () => {
    // es-ES no separa miles en números de 4 cifras: "4200", no "4.200"
    expect(fmtNumeroCompacto(4200000000)).toBe("4200 M");
    expect(fmtNumeroCompacto(295901000000)).toBe("295.901 M");
    expect(fmtNumeroCompacto(1518520400)).toBe("1518,5 M");
    expect(fmtNumeroCompacto(12500)).toBe("12,5 K");
    expect(fmtNumeroCompacto(85.6)).toBe("85,6");
  });
});
