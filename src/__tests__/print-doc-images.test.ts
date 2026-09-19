import { describe, expect, it } from "vitest";
import { applyPdfImageDimensions, freezeComputedStyles } from "@/lib/print-doc";

describe("dimensões das imagens nos documentos PDF", () => {
  it("fixa largura e altura antes da captura", () => {
    const image = {
      dataset: { pdfWidth: "44", pdfHeight: "44" },
      style: {},
      width: 0,
      height: 0,
    };
    const root = {
      querySelectorAll: () => [image],
    } as unknown as ParentNode;

    applyPdfImageDimensions(root);

    expect(image.width).toBe(44);
    expect(image.height).toBe(44);
    expect(image.style).toEqual({
      width: "44px",
      minWidth: "44px",
      maxWidth: "44px",
      height: "44px",
      minHeight: "44px",
      maxHeight: "44px",
      objectFit: "contain",
    });
  });
});

describe("estilos do documento durante a captura", () => {
  it("copia o estilo calculado para inline antes de o html2canvas clonar", () => {
    const written: Record<string, string> = {};
    const child = {
      style: {
        setProperty: (property: string, value: string) => {
          written[property] = value;
        },
      },
    };
    const root = {
      querySelectorAll: () => [child],
      style: { setProperty: () => undefined },
    } as unknown as HTMLElement;
    const computed = {
      0: "display",
      1: "grid-template-columns",
      length: 2,
      item: (index: number) => ["display", "grid-template-columns"][index],
      getPropertyValue: (property: string) => property === "display" ? "grid" : "240px 480px",
      getPropertyPriority: () => "",
    } as unknown as CSSStyleDeclaration;

    freezeComputedStyles(root, () => computed);

    expect(written).toEqual({
      display: "grid",
      "grid-template-columns": "240px 480px",
    });
  });
});
