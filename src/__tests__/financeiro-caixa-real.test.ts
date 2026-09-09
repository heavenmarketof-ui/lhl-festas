import { describe, expect, it } from "vitest";
import { lancamentoEhRealizado } from "@/lib/financeiro-api";

describe("caixa realizado LHL", () => {
  const hoje = "2026-09-09";

  it("considera lançamentos passados e de hoje", () => {
    expect(lancamentoEhRealizado("2026-09-01", hoje)).toBe(true);
    expect(lancamentoEhRealizado("2026-09-09", hoje)).toBe(true);
  });

  it("não considera lançamento futuro como caixa realizado", () => {
    expect(lancamentoEhRealizado("2026-09-10", hoje)).toBe(false);
    expect(lancamentoEhRealizado("2026-10-01", hoje)).toBe(false);
  });
});
