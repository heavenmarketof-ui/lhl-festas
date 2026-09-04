import type { PatrimonioItem } from "./patrimonio-api";

type Seed = { nome: string; categoria: string; quantidade: number; valor: string };

export const PATRIMONIO_SEED: Seed[] = [
  { nome: "Painel Romano 2m x 1m", categoria: "Painéis", quantidade: 2, valor: "R$ 72,90" },
  { nome: "Painel Romano 2,20 x 1,50", categoria: "Painéis", quantidade: 1, valor: "R$ 130,91" },
  { nome: "Kit Pegue e Monte", categoria: "Estruturas", quantidade: 2, valor: "R$ 95,99" },
  { nome: "Arco 1,50m", categoria: "Arcos", quantidade: 1, valor: "R$ 108,18" },
  { nome: "Arco 1,50m FE", categoria: "Arcos", quantidade: 1, valor: "R$ 152,11" },
  { nome: "Arco 50cm", categoria: "Arcos", quantidade: 5, valor: "R$ 19,99" },
  { nome: "Mini Arco Romano", categoria: "Arcos", quantidade: 2, valor: "R$ 18,49" },
  { nome: "Mesa Branca", categoria: "Mesas", quantidade: 2, valor: "R$ 123,50" },
  { nome: "Tapete", categoria: "Tapetes", quantidade: 3, valor: "R$ 71,40" },
  { nome: "Bolo Fake", categoria: "Bolos Fake", quantidade: 6, valor: "R$ 29,40" },
  { nome: "Capa Painel 1,50", categoria: "Capas", quantidade: 5, valor: "R$ 78,49" },
  { nome: "Capas Painel Romano", categoria: "Capas", quantidade: 6, valor: "R$ 48,64" },
  { nome: "Capas de Cilindros", categoria: "Capas", quantidade: 6, valor: "R$ 46,37" },
  { nome: "Mini Cake", categoria: "Decoração", quantidade: 22, valor: "R$ 8,00" },
  { nome: "Bandeja", categoria: "Bandejas", quantidade: 35, valor: "R$ 11,00" },
  { nome: "Boleira", categoria: "Bandejas", quantidade: 14, valor: "R$ 11,00" },
  { nome: "Vaso Romano", categoria: "Vasos", quantidade: 21, valor: "R$ 10,00" },
  { nome: "Capa 50cm", categoria: "Capas", quantidade: 25, valor: "R$ 20,00" },
  { nome: "Buchinho", categoria: "Decoração", quantidade: 6, valor: "R$ 17,49" },
  { nome: "Plastificadora", categoria: "Equipamentos", quantidade: 1, valor: "R$ 141,76" },
  { nome: "Número LED 7", categoria: "Iluminação", quantidade: 2, valor: "R$ 28,61" },
  { nome: "Inflador Elétrico", categoria: "Equipamentos", quantidade: 1, valor: "R$ 57,58" },
  { nome: "Gabarito de Balões", categoria: "Equipamentos", quantidade: 1, valor: "R$ 13,90" },
  { nome: "Happy Birthday", categoria: "Decoração", quantidade: 2, valor: "R$ 24,40" },
  { nome: "Display Homem-Aranha", categoria: "Displays", quantidade: 1, valor: "R$ 32,10" },
  { nome: "Displays Lilo & Stitch", categoria: "Displays", quantidade: 1, valor: "R$ 36,84" },
  { nome: "Caixas Organizadoras", categoria: "Organização", quantidade: 4, valor: "R$ 14,53" },
  { nome: "Tesoura", categoria: "Equipamentos", quantidade: 2, valor: "R$ 12,00" },
  { nome: "Pistola de Cola Quente", categoria: "Equipamentos", quantidade: 2, valor: "R$ 30,00" },
];

export function seedToItem(s: Seed): PatrimonioItem {
  return {
    id: crypto.randomUUID(),
    nome: s.nome,
    categoria: s.categoria,
    quantidade: s.quantidade,
    valorAquisicao: s.valor,
    dataCompra: "",
    observacoes: "",
    status: "Ativo",
    fotoUrl: "",
    createdAt: new Date().toISOString(),
    ativo: "Sim",
  };
}

export function parseValor(v?: string): number {
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
