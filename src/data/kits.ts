// ============================================================================
// FONTE ÚNICA E OFICIAL DOS KITS DA LHL FESTAS
// ----------------------------------------------------------------------------
// TODO o sistema (Home, Orçamento, Formulários, Consultor, Central de Leads,
// Central de Operações, Contratos, Checklists, WhatsApp, Dashboards e Filtros)
// deve consumir exclusivamente este arquivo.
//
// Para alterar preço, descrição, itens, ordem ou desativar um kit, basta
// editar aqui — nenhum outro arquivo precisa ser tocado.
// ============================================================================

export type ModalidadeId = "festa-na-mesa" | "peg-monte" | "festa-com-montagem";

export type OfficialKit = {
  id: string;
  modalidade: ModalidadeId;
  nome: string;          // Nome curto oficial: "Kit Premium"
  preco: number;
  descricao: string;
  itens: string[];
  ativo: boolean;
  ordem: number;
  /** Escolhas que o cliente precisa fazer dentro do kit (registradas no lead/contrato). */
  escolhas?: Array<{ id: string; label: string; opcoes: string[] }>;
  /** Caução padrão praticada para o kit. */
  caucao: number;
};

export const MODALIDADES: Array<{ id: ModalidadeId; label: string }> = [
  { id: "festa-na-mesa", label: "Festa na Mesa" },
  { id: "peg-monte", label: "Peg & Monte" },
  { id: "festa-com-montagem", label: "Festa com Montagem" },
];

export const MODALIDADE_LABELS: Record<ModalidadeId, string> = {
  "festa-na-mesa": "Festa na Mesa",
  "peg-monte": "Peg & Monte",
  "festa-com-montagem": "Festa com Montagem",
};

// ---------------------------------------------------------------------------
// KITS OFICIAIS
// ---------------------------------------------------------------------------

