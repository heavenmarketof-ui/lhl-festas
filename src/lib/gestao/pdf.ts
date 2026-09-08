// ============================================================================
// GESTÃO — EXPORTAÇÃO PDF (A4 real, página por página). READ-ONLY.
// Captura cada elemento `.a4-page` separadamente para nunca cortar gráficos.
// ============================================================================

export const A4_W = 794;  // px @96dpi
export const A4_H = 1123; // px @96dpi

export async function exportPagesToPdf(container: HTMLElement, filename: string): Promise<void> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>(".a4-page"));
  if (!pages.length) throw new Error("Nenhuma página para exportar.");

  const [h2cMod, jspdfMod] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const html2canvas: any = (h2cMod as any).default ?? h2cMod;
  const JsPDFCtor: any = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
  if (typeof html2canvas !== "function" || typeof JsPDFCtor !== "function") {
    throw new Error("Bibliotecas de PDF indisponíveis.");
  }

  try { await (document as any).fonts?.ready; } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 350));

  const pdf = new JsPDFCtor({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: A4_W,
      height: A4_H,
      windowWidth: A4_W,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, pageW, pageH);
  }

  const blob: Blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
