// Busca de temas/artes do Consultor.
//
// A origem do catálogo é acessada exclusivamente pela fachada de servidor
// `fetchCatalogoPublico`. O navegador nunca acessa diretamente a origem externa.
// Enquanto a migração da fonte do catálogo não for concluída, a fachada pode
// usar uma origem temporária configurável por CATALOGO_PUBLIC_URL.
//
// FALLBACK LOCAL (`src/lib/catalog-source.ts`): usado somente quando o
// carregamento remoto falha de verdade.

import { THEMES as LOCAL_FALLBACK_THEMES } from "@/lib/catalog-source";
import type { CatalogArt, CatalogTheme } from "./types";
import { loadRemoteCatalog } from "./catalog-remote";

export const CATALOG_THEMES: CatalogTheme[] = LOCAL_FALLBACK_THEMES;

export type CatalogSource = "remote" | "fallback";
export type LoadedCatalog = { arts: CatalogArt[]; source: CatalogSource };

function localFallbackArts(): CatalogArt[] {
  return LOCAL_FALLBACK_THEMES.map((t) => ({
    id: `${t.id}::0`, themeId: t.id, themeName: t.name, name: t.name, artIndex: 1,
    modality: t.modality, imageUrl: t.imageUrl, thumbnailUrl: t.imageUrl,
    keywords: [t.name, ...t.aliases],
  }));
}

export async function loadCatalogThemes(): Promise<LoadedCatalog> {
  try {
    const remote = await loadRemoteCatalog();
    if (remote && remote.length) return { arts: remote, source: "remote" };
  } catch { /* usa fallback local */ }
  return { arts: localFallbackArts(), source: "fallback" };
}

export const loadCatalogArts = loadCatalogThemes;

export function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function singularize(s: string): string {
  return s.replace(/oes$/i, "ao").replace(/aes$/i, "ao").replace(/ais$/i, "al")
    .replace(/eis$/i, "el").replace(/ois$/i, "ol").replace(/uis$/i, "ul")
    .replace(/ns$/i, "m").replace(/s$/i, "");
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "o", "a", "os", "as", "em", "para", "com", "tema", "festa"]);
const QUERY_SYNONYMS: Record<string, string> = {
  spiderman: "homem aranha", "spider man": "homem aranha", spider: "homem aranha",
  ironman: "homem de ferro", "iron man": "homem de ferro", batman: "batman",
  "mickey mouse": "mickey", "minnie mouse": "minnie", "hello kitty": "hello kitty", "toy story": "toy story",
};

function expandQuery(q: string): string {
  const n = normalize(q);
  if (QUERY_SYNONYMS[n]) return QUERY_SYNONYMS[n];
  return n.split(" ").map((w) => QUERY_SYNONYMS[w] || w).join(" ");
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean).map(singularize).filter((t) => t.length > 0);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(n + 1); cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

function tokenMatches(qt: string, ct: string): boolean {
  if (qt === ct) return true;
  if (qt.length >= 4 && ct.length >= 4 && (ct.startsWith(qt) || qt.startsWith(ct))) return true;
  return qt.length >= 5 && Math.abs(qt.length - ct.length) <= 1 && levenshtein(qt, ct) <= 1;
}

export type ThemeSearchResult = { art: CatalogArt; score: number };

export function searchArts(query: string, arts: CatalogArt[], limit = 24): ThemeSearchResult[] {
  const expanded = expandQuery(query);
  const rawTokens = tokenize(expanded);
  if (!rawTokens.length) return [];
  const qTokens = rawTokens.filter((t) => !STOPWORDS.has(t));
  const tokens = qTokens.length ? qTokens : rawTokens;
  const qNorm = normalize(expanded);
  const scored: ThemeSearchResult[] = [];

  for (const art of arts) {
    const haystack = art.keywords.map((k) => normalize(k));
    const catTokens = new Set<string>();
    for (const h of haystack) for (const t of h.split(" ")) if (t) catTokens.add(singularize(t));
    if (!tokens.every((qt) => Array.from(catTokens).some((ct) => tokenMatches(qt, ct)))) continue;

    const nameNorm = normalize(art.themeName);
    let score = 1;
    if (nameNorm === qNorm) score = 100;
    else if (haystack.some((h) => h === qNorm)) score = 90;
    else if (nameNorm.includes(qNorm)) score = 80;
    else if (haystack.some((h) => h.includes(qNorm))) score = 70;
    else score = 50 - Math.min(catTokens.size, 20);
    scored.push({ art, score });
  }

  return scored.sort((a, b) => b.score - a.score || a.art.themeName.localeCompare(b.art.themeName, "pt-BR") || a.art.artIndex - b.art.artIndex).slice(0, limit);
}

export const searchThemes = searchArts;