export const OFFICIAL_KITS: OfficialKit[] = [
  // ---------------- FESTA NA MESA ----------------
  {
    id: "fm-so-um-bolinho",
    modalidade: "festa-na-mesa",
    nome: "Só um Bolinho",
    preco: 0,
    descricao: "Ideal para celebrações simples e práticas.",
    itens: [
      "Painel 50 cm com tema",
      "Suportes para bolo e doces",
    ],
    ativo: true,
    ordem: 1,
    caucao: 50,
  },
  {
    id: "fm-essencial",
    modalidade: "festa-na-mesa",
    nome: "Essencial",
    preco: 0,
    descricao: "O básico indispensável para sua festa.",
    itens: [
      "Painel de mesa 50 cm com balões",
      "Suportes para doces e bolo",
      "Vaso com buchinho ou flores",
    ],
    ativo: true,
    ordem: 2,
    caucao: 50,
  },
  {
    id: "fm-completo",
    modalidade: "festa-na-mesa",
    nome: "Completo",
    preco: 0,
    descricao: "Decoração completa para mesa.",
    itens: [
      "Painel de mesa 50 cm com balões",
      "Suportes para doces e bolo",
      "Vaso com buchinho ou flores",
      "Displays de mesa",
      "Mesa para decoração",
    ],
    ativo: true,
    ordem: 3,
    caucao: 50,
  },
  {
    id: "fm-premium",
    modalidade: "festa-na-mesa",
    nome: "Premium",
    preco: 0,
    descricao: "Decoração premium com mais detalhes.",
    itens: [
      "Mesa para decoração",
      "Painel 50 cm com tema",
      "Arco romano de mesa com balões",
      "Suportes para doces e bolo",
      "Bolo fake",
      "Vaso com flores ou buchinho",
      "Displays de mesa",
      "Guirlanda de balões na frente da mesa",
    ],
    ativo: true,
    ordem: 4,
    caucao: 80,
  },
  {
    id: "fm-diamante",
    modalidade: "festa-na-mesa",
    nome: "Diamante",
    preco: 0,
    descricao: "A experiência máxima da modalidade Festa na Mesa.",
    itens: [
      "Arco romano 2 × 1 m com balões",
      "Painel 50 cm com tema e balões",
      "Mesa para decoração",
      "Bolo fake",
      "Suportes para doces e bolo",
      "Vaso com flores ou buchinho",
      "Displays de mesa",
      "Display de chão 50 cm",
      "Tapete",
    ],
    ativo: true,
    ordem: 5,
    caucao: 80,
  },

  // ---------------- PEG & MONTE ----------------
  {
    id: "pm-essencial",
    modalidade: "peg-monte",
    nome: "Essencial",
    preco: 0,
    descricao: "O kit básico para montar seu cenário.",
    itens: [
      "1 painel redondo",
      "Trio de cilindros com capa",
      "Suportes para doces e bolo",
      "1 vaso grego com flores ou buchinho",
      "Displays de mesa",
    ],
    ativo: true,
    ordem: 1,
    caucao: 80,
  },
  {
    id: "pm-completo",
    modalidade: "peg-monte",
    nome: "Completo",
    preco: 0,
    descricao: "Cenário completo e harmonioso.",
    itens: [
      "1 painel redondo OU romano",
      "Trio de cilindros com capa OU 1 mesa decorativa",
      "Suportes para doces e bolo",
      "2 vasos com flores ou buchinhos",
      "Displays de mesa",
      "1 display de chão 50 cm",
      "Tapete",
    ],
    escolhas: [
      {
        id: "base",
        label: "Base",
        opcoes: ["Trio de cilindros com capa", "Mesa decorativa"],
      },
      {
        id: "painel",
        label: "Painel",
        opcoes: ["Painel redondo", "Painel romano"],
      },
    ],
    ativo: true,
    ordem: 2,
    caucao: 100,
  },
  {
    id: "pm-premium",
    modalidade: "peg-monte",
    nome: "Premium",
    preco: 0,
    descricao: "Cenário premium completo.",
    itens: [
      "2 painéis: 1 redondo + 1 romano",
      "1 mesa decorativa",
      "3 cilindros com capa",
      "Suportes para doces e bolo",
      "2 vasos",
      "Displays de mesa",
      "1 display de chão 50 cm",
      "Tapete",
    ],
    ativo: true,
    ordem: 3,
    caucao: 100,
  },
  {
    id: "pm-personalizado-montagem",
    modalidade: "peg-monte",
    nome: "Personalizado com Montagem",
    preco: 0,
    descricao: "Composição livre com serviço de montagem (sem caução).",
    itens: [],
    ativo: true,
    ordem: 4,
    caucao: 0,
  },

  // ---------------- FESTA COM MONTAGEM ----------------
  {
    id: "fcm-personalizada",
    modalidade: "festa-com-montagem",
    nome: "Personalizada com Montagem",
    preco: 0,
    descricao:
      "Composição personalizada com montagem feita pela equipe LHL Festas no local do evento (sem caução).",
    itens: [],
    ativo: true,
    ordem: 1,
    caucao: 0,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const fmtPreco = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function getActiveKits(): OfficialKit[] {
  return OFFICIAL_KITS.filter((k) => k.ativo).sort((a, b) => a.ordem - b.ordem);
}

export function getKitsByModalidade(m: ModalidadeId | "" | undefined): OfficialKit[] {
  if (!m) return [];
  return getActiveKits().filter((k) => k.modalidade === m);
}

export function getOfficialKitById(id?: string): OfficialKit | undefined {
  if (!id) return undefined;
  return OFFICIAL_KITS.find((k) => k.id === id);
}

/** Nome completo padronizado: "Festa na Mesa — Kit Premium". */
export function kitFullName(kit: OfficialKit): string {
  return `${MODALIDADE_LABELS[kit.modalidade]} — ${kit.nome}`;
}

/** Converte o rótulo textual da modalidade (inclusive legado) no id oficial. */
export function modalidadeIdFromLabel(label?: string): ModalidadeId | undefined {
  const s = (label || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("montagem")) return "festa-com-montagem";
  if (s.includes("mesa")) return "festa-na-mesa";
  if (s.includes("peg") || s.includes("monte")) return "peg-monte";
  return undefined;
}

/**
 * Resolve um kit a partir de (modalidade, nome/id armazenado).
 * Aceita o id oficial, o nome curto ("Kit Premium") e o nome completo.
 * Retorna `undefined` para registros históricos (Bronze/Prata/Ouro).
 */
export function resolveKit(modalidade?: string, kitRef?: string): OfficialKit | undefined {
  if (!kitRef) return undefined;
  const byId = getOfficialKitById(kitRef);
  if (byId) return byId;
  const mod = modalidadeIdFromLabel(modalidade);
  const norm = (s: string) => s.toLowerCase().trim();
  const candidates = mod ? getKitsByModalidade(mod) : getActiveKits();
  return candidates.find(
    (k) => norm(k.nome) === norm(kitRef) || norm(kitFullName(k)) === norm(kitRef),
  );
}

/** Kits legados — mantidos APENAS para leitura de contratos históricos. */
export const LEGACY_PLANS = ["Bronze", "Prata", "Ouro", "Diamante"] as const;

export function isLegacyPlan(plano?: string): boolean {
  return !!plano && (LEGACY_PLANS as readonly string[]).includes(plano);
}

// ---------------------------------------------------------------------------
// Rótulos e helpers de UI/armazenamento
// ---------------------------------------------------------------------------

/** Rótulo gravado no Sheets/contratos para cada modalidade. */
export const MODALIDADE_STORAGE = MODALIDADE_LABELS;

export const MODALIDADE_EMOJI: Record<ModalidadeId, string> = {
  "festa-na-mesa": "🎉",
  "peg-monte": "🎈",
  "festa-com-montagem": "✨",
};

export const MODALIDADE_DESCRICAO: Record<ModalidadeId, string> = {
  "festa-na-mesa":
    "Decoração compacta para a mesa principal — prática, econômica e cheia de charme para festas em casa.",
  "peg-monte":
    "Cenário completo para retirar e montar em minutos: painéis, mesa, cilindros e displays.",
  "festa-com-montagem":
    "Decoração personalizada com montagem realizada pela equipe LHL Festas no local do evento.",
};

/** Kits disponíveis a partir do rótulo textual da modalidade (aceita legado). */
export function kitsForModalidadeLabel(label?: string): OfficialKit[] {
  return getKitsByModalidade(modalidadeIdFromLabel(label));
}

/** Itens inclusos do kit escolhido (vazio para planos legados). */
export function kitItemsFor(modalidade?: string, plano?: string): string[] {
  return resolveKit(modalidade, plano)?.itens ?? [];
}

/** Preço oficial do kit (0 quando não reconhecido). */
export function kitPriceFor(modalidade?: string, plano?: string): number {
  return resolveKit(modalidade, plano)?.preco ?? 0;
}

/** Caução oficial do kit (0 quando não reconhecido). */
export function kitCaucaoFor(modalidade?: string, plano?: string): number {
  return resolveKit(modalidade, plano)?.caucao ?? 0;
}

