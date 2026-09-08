import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "./runtime-env.server";
import { THEMES as LOCAL_THEMES } from "./catalog-source";

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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
        .map((image: any) => ({
          url: String(image?.url || image?.thumbnailUrl || ""),
          thumbnailUrl: String(image?.thumbnailUrl || image?.url || ""),
          modality: String(image?.modality || ""),
        })),
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
    images: theme.imageUrl
      ? [{ url: theme.imageUrl, thumbnailUrl: theme.imageUrl, modality: theme.modality }]
      : [],
  }));
  return {
    version: 1,
    updatedAt: "",
    totalThemes: themes.length,
    themes,
  };
}

/**
 * Fachada pública do catálogo.
 * O navegador fala apenas com o site oficial. Enquanto a fonte completa ainda
 * não foi migrada, tentamos a origem configurada no servidor; se ela falhar,
 * o site continua operando com a curadoria local em vez de quebrar a jornada.
 */
export const fetchCatalogoPublico = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && cache.expiresAt > Date.now()) return cache.payload;

  const source = getServerEnv("CATALOGO_PUBLIC_URL") || FALLBACK_CATALOG_SOURCE;
  try {
    const response = await fetch(source, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Catálogo remoto respondeu ${response.status}.`);

    const payload = normalizePayload(await response.json());
    if (!payload.themes.length) throw new Error("Catálogo remoto sem temas.");
    cache = { payload, expiresAt: Date.now() + CACHE_MS };
    return payload;
  } catch (error) {
    console.warn("[catalogo] fonte completa indisponível; usando curadoria local", error instanceof Error ? error.message : error);
    const payload = localFallbackPayload();
    cache = { payload, expiresAt: Date.now() + Math.min(CACHE_MS, 60_000) };
    return payload;
  }
});
