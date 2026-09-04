// ============================================================================
// CATÁLOGO INTELIGENTE DE MATERIAIS — LHL FESTAS
// ----------------------------------------------------------------------------
// Base reutilizável de nomes de materiais usados nos contratos/ordens de
// produção. Não é um módulo: é apenas uma base consultada durante o cadastro
// de "Itens a Comprar" no Contrato.
//
// Estrutura preparada para evoluções futuras (sugestões por tema/modalidade/
// kit, recorrência, favoritos) — nada disso é implementado nesta sprint.
// ============================================================================

const LS_KEY = "lhl_materiais_catalogo";

export type MaterialCatalogo = {
  /** Chave normalizada (sem acento, minúscula, espaços colapsados). */
  key: string;
  /** Nome oficial exibido/reutilizado. */
  nome: string;
  /** Quantidade de vezes utilizado (histórico). */
  usos: number;
  /** ISO da última utilização. */
  ultimoUso: string;
  /* --- Campos reservados para evoluções futuras (opcionais) --- */
  temas?: string[];
  modalidades?: string[];
  kits?: string[];
  favorito?: boolean;
};

/** Destino escolhido pelo usuário ao salvar o item no Contrato. */
export type ItemComprarDestino = "orcamento" | "aprovacao";

/** Item a comprar registrado no Contrato. Valor/fornecedor são opcionais. */
export type ItemComprar = {
  id: string;
  nome: string;
  quantidade: number;
  observacao: string;
  /** Fornecedor já conhecido (opcional). */
  fornecedor?: string;
  /** Valor orçado unitário já conhecido (opcional). */
  valorOrcado?: number;
  /** "orcamento" (padrão) ou "aprovacao" (vai direto para autorização). */
  destino?: ItemComprarDestino;
  /** Referência normalizada do material no Catálogo Inteligente. */
  materialKey?: string;
  /** ISO de criação — usado apenas para ordenação/auditoria. */
  criadoEm?: string;
};

/** Item artesanal produzido pela própria empresa (sem nada financeiro). */
export type ItemProduzir = {
  id: string;
  nome: string;
  quantidade: number;
  observacao: string;
  materialKey?: string;
  criadoEm?: string;
};


/* ============================ Normalização ============================ */

/** Ignora maiúsculas/minúsculas, acentos e espaços extras. */
export function normalizeMaterialName(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================ Persistência ============================ */

export function getCatalogo(): MaterialCatalogo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const list = raw ? (JSON.parse(raw) as MaterialCatalogo[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && m.nome) : [];
  } catch {
    return [];
  }
}

function writeCatalogo(list: MaterialCatalogo[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* cota cheia — catálogo é apenas conveniência */
  }
}

/**
 * Garante o cadastro de um material (sem abrir outra tela) e registra o uso.
 * Retorna o nome oficial padronizado do material.
 */
export function registrarMaterial(nome: string, opts?: { contarUso?: boolean }): string {
  const limpo = String(nome ?? "").replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  const key = normalizeMaterialName(limpo);
  const list = getCatalogo();
  const idx = list.findIndex((m) => m.key === key);
  const agora = new Date().toISOString();
  if (idx === -1) {
    list.push({ key, nome: limpo, usos: opts?.contarUso === false ? 0 : 1, ultimoUso: agora });
    writeCatalogo(list);
    return limpo;
  }
  const atual = list[idx];
  if (opts?.contarUso === false) return atual.nome; // nada muda em re-salvamentos
  list[idx] = {
    ...atual,
    usos: atual.usos + 1,
    ultimoUso: agora,
  };
  writeCatalogo(list);
  return atual.nome;
}

/** Registra o uso de vários materiais de uma vez (nova inclusão real). */
export function registrarMateriais(nomes: string[]): void {
  for (const n of nomes) registrarMaterial(n);
}

/**
 * Garante a existência dos materiais no catálogo SEM incrementar o contador de
 * uso — usado ao salvar o contrato, para que salvar de novo não infle o histórico.
 */
