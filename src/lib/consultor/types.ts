// Types shared by the Consultor de Festas LHL engine and UI.
// Os kits/modalidades vêm SEMPRE de src/data/kits.ts (fonte única oficial).

import type { ModalidadeId } from "@/data/kits";

export type StepId =
  | "welcome"
  | "name"
  | "date"
  | "city"
  | "age"
  | "venue"
  | "modality"
  | "theme"
  | "kits"
  | "photo"
  | "summary";

export type BudgetBand =
  | "ate-200"
  | "200-300"
  | "300-450"
  | "acima-450"
  | "nao-sei";

/** Modalidade escolhida no Consultor. */
export type Modality = ModalidadeId | "nao-sei";

export type VenueType =
  | "Casa"
  | "Salão"
  | "Condomínio"
  | "Escola"
  | "Buffet"
  | "Chácara"
  | "Outro";

export type CatalogTheme = {
  id: string;
  name: string;
  aliases: string[];
  imageUrl: string;
  modality: "Festa na Mesa" | "Pegue e Monte";
};

/**
 * Uma ARTE real do catálogo oficial (1 imagem = 1 arte).
 * Todos os campos vêm diretamente do catalog.json — nada é inferido,
 * aproximado ou escolhido aleatoriamente.
 */
export type CatalogArt = {
  /** Identificador real e único da arte: `${themeId}::${index}`. */
  id: string;
  themeId: string;
  themeName: string;
  /** Nome exibido: "Homem Aranha — Arte 2" quando há várias artes. */
  name: string;
  artIndex: number;
  /** Modalidade real registrada na arte/tema. */
  modality: string;
  /** URL real da arte. */
  imageUrl: string;
  thumbnailUrl: string;
  /** Nome, slug, categoria e aliases reais do catálogo — base da pesquisa. */
  keywords: string[];
};


export type ConsultorState = {
  step: StepId;
  history: StepId[];
  answers: {
    name?: string;
    date?: string;
    dateSkipped?: boolean;
    city?: string;
    theme?: string;
    themeId?: string;
    themeImageUrl?: string;
    /** Modalidade real registrada na arte escolhida no catálogo. */
    themeModality?: string;
    themeIsCustom?: boolean;
    age?: string;
    venue?: VenueType;
    modality?: Modality;
    budget?: BudgetBand;
    /** Id oficial do kit escolhido (src/data/kits.ts). */
    chosenKitId?: string;
    /** Cliente pediu ajuda da equipe para escolher o kit. */
    kitUndecided?: boolean;
    /** Escolhas internas do kit: { [escolhaId]: opção }. */
    kitChoices?: Record<string, string>;
    hasReferencePhoto?: boolean;
  };
};

export const BUDGET_LABELS: Record<BudgetBand, string> = {
  "ate-200": "Até R$ 200",
  "200-300": "Entre R$ 200 e R$ 300",
  "300-450": "Entre R$ 300 e R$ 450",
  "acima-450": "Acima de R$ 450",
  "nao-sei": "Ainda não sei",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  "festa-na-mesa": "Festa na Mesa",
  "peg-monte": "Peg & Monte",
  "festa-com-montagem": "Festa com Montagem",
  "nao-sei": "Ainda não sei",
};
