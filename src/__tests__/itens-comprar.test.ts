import { describe, expect, it, beforeEach } from "vitest";
import {
  garantirMateriais,
  getCatalogo,
  parseItensComprar,
  registrarMaterial,
  stringifyItensComprar,
} from "@/lib/materiais-catalogo";

const store = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => store.clear());

describe("itens a comprar", () => {
  it("mantém id estável no round-trip", () => {
    const raw = stringifyItensComprar([
      { id: "abc", nome: 'Balão Verde 9"', quantidade: 3, observacao: "tema", materialKey: 'balao verde 9"' },
    ]);
    const a = parseItensComprar(raw);
    const b = parseItensComprar(stringifyItensComprar(a));
    expect(b[0].id).toBe("abc");
    expect(b[0].materialKey).toBe('balao verde 9"');
    expect(b[0].quantidade).toBe(3);
  });

  it("não incrementa o uso do material em re-salvamentos", () => {
    registrarMaterial("Balão Verde");
    garantirMateriais(["Balão verde", "BALAO  VERDE"]);
    const cat = getCatalogo();
    expect(cat).toHaveLength(1);
    expect(cat[0].usos).toBe(1);
  });
});
