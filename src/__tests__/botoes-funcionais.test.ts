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
    /\bform\s*=/.test(attrs) ||
    /\{\s*\.\.\.\s*[A-Za-z_$][\w$]*\s*\}/.test(attrs)
  );
}

function dentroDeTag(source: string, index: number, tag: string) {
  const before = source.slice(0, index);
  return before.lastIndexOf(`<${tag}`) > before.lastIndexOf(`</${tag}>`);
}

function dentroDeWrapperAcionavel(source: string, index: number) {
  // Button dentro de <a href=...> herda a navegação do link.
  if (dentroDeTag(source, index, "a")) return true;

  // Componentes Radix/Shadcn usam Trigger + asChild para transferir o evento
  // ao Button filho. O Button não precisa de onClick próprio.
  const wrappers = [
    "DropdownMenuTrigger",
    "DialogTrigger",
    "AlertDialogTrigger",
    "PopoverTrigger",
    "TooltipTrigger",
    "SheetTrigger",
    "DrawerTrigger",
    "CollapsibleTrigger",
  ];
  const before = source.slice(0, index);
  for (const tag of wrappers) {
    const open = before.lastIndexOf(`<${tag}`);
    const close = before.lastIndexOf(`</${tag}>`);
    if (open > close) {
      const trecho = before.slice(open, index);
      if (/\basChild\b/.test(trecho)) return true;
    }
  }
  return false;
}

describe("integridade dos botões visíveis", () => {
  it("não deixa Button de ação sem click, link, submit, props ou wrapper acionável", () => {
    const suspeitos: string[] = [];
    for (const file of ALVOS.flatMap(arquivosTsx)) {
      if (IGNORAR.has(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      const re = /<Button\b([\s\S]*?)>/g;
      for (const match of source.matchAll(re)) {
        const attrs = match[1] || "";
        const index = match.index || 0;
        if (temAcao(attrs)) continue;
        if (dentroDeWrapperAcionavel(source, index)) continue;
        suspeitos.push(`${path.relative(process.cwd(), file)}:${linhaDe(source, index)}`);
      }
    }
    expect(suspeitos, `Botões sem ação encontrada:\n${suspeitos.join("\n")}`).toEqual([]);
  });
});
