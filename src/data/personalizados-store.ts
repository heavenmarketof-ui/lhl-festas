export type PersonalizadoCategory = "Caixinhas" | "Lembrancinhas" | "Mesa & Bolo" | "Centros de Mesa" | "Convites";

export type PersonalizadoProduct = {
  id: string;
  name: string;
  price: number | null;
  unit: "un" | "letra" | "arte";
  category: PersonalizadoCategory;
  imageId?: string;
  gallery?: Array<{ imageId: string; label: string }>;
  description: string;
  featured?: boolean;
};

export const PERSONALIZADOS_CATEGORIES: Array<"Todos" | PersonalizadoCategory> = [
  "Todos",
  "Caixinhas",
  "Lembrancinhas",
  "Mesa & Bolo",
  "Centros de Mesa",
  "Convites",
];

// PREÇOS PÚBLICOS DE VENDA.
// A base de custo da produção não deve ser armazenada no repositório/site público.
// Estes valores foram calculados fora do código aplicando +50% sobre o custo informado.
const BASE_PRODUCTS: PersonalizadoProduct[] = [
  {
    id: "dupla-bis",
    name: "Caixinha Dupla BIS",
    price: 3.6,
    unit: "un",
    category: "Caixinhas",
    imageId: "1gJYMjEZAbghWWLqVXMerPVEOCeJg_Cfp",
    description: "Caixinha personalizada para dois chocolates BIS, criada no tema da festa.",
    featured: true,
  },
  {
    id: "piramide",
    name: "Caixinha Pirâmide",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1tqyOrGf0cbLCmMZ7wgYo5yIR8HGqYNxN",
    description: "Modelo pirâmide personalizado, ideal para doces, lembranças e composição de mesa.",
  },
  {
    id: "sushi",
    name: "Caixinha Sushi",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1S0sZg1LHXjtqPLMbWWA4Enlirqzkzwe3",
    description: "Caixinha compacta com fechamento especial e arte personalizada.",
  },
  {
    id: "caixinha-tubete",
    name: "Caixinha Tubete",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1LkynEZlUQhWjEjXEiHnzJzcT9OTDitHV",
    description: "Embalagem personalizada para completar a papelaria e as lembrancinhas da festa.",
  },
  {
    id: "tubete-adesivo",
    name: "Tubete com Adesivo",
    price: 3.6,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1LkynEZlUQhWjEjXEiHnzJzcT9OTDitHV",
    description: "Tubete personalizado com adesivo no tema escolhido pelo cliente.",
  },
  {
    id: "milk",
    name: "Caixinha Milk",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1-_lzPC2f6F2s8ogzsWgh_DZ3hVt-3t9J",
    description: "Um dos modelos mais versáteis para doces e lembranças personalizadas.",
    featured: true,
  },
  {
    id: "bala",
    name: "Caixa Bala",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "1ju3SzcbfJn86BjqCI79tV9-fymK6t0vS",
    description: "Caixa em formato de bala para deixar a mesa ainda mais temática.",
  },
  {
    id: "meia-bala",
    name: "Caixa Meia Bala",
    price: 4.95,
    unit: "un",
    category: "Caixinhas",
    imageId: "1ewQ-Kcz-iKL_Tjx8zzoSm-4T-_7no99v",
    description: "Versão compacta da caixa bala com personalização completa.",
  },
  {
    id: "maletinha",
    name: "Maletinha",
    price: 5.85,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1t1rosmJxOOTIRmGUu3LLW1oP-wIwcU99",
    description: "Maletinha personalizada para pequenos brindes, doces ou atividades.",
    featured: true,
  },
  {
    id: "coracao",
    name: "Caixa Coração",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "1e1fbrZvPCE3Im7ePchs9G_AJ_x4xDHJY",
    description: "Caixinha em formato de coração com arte criada para a ocasião.",
  },
  {
    id: "sacolinha",
    name: "Sacolinha Personalizada",
    price: 4.5,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1iMaFrBbMhaYg6miAn11yVIe6HTERR3CL",
    description: "Sacolinha temática para lembranças, doces e kits da festa.",
  },
  {
    id: "giz-desenho",
    name: "Caixa Giz e Desenho",
    price: 6.3,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1Op5XDHnuQZNJh8HY7dnarPLlYdTZOGQv",
    description: "Kit infantil para desenhar e colorir, personalizado no tema escolhido.",
  },
  {
    id: "forminha",
    name: "Forminha para Doces",
    price: 0.54,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "106zZC1NiWMcBWLXQV3U6wpZ4uOpZ-wo2",
    description: "Forminha personalizada para integrar os doces à identidade visual da festa.",
  },
  {
    id: "topper",
    name: "Topper de Bolo",
    price: 16.2,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "1Imj5tygkLnmWBif6-92_4nJs0r-7-CA4",
    description: "Topo de bolo personalizado com nome, idade e elementos do tema.",
    featured: true,
  },
  {
    id: "bandeirola",
    name: "Bandeirola",
    price: 2.7,
    unit: "letra",
    category: "Mesa & Bolo",
    imageId: "1V_E0KUzTBJ7mKiMKyJMzsHOPlCVGHVME",
    description: "Bandeirola personalizada cobrada por letra, ideal para nomes e frases curtas.",
  },
  {
    id: "centro-mesa",
    name: "Centro de Mesa",
    price: 5.85,
    unit: "un",
    category: "Mesa & Bolo",
    imageId: "1CuzEDBx4c16qHCiMtjKCKe6dxqgKNxoO",
    description: "Centro de mesa personalizado para decorar e presentear os convidados.",
  },
  {
    id: "convite-livro",
    name: "Convite Caixinha Livro",
    price: 7.2,
    unit: "un",
    category: "Convites",
    imageId: "https://down-br.img.susercontent.com/file/sg-11134201-7rfi9-m9n0s6n08bkh3a",
    description: "Convite físico em formato de caixinha livro com arte personalizada. Foto ilustrativa de referência; acabamento e composição serão confirmados no atendimento.",
  },
  {
    id: "lousinha",
    name: "Lousinha Mágica",
    price: 7.2,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1Tj_lgRhYOgP3xFau7R9-n2h6W-uoFMPm",
    description: "Lousinha personalizada para divertir as crianças durante e depois da festa.",
    featured: true,
  },
  {
    id: "cofrinho",
    name: "Cofrinho",
    price: 5.4,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1MrnGWtuCaWJ83BdWGavyebH1sqTSL2Ps",
    description: "Cofrinho personalizado com nome, idade e identidade visual do evento.",
  },
  {
    id: "livro-colorir",
    name: "Livro de Colorir",
    price: 7.2,
    unit: "un",
    category: "Lembrancinhas",
    imageId: "1ZU08-pO4_cyKRUUs1p3MrLBtNwZJsM-K",
    description: "Livro de atividades para colorir, personalizado para a comemoração.",
  },
  {
    id: "canudo",
    name: "Caixa Canudo",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "11X3KxDmc8cy8qRTuI9c9r7CCUsjsQhxj",
    description: "Caixinha alta e temática para compor kits e lembrancinhas personalizadas.",
  },
  {
    id: "sextavada",
    name: "Caixinha Sextavada",
    price: 5.4,
    unit: "un",
    category: "Caixinhas",
    imageId: "13vdfL1sopJu8yUrEVqf0Tmy3K5IjgxMl",
    description: "Caixinha sextavada com acabamento personalizado no tema da festa.",
  },
  {
    id: "convite-digital",
    name: "Convite Digital",
    price: 18,
    unit: "arte",
    category: "Convites",
    imageId: "data:image/webp;base64,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",
    description: "Convite digital personalizado para envio por WhatsApp e redes sociais.",
    featured: true,
  },
];

// Fotos revisadas visualmente a partir do catálogo da parceria.
// Preços por família reaproveitam exclusivamente a tabela pública existente.
import { REVIEWED_PERSONALIZADOS } from "./personalizados-reviewed";
export const PERSONALIZADOS_PRODUCTS: PersonalizadoProduct[] = [
 ...BASE_PRODUCTS.filter(p => p.id !== "tubete-adesivo" && !REVIEWED_PERSONALIZADOS.some(r => r.id === p.id)),
 ...REVIEWED_PERSONALIZADOS,
];

export function personalizadoImage(imageId?: string, width = 900) {
  if (!imageId) return "";
  if (/^(data:|\/)/i.test(imageId)) return imageId;
  if (/^https?:\/\//i.test(imageId)) return imageId;
  return `https://drive.google.com/thumbnail?id=${imageId}&sz=w${width}`;
}

export function formatPersonalizadoPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
