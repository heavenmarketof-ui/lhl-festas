import { createServerFn } from "@tanstack/react-start";

export type CatalogImage = {
  url: string;
  thumbnailUrl: string;
  modality: string;
};

export type CatalogTheme = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  modalities: string[];
  images: CatalogImage[];
};

export type CatalogPayload = {
  version: number;
  updatedAt: string;
  totalThemes: number;
  themes: CatalogTheme[];
};

const FALLBACK_CATALOG_SOURCE = "https://catalogo-lhlfestas.lovable.app/api/public/catalog.json";
const CACHE_MS = 5 * 60 * 1000;
let cache: { expiresAt: number; payload: CatalogPayload } | null = null;

function normalizePayload(raw: any): CatalogPayload {
  const themes = Array.isArray(raw?.themes) ? raw.themes : [];
  return {
    version: Number(raw?.version || 1),
    updatedAt: String(raw?.updatedAt || ""),
    totalThemes: Number(raw?.totalThemes || themes.length),
    themes: themes.map((theme: any) => ({
      id: String(theme?.id || ""),
      name: String(theme?.name || "Tema"),
      slug: String(theme?.slug || ""),
      aliases: Array.isArray(theme?.aliases) ? theme.aliases.map(String) : [],
      modalities: Array.isArray(theme?.modalities) ? theme.modalities.map(String) : [],
      images: (Array.isArray(theme?.images) ? theme.images : [])
        .filter((image: any) => image?.url || image?.thumbnailUrl)
        .map((image: any) => ({
          url: String(image?.url || image?.thumbnailUrl || ""),
          thumbnailUrl: String(image?.thumbnailUrl || image?.url || ""),
          modality: String(image?.modality || ""),
        })),
    })),
  };
}

/**
 * Fachada pública do catálogo.
 * O navegador fala apenas com o site oficial; a origem temporária do catálogo
 * fica isolada no servidor e pode ser trocada por CATALOGO_PUBLIC_URL sem
 * alterar a página pública.
 */
export const fetchCatalogoPublico = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && cache.expiresAt > Date.now()) return cache.payload;

  const source = String(process.env.CATALOGO_PUBLIC_URL || FALLBACK_CATALOG_SOURCE).trim();
  const response = await fetch(source, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Catálogo temporariamente indisponível (${response.status}).`);

  const payload = normalizePayload(await response.json());
  cache = { payload, expiresAt: Date.now() + CACHE_MS };
  return payload;
});
