import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const ALVOS = [path.join(ROOT, "routes"), path.join(ROOT, "components")];
const IGNORAR = new Set([
  path.join(ROOT, "components", "ui", "button.tsx"),
]);

function arquivosTsx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return arquivosTsx(full);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [full] : [];
  });
}

function linhaDe(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function temAcao(attrs: string) {
  return (
    /\bonClick\s*=/.test(attrs) ||
    /\bonPointerDown\s*=/.test(attrs) ||
    /\bonMouseDown\s*=/.test(attrs) ||
    /\basChild\b/.test(attrs) ||
    /\btype\s*=\s*["']submit["']/.test(attrs) ||
    /\bform\s*=/.test(attrs)
  );
}

describe("integridade dos botões visíveis", () => {
  it("não deixa Button de ação sem click, link ou submit", () => {
    const suspeitos: string[] = [];
    for (const file of ALVOS.flatMap(arquivosTsx)) {
      if (IGNORAR.has(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      const re = /<Button\b([\s\S]*?)>/g;
      for (const match of source.matchAll(re)) {
        const attrs = match[1] || "";
        if (temAcao(attrs)) continue;
        // Componentes que apenas repassam props para Button são infraestrutura,
        // não um botão concreto de tela.
        if (/\.\.\.\s*props/.test(attrs)) continue;
        suspeitos.push(`${path.relative(process.cwd(), file)}:${linhaDe(source, match.index || 0)}`);
      }
    }
    expect(suspeitos, `Botões sem ação encontrada:\n${suspeitos.join("\n")}`).toEqual([]);
  });
});
