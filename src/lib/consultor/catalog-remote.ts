// Catálogo remoto usado pelo Consultor.
// O navegador não acessa mais diretamente a antiga hospedagem do catálogo:
// toda leitura passa pela fachada server-side do Sistema Oficial LHL.

import type { CatalogArt } from "./types";
import { fetchCatalogoPublico } from "@/lib/catalogo-publico.functions";

const CACHE_KEY = "lhl_consultor_catalog_v3";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const MAX_THEMES = 5000;
const MAX_IMAGES_PER_THEME = 60;

type CacheShape = { at: number; arts: CatalogArt[] };

function asString(v: unknown, max = 200): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function asStringArray(v: unknown, maxItems = 80, maxLen = 120): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v.slice(0, maxItems)) {
    const s = asString(item, maxLen);
    if (s) out.push(s);
  }
  return out;
}

/**
 * Converte links do Google Drive em URLs diretas servidas pelo CDN público,
 * mantendo a URL real vinculada à arte no catálogo.
 */
export function normalizeDriveUrl(url: string, width = 1200): string {
  const m =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!m) return url;
  return `https://lh3.googleusercontent.com/d/${m[1]}=w${width}`;
}

function safeImageUrl(v: unknown, width = 1200): string {
  const s = asString(v, 800);
  if (!s || !/^https?:\/\//i.test(s)) return "";
  return /drive\.google\.com|drive\.usercontent\.google\.com/.test(s)
    ? normalizeDriveUrl(s, width)
    : s;
}

function artsFromTheme(raw: unknown): CatalogArt[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (r.isActive === false) return [];

  const themeId = asString(r.id, 140) || asString(r.slug, 140);
  const themeName = asString(r.name, 140);
  if (!themeId || !themeName) return [];

  const slug = asString(r.slug, 140);
  const category = asString(r.category, 120);
  const aliases = asStringArray(r.aliases);
  const modalities = asStringArray(r.modalities, 10, 60);
  const rawImages = Array.isArray(r.images) ? r.images.slice(0, MAX_IMAGES_PER_THEME) : [];
  const keywords = [themeName, slug, category, ...aliases].filter(Boolean);

  const arts: CatalogArt[] = [];
  rawImages.forEach((img, i) => {
    if (!img || typeof img !== "object") return;
    const o = img as Record<string, unknown>;
    const imageUrl = safeImageUrl(o.url);
    if (!imageUrl) return;
    const thumbnailUrl = safeImageUrl(o.thumbnailUrl, 800) || imageUrl;
    const modality = asString(o.modality, 60) || modalities[0] || "";
    arts.push({
      id: `${themeId}::${i}`,
      themeId,
      themeName,
      name: rawImages.length > 1 ? `${themeName} — Arte ${i + 1}` : themeName,
      artIndex: i + 1,
      modality,
      imageUrl,
      thumbnailUrl,
      keywords,
    });
  });
  return arts;
}

export function normalizeCatalog(payload: unknown): CatalogArt[] {
  const arr = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as any).themes)
      ? ((payload as { themes: unknown[] }).themes)
      : null;
  if (!arr) return [];

  const out: CatalogArt[] = [];
  const seen = new Set<string>();
  for (const raw of arr.slice(0, MAX_THEMES)) {
    for (const art of artsFromTheme(raw)) {
      if (seen.has(art.id)) continue;
      seen.add(art.id);
      out.push(art);
    }
  }
  return out;
}

function readCache(): CatalogArt[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed?.at || !Array.isArray(parsed.arts)) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.arts;
  } catch {
    return null;
  }
}

function writeCache(arts: CatalogArt[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), arts } satisfies CacheShape));
  } catch {
    /* quota / modo privativo — ignora */
  }
}

let inflight: Promise<CatalogArt[] | null> | null = null;

async function fetchCatalogoOficial(): Promise<CatalogArt[] | null> {
  try {
    const payload = await fetchCatalogoPublico();
    const arts = normalizeCatalog(payload);
    return arts.length ? arts : null;
  } catch {
    return null;
  }
}

/**
 * Artes do catálogo oficial:
 * 1. cache válido em sessionStorage;
 * 2. fachada server-side do Sistema LHL;
 * 3. null — o chamador usa o fallback local.
 */
export function loadRemoteCatalog(): Promise<CatalogArt[] | null> {
  const cached = readCache();
  if (cached && cached.length) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    const arts = await fetchCatalogoOficial();
    if (arts && arts.length) {
      writeCache(arts);
      return arts;
    }
    return null;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
