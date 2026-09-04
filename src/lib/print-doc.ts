// ============================================================================
// Impressão e geração de PDF de documentos A4 (contrato, checklist).
// Usa um iframe oculto para imprimir (não é bloqueado por pop-up e funciona no
// celular) e html2canvas-pro + jsPDF para o download.
// ============================================================================

/** Copia todos os estilos da página atual (dev e produção). */
function collectStyles(): string {
  return Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((n) => n.outerHTML)
    .join("\n");
}

/** Espera fontes e imagens do elemento carregarem antes de capturar/imprimir. */
async function waitForAssets(root: ParentNode): Promise<void> {
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            setTimeout(resolve, 4000);
          }),
    ),
  );
}

/**
 * Imprime um elemento em A4 usando iframe oculto.
 * Funciona no celular e não depende de pop-ups.
 */
export async function printElement(
  el: HTMLElement,
  opts?: { title?: string; margin?: string },
): Promise<void> {
  await waitForAssets(el);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
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

  const margin = opts?.margin || "12mm";
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<title>${opts?.title || document.title}</title>` +
      `${collectStyles()}` +
      `<style>@page{size:A4;margin:${margin}}` +
      `html,body{margin:0;background:#fff}` +
      `.no-print{display:none!important}` +
      `.a4-sheet,.a4-checklist{box-shadow:none!important;border:0!important;margin:0!important;width:auto!important;max-width:none!important;min-height:0!important}` +
      `</style></head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  await waitForAssets(doc);
  await new Promise((r) => setTimeout(r, 400));

  try {
    win.focus();
    win.print();
  } catch (err) {
    console.error("Falha ao imprimir via iframe:", err);
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  // Remove depois que o diálogo do navegador é fechado.
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 60000);
}

/**
 * Gera e baixa o PDF A4 do elemento. Em caso de falha, cai para a impressão
 * (onde o próprio navegador oferece "Salvar como PDF").
 */
export async function downloadElementPdf(
  el: HTMLElement,
  filename: string,
  opts?: { padding?: string; margin?: string },
): Promise<void> {
  let container: HTMLElement | null = null;
  try {
    await waitForAssets(el);

    const [h2cMod, jspdfMod] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const html2canvas: any = (h2cMod as any).default ?? h2cMod;
    const JsPDFCtor: any = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
    if (typeof html2canvas !== "function" || typeof JsPDFCtor !== "function") {
      throw new Error("Bibliotecas de PDF indisponíveis");
    }

    // Largura fixa de A4 a 96dpi para o layout não depender da tela do celular.
    const fixedWidth = 794;
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = `${fixedWidth}px`;
    container.style.background = "#ffffff";
    container.style.zIndex = "-1";

    const clone = el.cloneNode(true) as HTMLElement;
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

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: fixedWidth,
      windowWidth: fixedWidth,
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
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    await printElement(el, {
      title: filename.replace(/\.pdf$/i, ""),
      margin: opts?.margin || "12mm",
    });
  } finally {
    if (container?.parentNode) container.parentNode.removeChild(container);
  }
}
