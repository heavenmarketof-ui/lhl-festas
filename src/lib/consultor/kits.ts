// Kits do Consultor — proxy da FONTE ÚNICA OFICIAL (src/data/kits.ts).
// Nenhuma lista de kits é declarada aqui.
//
// Nota: o Consultor NÃO recomenda nem pontua kits. Ele apenas apresenta,
// explica e registra a escolha do cliente (a consultoria comercial é feita
// pela equipe da LHL no WhatsApp).

import {
  OFFICIAL_KITS,
  getActiveKits,
  getKitsByModalidade,
  getOfficialKitById,
  kitFullName,
  fmtPreco,
  MODALIDADE_LABELS,
  type ModalidadeId,
  type OfficialKit,
} from "@/data/kits";

export type { OfficialKit, ModalidadeId };
export {
  OFFICIAL_KITS,
  getActiveKits,
  getKitsByModalidade,
  getOfficialKitById,
  kitFullName,
  fmtPreco,
  MODALIDADE_LABELS,
};

export const KITS: OfficialKit[] = getActiveKits();

export function getKitById(id?: string): OfficialKit | undefined {
  return getOfficialKitById(id);
}
