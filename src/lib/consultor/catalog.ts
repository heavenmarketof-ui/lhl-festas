// Busca de temas/artes do Consultor.
//
// FONTE OFICIAL E EXCLUSIVA: https://catalogo-lhlfestas.lovable.app/catalog.json
// (carregado em runtime por `loadRemoteCatalog`, com cache em sessionStorage,
// timeout, sanitização e validação).
//
// FALLBACK LOCAL (`src/lib/catalog-source.ts`): usado SOMENTE quando o
// carregamento remoto falha de verdade (rede, CORS, indisponibilidade, JSON
// inválido). Se o catálogo remoto carregar, os resultados vêm exclusivamente
// dele.
//
// A pesquisa é estrita: só retorna artes cujo nome/slug/aliases reais
// correspondem à consulta. Nada de temas parecidos, categorias genéricas,
// personagens relacionados ou imagens aleatórias.

import { THEMES as LOCAL_FALLBACK_THEMES } from "@/lib/catalog-source";
import type { CatalogArt, CatalogTheme } from "./types";
import { loadRemoteCatalog } from "./catalog-remote";

// Compat: callers antigos consumiam esta constante (base local de fallback).
export const CATALOG_THEMES: CatalogTheme[] = LOCAL_FALLBACK_THEMES;

export type CatalogSource = "remote" | "fallback";

export type LoadedCatalog = {
  arts: CatalogArt[];
  /** Identificação técnica — nunca exibida ao cliente. */
  source: CatalogSource;
};

/** Converte a base local mínima em artes, apenas para o fallback técnico. */
function localFallbackArts(): CatalogArt[] {
  return LOCAL_FALLBACK_THEMES.map((t, i) => ({
    id: `${t.id}::0`,
    themeId: t.id,
    themeName: t.name,
    name: t.name,
    artIndex: 1,
    modality: t.modality,
    imageUrl: t.imageUrl,
    thumbnailUrl: t.imageUrl,
    keywords: [t.name, ...t.aliases],
  }));
}

/**
 * Carrega as artes do catálogo oficial.
 *   1. JSON remoto (cache 6h, timeout 8s) → source: "remote"
 *   2. Base local mínima em caso de falha real → source: "fallback"
 * Nunca lança.
 */
export async function loadCatalogThemes(): Promise<LoadedCatalog> {
  try {
    const remote = await loadRemoteCatalog();
    if (remote && remote.length) return { arts: remote, source: "remote" };
  } catch {
    /* silencioso */
  }
  return { arts: localFallbackArts(), source: "fallback" };
}

export const loadCatalogArts = loadCatalogThemes;

// ---------- Normalização ----------

export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^a-z0-9]+/g, " ") // hífens, pontuação, símbolos
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(s: string): string {
  return s
    .replace(/oes$/i, "ao")
    .replace(/aes$/i, "ao")
    .replace(/ais$/i, "al")
    .replace(/eis$/i, "el")
    .replace(/ois$/i, "ol")
    .replace(/uis$/i, "ul")
    .replace(/ns$/i, "m")
    .replace(/s$/i, "");
}

/** Palavras sem valor discriminante — ignoradas na consulta. */
const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "o", "a", "os", "as", "em", "para", "com", "tema", "festa"]);

/**
 * Sinônimos aplicados APENAS à consulta digitada (nunca aos resultados).
 * Serve para que grafias equivalentes cheguem ao mesmo registro real.
 */
const QUERY_SYNONYMS: Record<string, string> = {
  spiderman: "homem aranha",
  "spider man": "homem aranha",
  spider: "homem aranha",
  ironman: "homem de ferro",
  "iron man": "homem de ferro",
  batman: "batman",
  "mickey mouse": "mickey",
  "minnie mouse": "minnie",
  "hello kitty": "hello kitty",
  "toy story": "toy story",
};

function expandQuery(q: string): string {
  const n = normalize(q);
  if (QUERY_SYNONYMS[n]) return QUERY_SYNONYMS[n];
  // sinônimo por palavra (ex.: "spiderman baby")
  const parts = n.split(" ").map((w) => QUERY_SYNONYMS[w] || w);
  return parts.join(" ");
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter(Boolean)
    .map(singularize)
    .filter((t) => t.length > 0);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** Um token da consulta casa com um token real do catálogo? */
function tokenMatches(qt: string, ct: string): boolean {
  if (qt === ct) return true;
  // prefixo, para plural/diminutivo e digitação parcial
  if (qt.length >= 4 && ct.length >= 4 && (ct.startsWith(qt) || qt.startsWith(ct))) return true;
  // erro de digitação leve (1 caractere) em palavras longas
  if (qt.length >= 5 && Math.abs(qt.length - ct.length) <= 1) {
    return levenshtein(qt, ct) <= 1;
  }
  return false;
}

export type ThemeSearchResult = {
  art: CatalogArt;
  score: number;
};

/**
 * Pesquisa estrita nas palavras reais do catálogo (nome, slug, categoria e
 * aliases). Uma arte só é retornada quando TODOS os termos relevantes da
 * consulta aparecem no registro real — por isso "Homem-Aranha" nunca traz
 * "Dinossauros" ou "Super-Heróis".
 */
export function searchArts(
  query: string,
  arts: CatalogArt[],
  limit = 24,
): ThemeSearchResult[] {
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

    // Todos os termos da consulta precisam existir no registro real.
    const allPresent = tokens.every((qt) => {
      for (const ct of catTokens) if (tokenMatches(qt, ct)) return true;
      return false;
    });
    if (!allPresent) continue;

    // Pontuação: correspondência exata do nome > frase contida > tokens.
    const nameNorm = normalize(art.themeName);
    let score = 1;
    if (nameNorm === qNorm) score = 100;
    else if (haystack.some((h) => h === qNorm)) score = 90;
    else if (nameNorm.includes(qNorm)) score = 80;
    else if (haystack.some((h) => h.includes(qNorm))) score = 70;
    else score = 50 - Math.min(catTokens.size, 20); // nomes mais enxutos primeiro

    scored.push({ art, score });
  }

  return scored
    .sort((a, b) =>
      b.score - a.score ||
      a.art.themeName.localeCompare(b.art.themeName, "pt-BR") ||
      a.art.artIndex - b.art.artIndex,
    )
    .slice(0, limit);
}

/** Compat com o nome antigo. */
export const searchThemes = searchArts;
