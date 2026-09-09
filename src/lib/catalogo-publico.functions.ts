import { createServerFn } from "@tanstack/react-start";
import OWN_CATALOG from "@/data/catalogo-oficial.json";
import { THEMES as LOCAL_THEMES } from "./catalog-source";

export type CatalogImage = { url: string; thumbnailUrl: string; modality: string };
export type CatalogTheme = { id: string; name: string; slug: string; aliases: string[]; modalities: string[]; images: CatalogImage[] };
export type CatalogPayload = { version: number; updatedAt: string; totalThemes: number; themes: CatalogTheme[] };

let cache: CatalogPayload | null = null;

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function driveFileId(value: string) {
  if (!value) return "";
  const decoded = (() => { try { return decodeURIComponent(value); } catch { return value; } })();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function normalizeImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/drive\.google\.com|googleusercontent\.com/i.test(raw)) {
    const id = driveFileId(raw);
    if (id) return `/catalog-image?id=${encodeURIComponent(id)}`;
  }
  return raw;
}

export function normalizeCatalogPayload(raw: any): CatalogPayload {
  const themes = Array.isArray(raw?.themes) ? raw.themes : [];
  return {
    version: Number(raw?.version || 1),
    updatedAt: String(raw?.updatedAt || ""),
    totalThemes: themes.length,
    themes: themes
      .filter((theme: any) => theme?.isActive !== false)
      .map((theme: any) => ({
        id: String(theme?.id || theme?.slug || ""),
        name: String(theme?.name || "Tema"),
        slug: String(theme?.slug || slugify(String(theme?.name || "tema"))),
        aliases: Array.isArray(theme?.aliases) ? theme.aliases.map(String) : [],
        modalities: Array.isArray(theme?.modalities) ? theme.modalities.map(String) : [],
        images: (Array.isArray(theme?.images) ? theme.images : [])
          .filter((image: any) => image?.url || image?.thumbnailUrl)
          .map((image: any) => {
            const url = normalizeImageUrl(image?.url || image?.thumbnailUrl);
            const thumbnailUrl = normalizeImageUrl(image?.thumbnailUrl || image?.url);
            return { url, thumbnailUrl, modality: String(image?.modality || "") };
          })
          .filter((image: CatalogImage) => Boolean(image.url || image.thumbnailUrl)),
      }))
      .filter((theme: CatalogTheme) => Boolean(theme.id && theme.name)),
  };
}

function localFallbackPayload(): CatalogPayload {
  const themes: CatalogTheme[] = LOCAL_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    slug: slugify(theme.name),
    aliases: theme.aliases,
    modalities: [theme.modality],
    images: theme.imageUrl ? [{ url: theme.imageUrl, thumbnailUrl: theme.imageUrl, modality: theme.modality }] : [],
  }));
  return { version: 1, updatedAt: "", totalThemes: themes.length, themes };
}

export const fetchCatalogoPublico = createServerFn({ method: "GET" }).handler(async () => {
  if (cache) return cache;
  try {
    const payload = normalizeCatalogPayload(OWN_CATALOG);
    if (!payload.themes.length) throw new Error("catálogo próprio vazio");
    cache = payload;
    return payload;
  } catch (error) {
    console.warn("[catalogo] falha ao carregar catálogo próprio", error instanceof Error ? error.message : error);
    const payload = localFallbackPayload();
    cache = payload;
    return payload;
  }
});
