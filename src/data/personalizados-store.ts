export type PersonalizadoCategory = "Caixinhas" | "Lembrancinhas" | "Mesa & Bolo" | "Convites";

export type PersonalizadoProduct = {
  id: string;
  name: string;
  price: number;
  unit: "un" | "letra" | "arte";
  category: PersonalizadoCategory;
  imageId?: string;
  description: string;
  featured?: boolean;
};

export const PERSONALIZADOS_CATEGORIES: Array<"Todos" | PersonalizadoCategory> = [
  "Todos",
  "Caixinhas",
  "Lembrancinhas",
  "Mesa & Bolo",
  "Convites",
];

// PREÇOS PÚBLICOS DE VENDA.
// A base de custo da produção não deve ser armazenada no repositório/site público.
// Estes valores foram calculados fora do código aplicando +50% sobre o custo informado.
export const PERSONALIZADOS_PRODUCTS: PersonalizadoProduct[] = [
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
    imageId: "https://img.elo7.com.br/product/zoom/35F5185/caixa-livro-alice-no-pais-das-maravilhas-caixa-livro.jpg",
    description: "Convite físico em formato de caixinha livro com arte personalizada.",
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
    imageId: "1-tgirxXP9s0yxdo20oKkxl3tS1ITxzca",
    description: "Convite digital personalizado para envio por WhatsApp e redes sociais.",
    featured: true,
  },
];

export function personalizadoImage(imageId?: string, width = 900) {
  if (!imageId) return "";
  if (/^https?:\/\//i.test(imageId)) return imageId;
  return `https://drive.google.com/thumbnail?id=${imageId}&sz=w${width}`;
}

export function formatPersonalizadoPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
