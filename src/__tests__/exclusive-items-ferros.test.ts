import { describe, expect, it } from "vitest";
import { DEFAULT_EXCLUSIVE_ITEMS, formatExclusiveItemParts } from "@/lib/exclusive-items";

describe("quantidade de ferros das estruturas", () => {
  it.each([
    ["painel-romano-2x1", " — 9 ferros"],
    ["painel-romano-22x15", " — 11 ferros"],
    ["painel-redondo-150-dourado", " — 11 ferros"],
    ["painel-redondo-150-preto", " — 6 ferros"],
  ])("mantém a composição cadastrada de %s", (id, expected) => {
    const item = DEFAULT_EXCLUSIVE_ITEMS.find((candidate) => candidate.id === id);

    expect(item).toBeDefined();
    expect(formatExclusiveItemParts(item!)).toBe(expected);
  });

  it("não acrescenta informação em itens sem estrutura desmontável", () => {
    expect(formatExclusiveItemParts({})).toBe("");
  });
});
