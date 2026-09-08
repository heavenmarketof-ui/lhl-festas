// Controle Inteligente de Itens Exclusivos — LHL Festas.
// Não é patrimônio nem estoque. Serve apenas para impedir sobreposição de
// equipamentos exclusivos em dois contratos ativos na mesma data.

import type { StoredOrder } from "./orders-storage";
import { isContratoAtivo } from "./orders-storage";
import { toDateISO } from "./date-utils";

export type ExclusiveCategory =
  | "mesa"
  | "cilindros"
  | "escadinha"
  | "painel"
  | "arco"
  | "tapete"
  | "numero_led_21"
  | "numero_led_50"
  | "happy_birthday";

export type ExclusiveItem = {
  id: string;
  categoria: ExclusiveCategory;
  nome: string;
  quantidade: number;
  pecas?: number;
  aComprar?: boolean;
  aComprarLabel?: string;
};

export const CATEGORY_LABELS: Record<ExclusiveCategory, string> = {
  mesa: "Mesas",
  cilindros: "Kit de Cilindros",
  escadinha: "Escadinha",
  painel: "Painéis / Suportes",
  arco: "Arcos",
  tapete: "Tapetes",
  numero_led_21: "Número LED 21 cm",
  numero_led_50: "Número LED 50 cm",
  happy_birthday: "Happy Birthday",
};

export const CATEGORY_ORDER: ExclusiveCategory[] = [
  "mesa", "cilindros", "escadinha", "painel", "arco", "tapete",
  "numero_led_21", "numero_led_50", "happy_birthday",
];

export const DEFAULT_EXCLUSIVE_ITEMS: ExclusiveItem[] = [
  // Mesas
  { id: "mesa-branca", categoria: "mesa", nome: "Mesa Branca", quantidade: 1 },
  { id: "mesa-rosa", categoria: "mesa", nome: "Mesa Rosa", quantidade: 1 },
  // Cilindros
  { id: "kit-cilindros", categoria: "cilindros", nome: "Kit de Cilindros", quantidade: 2 },
  // Escadinha
  { id: "escadinha", categoria: "escadinha", nome: "Escadinha", quantidade: 1 },
  // Painéis
  { id: "painel-redondo-150-dourado", categoria: "painel", nome: "Painel Redondo 1,50 Dourado", quantidade: 1, pecas: 11 },
  { id: "painel-redondo-150-preto", categoria: "painel", nome: "Painel Redondo 1,50 Preto", quantidade: 1, pecas: 6 },
  { id: "painel-romano-2x1", categoria: "painel", nome: "Painel Romano 2,00 x 1,00", quantidade: 1, pecas: 9 },
  { id: "painel-romano-22x15", categoria: "painel", nome: "Painel Romano 2,20 x 1,50", quantidade: 1, pecas: 11 },
  // Arcos
  { id: "arco-redondo-50x50", categoria: "arco", nome: "Arco Redondo 50 x 50", quantidade: 5 },
  { id: "arco-romano-pequeno", categoria: "arco", nome: "Arco Romano Pequeno", quantidade: 2 },
  // Tapetes
  { id: "tapete-verde", categoria: "tapete", nome: "Tapete Verde", quantidade: 1 },
  { id: "tapete-rosa", categoria: "tapete", nome: "Tapete Rosa", quantidade: 1 },
  { id: "tapete-bege", categoria: "tapete", nome: "Tapete Bege", quantidade: 1 },
  { id: "tapete-vermelho", categoria: "tapete", nome: "Tapete Vermelho", quantidade: 1 },
  // LED 21
  { id: "led21-3", categoria: "numero_led_21", nome: "Número LED 21 cm — 3", quantidade: 1 },
  { id: "led21-7", categoria: "numero_led_21", nome: "Número LED 21 cm — 7", quantidade: 1 },
  { id: "led21-comprar", categoria: "numero_led_21", nome: "Número LED 21 cm — A Comprar", quantidade: 999, aComprar: true, aComprarLabel: "Idade desejada" },
  // LED 50
  { id: "led50-1", categoria: "numero_led_50", nome: "Número LED 50 cm — 1", quantidade: 1 },
  { id: "led50-comprar", categoria: "numero_led_50", nome: "Número LED 50 cm — A Comprar", quantidade: 999, aComprar: true, aComprarLabel: "Número desejado" },
  // Happy Birthday
  { id: "hb-dourado", categoria: "happy_birthday", nome: "Happy Birthday Dourado", quantidade: 1 },
  { id: "hb-prata", categoria: "happy_birthday", nome: "Happy Birthday Prata", quantidade: 1 },
  { id: "hb-comprar", categoria: "happy_birthday", nome: "Happy Birthday — A Comprar", quantidade: 999, aComprar: true, aComprarLabel: "Modelo desejado" },
];

const CFG_KEY = "lhl_exclusive_items_config_v1";

/** Lê a configuração da tabela (localStorage). Faz merge com defaults para novos itens. */
export function getExclusiveConfig(): ExclusiveItem[] {
  if (typeof window === "undefined") return DEFAULT_EXCLUSIVE_ITEMS;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return DEFAULT_EXCLUSIVE_ITEMS.map((i) => ({ ...i }));
    const parsed = JSON.parse(raw) as ExclusiveItem[];
    const byId = new Map(parsed.map((i) => [i.id, i]));
    // garante que novos itens do código apareçam automaticamente
    for (const def of DEFAULT_EXCLUSIVE_ITEMS) {
      const cur = byId.get(def.id);
      if (!cur) byId.set(def.id, { ...def });
      else byId.set(def.id, { ...def, quantidade: cur.quantidade });
    }
    return CATEGORY_ORDER.flatMap((cat) =>
      Array.from(byId.values()).filter((i) => i.categoria === cat),
    );
  } catch {
    return DEFAULT_EXCLUSIVE_ITEMS.map((i) => ({ ...i }));
  }
}

export function saveExclusiveConfig(items: ExclusiveItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CFG_KEY, JSON.stringify(items));
}

export function resetExclusiveConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CFG_KEY);
}

export type SelectedExclusive = { itemId: string; aComprarSpec?: string };

export function parseSelected(json: string | undefined | null): SelectedExclusive[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(String(json));
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => x && typeof x.itemId === "string")
        .map((x) => ({ itemId: String(x.itemId), aComprarSpec: x.aComprarSpec ? String(x.aComprarSpec) : undefined }));
    }
  } catch { /* ignore */ }
  return [];
}

export function stringifySelected(list: SelectedExclusive[]): string {
  return JSON.stringify(list);
}

export type Conflict = { contractId: string; clientName: string; dataEvento: string };

/**
 * Mapa itemId → lista de contratos ATIVOS de OUTRAS pessoas que já reservaram
 * este item para a mesma data do evento. Contrato ativo = caução ainda não devolvida.
 */
export function getConflictsByItem(
  orders: StoredOrder[],
  dataEventoISO: string,
  excludeContractId?: string,
): Map<string, Conflict[]> {
  const out = new Map<string, Conflict[]>();
  if (!dataEventoISO) return out;
  for (const o of orders) {
    if (excludeContractId && o.id === excludeContractId) continue;
    if (!isContratoAtivo(o)) continue;
    const d = o.details;
    if (!d) continue;
    if (toDateISO(d.dataEvento) !== dataEventoISO) continue;
    const list = parseSelected(d.itensExclusivos);
    for (const s of list) {
      const arr = out.get(s.itemId) ?? [];
      arr.push({ contractId: o.id, clientName: o.nome || d.nomeAniversariante || "—", dataEvento: dataEventoISO });
      out.set(s.itemId, arr);
    }
  }
  return out;
}
