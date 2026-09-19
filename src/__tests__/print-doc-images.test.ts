import { describe, expect, it } from "vitest";
import { applyPdfImageDimensions } from "@/lib/print-doc";

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
