import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "./runtime-env.server";
import { THEMES as LOCAL_THEMES } from "./catalog-source";

export type CatalogImage = { url: string; thumbnailUrl: string; modality: string };
export type CatalogTheme = { id: string; name: string; slug: string; aliases: string[]; modalities: string[]; images: CatalogImage[] };
export type CatalogPayload = { version: number; updatedAt: string; totalThemes: number; themes: CatalogTheme[] };

const LEGACY_CATALOG_SOURCE = "https://catalogo-lhlfestas.lovable.app/api/public/catalog.json";
const CACHE_MS = 5 * 60 * 1000;
let cache: { expiresAt: number; payload: CatalogPayload } | null = null;

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
        .map((image: any) => {
          const url = normalizeImageUrl(image?.url || image?.thumbnailUrl);
          const thumbnailUrl = normalizeImageUrl(image?.thumbnailUrl || image?.url);
          return { url, thumbnailUrl, modality: String(image?.modality || "") };
        })
        .filter((image: CatalogImage) => Boolean(image.url || image.thumbnailUrl)),
    })),
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

async function trySource(source: string): Promise<CatalogPayload> {
  const response = await fetch(source, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${response.status}`);
  const payload = normalizePayload(await response.json());
  if (!payload.themes.length) throw new Error("sem temas");
  return payload;
}

export const fetchCatalogoPublico = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && cache.expiresAt > Date.now()) return cache.payload;
  const configured = getServerEnv("CATALOGO_PUBLIC_URL").trim();
  const sources = Array.from(new Set([configured, LEGACY_CATALOG_SOURCE].filter(Boolean)));
  for (const source of sources) {
    try {
      const payload = await trySource(source);
      cache = { payload, expiresAt: Date.now() + CACHE_MS };
      return payload;
    } catch (error) {
      console.warn("[catalogo] fonte indisponível", source, error instanceof Error ? error.message : error);
    }
  }
  const payload = localFallbackPayload();
  cache = { payload, expiresAt: Date.now() + 60_000 };
  return payload;
});
