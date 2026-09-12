// ============================================================================
// Impressão e geração de PDF de documentos A4 (contrato, checklist).
// Usa iframe oculto para imprimir e html2canvas-pro + jsPDF para download.
// ============================================================================

function collectStyles(): string {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function waitForStyles(doc: Document): Promise<void> {
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  await Promise.all(links.map((link) => {
    // Folha já carregada/cachada.
    if (link.sheet) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
      setTimeout(done, 5000);
    });
  }));
  try { await (doc as any).fonts?.ready; } catch { /* ignore */ }
}

async function waitForAssets(root: ParentNode): Promise<void> {
  const ownerDoc = root instanceof Document ? root : (root as Node).ownerDocument || document;
  await waitForStyles(ownerDoc);
  try { await (ownerDoc as any).fonts?.ready; } catch { /* ignore */ }
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    setTimeout(resolve, 5000);
  })));
  await nextPaint();
}

export async function printElement(
  el: HTMLElement,
  opts?: { title?: string; margin?: string },
): Promise<void> {
  await waitForAssets(el);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("sandbox", "allow-modals allow-same-origin");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const margin = /^[0-9.]+(?:mm|cm|in|px)$/.test(opts?.margin || "") ? opts!.margin! : "12mm";
  const safeTitle = escapeHtml(opts?.title || document.title);
  const safeBase = escapeHtml(document.baseURI);
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<base href="${safeBase}">` +
      `<title>${safeTitle}</title>` +
      `${collectStyles()}` +
      `<style>@page{size:A4;margin:${margin}}` +
      `html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
      `*,*::before,*::after{box-sizing:border-box}` +
      `.no-print{display:none!important}` +
      `.a4-sheet,.a4-checklist{box-shadow:none!important;border:0!important;margin:0!important;width:100%!important;max-width:none!important;min-width:0!important;min-height:0!important}` +
      `.avoid-break{break-inside:avoid;page-break-inside:avoid}` +
      `</style></head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  // O bug intermitente acontecia aqui: a impressão podia abrir antes de o CSS
  // do bundle terminar de carregar no iframe. Na segunda tentativa ele já vinha
  // do cache e parecia "se corrigir sozinho".
  await waitForAssets(doc);
  await new Promise((r) => setTimeout(r, 150));

  try {
    win.focus();
    win.print();
  } catch (err) {
    console.error("Falha ao imprimir via iframe:", err);
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 60000);
}

export async function downloadElementPdf(
  el: HTMLElement,
  filename: string,
  opts?: { padding?: string; margin?: string },
): Promise<void> {
  let container: HTMLElement | null = null;
  try {
    await waitForAssets(el);
    const [h2cMod, jspdfMod] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
    const html2canvas: any = (h2cMod as any).default ?? h2cMod;
    const JsPDFCtor: any = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
    if (typeof html2canvas !== "function" || typeof JsPDFCtor !== "function") throw new Error("Bibliotecas de PDF indisponíveis");

    // 210 mm em 96 dpi. O width é a largura TOTAL da folha; por isso usamos
    // border-box para o padding não aumentar a página e cortar o lado direito.
    const fixedWidth = 794;
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = `${fixedWidth}px`;
    container.style.background = "#ffffff";
    container.style.zIndex = "-1";

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.boxSizing = "border-box";
    clone.style.width = `${fixedWidth}px`;
    clone.style.minWidth = `${fixedWidth}px`;
    clone.style.maxWidth = `${fixedWidth}px`;
    clone.style.margin = "0";
    clone.style.padding = opts?.padding || "12mm";
    clone.style.transform = "none";
    clone.style.boxShadow = "none";
    clone.style.border = "none";
    clone.style.background = "#ffffff";
    container.appendChild(clone);
    document.body.appendChild(container);

    await waitForAssets(clone);
    const captureHeight = Math.max(clone.scrollHeight, clone.getBoundingClientRect().height);
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: fixedWidth,
      height: Math.ceil(captureHeight),
      windowWidth: fixedWidth,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new JsPDFCtor({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
      heightLeft -= pageH;
    }

    const blob: Blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "").slice(0, 180) || "LHL-Festas.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    await printElement(el, { title: filename.replace(/\.pdf$/i, ""), margin: opts?.margin || "12mm" });
  } finally {
    if (container?.parentNode) container.parentNode.removeChild(container);
  }
}
