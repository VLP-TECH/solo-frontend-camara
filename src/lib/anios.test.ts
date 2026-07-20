import { describe, expect, it } from "vitest";
import { ANIO_MAX, ANIO_MIN, buildAnioOptions } from "./anios";

describe("buildAnioOptions", () => {
  it("sin datos: ofrece el rango garantizado completo, descendente", () => {
    const opts = buildAnioOptions();
    expect(opts[0]).toBe(String(ANIO_MAX));
    expect(opts[opts.length - 1]).toBe(String(ANIO_MIN));
    expect(opts).toContain("2025");
    expect(opts).toContain("2026");
  });

  it("une los años de los datos con el rango garantizado, sin duplicados", () => {
    const opts = buildAnioOptions([2012, 2024, 2024, "2015"]);
    expect(opts).toContain("2012");
    expect(opts).toContain("2015");
    expect(opts).toContain("2026");
    expect(new Set(opts).size).toBe(opts.length);
  });

  it("ignora valores no numéricos o fuera de rango", () => {
    const opts = buildAnioOptions(["abc", 0, 99999]);
    expect(opts).toEqual(buildAnioOptions());
  });

  it("acepta null y listas vacías", () => {
    expect(buildAnioOptions(null)).toEqual(buildAnioOptions([]));
  });
});