export function garantirMateriais(nomes: string[]): void {
  for (const n of nomes) registrarMaterial(n, { contarUso: false });
}

/** Alimenta o catálogo com nomes já existentes no sistema, sem contar uso extra. */
export function seedCatalogo(nomes: string[]): void {
  const list = getCatalogo();
  const known = new Set(list.map((m) => m.key));
  const agora = new Date().toISOString();
  let mudou = false;
  for (const raw of nomes) {
    const limpo = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!limpo) continue;
    const key = normalizeMaterialName(limpo);
    if (known.has(key)) continue;
    known.add(key);
    list.push({ key, nome: limpo, usos: 1, ultimoUso: agora });
    mudou = true;
  }
  if (mudou) writeCatalogo(list);
}

/* ============================ Pesquisa ============================ */

/**
 * Sugestões priorizando: mais utilizados → utilizados recentemente → alfabético.
 * A pesquisa ignora acentos, maiúsculas/minúsculas e espaços extras.
 */
export function buscarMateriais(
  termo: string,
  catalogo: MaterialCatalogo[] = getCatalogo(),
  limite = 8,
): MaterialCatalogo[] {
  const t = normalizeMaterialName(termo);
  const base = t
    ? catalogo.filter((m) => m.key.includes(t))
    : [...catalogo];
  return base
    .sort((a, b) => {
      if (t) {
        const ap = a.key.startsWith(t) ? 0 : 1;
        const bp = b.key.startsWith(t) ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      if (b.usos !== a.usos) return b.usos - a.usos;
      const ua = new Date(b.ultimoUso || 0).getTime() - new Date(a.ultimoUso || 0).getTime();
      if (ua !== 0) return ua;
      return a.nome.localeCompare(b.nome, "pt-BR");
    })
    .slice(0, limite);
}

/** Existe material exatamente com esse nome (normalizado)? */
export function materialExiste(nome: string, catalogo: MaterialCatalogo[] = getCatalogo()): boolean {
  const key = normalizeMaterialName(nome);
  return !!key && catalogo.some((m) => m.key === key);
}

/* ============================ Serialização do contrato ============================ */

export function parseItensComprar(raw?: string): ItemComprar[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(Boolean)
      .map((i: any) => ({
        id: String(i?.id ?? crypto.randomUUID()),
        nome: String(i?.nome ?? "").trim(),
        quantidade: Number(i?.quantidade ?? 1) || 1,
        observacao: String(i?.observacao ?? ""),
        fornecedor: i?.fornecedor ? String(i.fornecedor) : "",
        valorOrcado: Number(i?.valorOrcado ?? 0) || 0,
        destino: (i?.destino === "aprovacao" ? "aprovacao" : "orcamento") as ItemComprarDestino,
        materialKey: i?.materialKey
          ? String(i.materialKey)
          : normalizeMaterialName(String(i?.nome ?? "")) || undefined,
        criadoEm: i?.criadoEm ? String(i.criadoEm) : undefined,
      }))
      .filter((i) => i.nome);
  } catch {
    return [];
  }
}

export function stringifyItensComprar(list: ItemComprar[]): string {
  return JSON.stringify(list ?? []);
}

export function parseItensProduzir(raw?: string): ItemProduzir[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(Boolean)
      .map((i: any) => ({
        id: String(i?.id ?? crypto.randomUUID()),
        nome: String(i?.nome ?? "").trim(),
        quantidade: Number(i?.quantidade ?? 1) || 1,
        observacao: String(i?.observacao ?? ""),
        materialKey: i?.materialKey
          ? String(i.materialKey)
          : normalizeMaterialName(String(i?.nome ?? "")) || undefined,
        criadoEm: i?.criadoEm ? String(i.criadoEm) : undefined,
      }))
      .filter((i) => i.nome);
  } catch {
    return [];
  }
}

export function stringifyItensProduzir(list: ItemProduzir[]): string {
  return JSON.stringify(list ?? []);
}

