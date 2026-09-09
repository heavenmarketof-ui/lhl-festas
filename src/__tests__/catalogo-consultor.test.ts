import { describe, expect, it } from "vitest";
import OWN_CATALOG from "@/data/catalogo-oficial.json";
import { normalizeCatalogPayload } from "@/lib/catalogo-publico.functions";
import { normalizeCatalog } from "@/lib/consultor/catalog-remote";

describe("catálogo oficial próprio + Consultor", () => {
  it("mantém o acervo completo internalizado no projeto", () => {
    expect(Array.isArray(OWN_CATALOG.themes)).toBe(true);
    expect(OWN_CATALOG.themes.length).toBeGreaterThan(600);
  });

  it("normaliza imagens do Drive para o proxy oficial da LHL", () => {
    const payload = normalizeCatalogPayload(OWN_CATALOG);
    expect(payload.themes.length).toBeGreaterThan(600);
    const image = payload.themes.flatMap((theme) => theme.images)[0];
    expect(image?.url).toMatch(/^\/catalog-image\?id=/);
    expect(image?.thumbnailUrl).toMatch(/^\/catalog-image\?id=/);
  });

  it("o Consultor aceita as URLs relativas do novo catálogo", () => {
    const payload = normalizeCatalogPayload(OWN_CATALOG);
    const arts = normalizeCatalog(payload);
    expect(arts.length).toBeGreaterThan(600);
    expect(arts.some((art) => art.themeName === "101 Dalmatas")).toBe(true);
    expect(arts.some((art) => art.imageUrl.startsWith("/catalog-image?id="))).toBe(true);
  });
});
