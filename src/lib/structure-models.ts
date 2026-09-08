// Modelos oficiais de estrutura desmontável da LHL Festas.
// Usados exclusivamente pelo Checklist para conferência de peças.

export type StructureModel = {
  id: string;
  nome: string;
  pecas: number;
};

export const STRUCTURE_MODELS: StructureModel[] = [
  { id: "painel-redondo-150-dourado", nome: "Painel Redondo 1,50 m — Dourado", pecas: 11 },
  { id: "painel-redondo-150-preto", nome: "Painel Redondo 1,50 m — Preto", pecas: 6 },
  { id: "painel-romano-2x1-dourado", nome: "Painel Romano 2,00 × 1,00 m — Dourado", pecas: 9 },
  { id: "painel-romano-22x15-dourado", nome: "Painel Romano 2,20 × 1,50 m — Dourado", pecas: 11 },
  { id: "arco-redondo-50x50", nome: "Arco Redondo 50 × 50 cm", pecas: 1 },
  { id: "arco-romano-pequeno", nome: "Arco Romano Pequeno", pecas: 1 },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[×x]/g, "x")
    .replace(/[,\.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tenta identificar um modelo oficial a partir do texto livre.
 * Retorna null quando a correspondência não é segura.
 */
export function matchStructureModel(label: string): StructureModel | null {
  const t = normalize(label);
  if (!t) return null;

  const hasPainel = /\bpainel\b/.test(t);
  const hasArco = /\barco\b/.test(t);
  const hasRedondo = /\bredondo\b/.test(t);
  const hasRomano = /\bromano\b/.test(t);
  const hasDourado = /\b(dourad[oa]|gold|ouro)\b/.test(t);
  const hasPreto = /\bpret[oa]\b/.test(t);

  // Arcos
  if (hasArco && hasRedondo) return STRUCTURE_MODELS[4];
  if (hasArco && hasRomano) return STRUCTURE_MODELS[5];

  // Painel Redondo 1,50
  if (hasPainel && hasRedondo && /\b1 ?50\b|\b150\b/.test(t)) {
    if (hasPreto) return STRUCTURE_MODELS[1];
    if (hasDourado) return STRUCTURE_MODELS[0];
    return null; // cor indefinida
  }

  // Painel Romano — precisa de dimensões pra distinguir
  if (hasPainel && hasRomano) {
    const is22x15 = /\b2 ?20?\s*x\s*1 ?50?\b|\b22\s*x\s*15\b|\b220\s*x\s*150\b/.test(t);
    const is2x1 = /\b2 ?00?\s*x\s*1 ?00?\b|\b2\s*x\s*1\b|\b200\s*x\s*100\b/.test(t);
    if (is22x15 && hasDourado) return STRUCTURE_MODELS[3];
    if (is2x1 && hasDourado) return STRUCTURE_MODELS[2];
    return null;
  }

  return null;
}
