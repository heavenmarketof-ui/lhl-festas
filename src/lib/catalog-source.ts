// FONTE OFICIAL DOS TEMAS DO CONSULTOR:
//   https://catalogo-lhlfestas.lovable.app/catalog.json
//   (carregado em runtime por src/lib/consultor/catalog-remote.ts)
//
// A lista `THEMES` abaixo é FALLBACK LOCAL — usada apenas quando o JSON
// remoto está indisponível (rede, CORS, offline). Não é a fonte principal
// e não precisa ser mantida em sincronia com o catálogo.
//
// Os KITS, por outro lado, permanecem sendo definidos aqui: esta é a fonte
// única e oficial dos kits, consumida por /orcamento e pelo Consultor.

import { OFFICIAL_KITS } from "@/data/kits";
import {
  festaNaMesaImages,
  pegEMonteImages,
  inspireSeImages,
} from "@/assets/lhl";

// ---------- Tipos ----------

export type Modality = "Festa na Mesa" | "Pegue e Monte";
export type KitModality = Modality | "Ambos";

export type BudgetBand =
  | "ate-200"
  | "200-300"
  | "300-450"
  | "acima-450"
  | "nao-sei";

export type CatalogTheme = {
  id: string;
  name: string;
  aliases: string[];
  modality: Modality;
  imageUrl: string;
};

export type CatalogKit = {
  id: string;
  name: string;
  shortDescription: string;
  items: string[];
  priceBand: BudgetBand[];
  modality: KitModality;
  imageUrl: string;
};

// ---------- Utilitário ----------
// Escolhe uma imagem determinística dentro de um pool a partir do id.
function pickImage(pool: string[], seed: string): string {
  if (!pool.length) return "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// ---------- Temas oficiais ----------
// A LHL trabalha com um catálogo externo de +1.000 temas. Esta lista
// representa a base curada usada pelo Consultor para reconhecimento e
// sugestão inteligente com imagens reais.
const RAW_THEMES: Array<Omit<CatalogTheme, "imageUrl">> = [
  { id: "hello-kitty", name: "Hello Kitty", modality: "Festa na Mesa",
    aliases: ["hello kity", "helo kit", "kitty", "hello", "gatinha kitty"] },
  { id: "stitch", name: "Stitch", modality: "Festa na Mesa",
    aliases: ["stich", "lilo e stitch", "lilo", "experimento 626"] },
  { id: "safari", name: "Safari", modality: "Pegue e Monte",
    aliases: ["safare", "selva", "animais safari", "leão", "zebra", "girafa"] },
  { id: "princesas", name: "Princesas", modality: "Festa na Mesa",
    aliases: ["princesa", "princess", "princes", "cinderela", "aurora", "bela"] },
  { id: "carros", name: "Carros", modality: "Pegue e Monte",
    aliases: ["carro", "cars", "relâmpago mcqueen", "mcqueen", "corrida"] },
  { id: "fazendinha", name: "Fazendinha", modality: "Pegue e Monte",
    aliases: ["fazenda", "sítio", "sitio", "vaquinha", "galinha", "cavalinho"] },
  { id: "moranguinho", name: "Moranguinho", modality: "Festa na Mesa",
    aliases: ["moranguinhu", "morango", "strawberry shortcake", "morangos"] },
  { id: "unicornio", name: "Unicórnio", modality: "Festa na Mesa",
    aliases: ["unicornio", "unicorn", "unicornios", "unicórnios"] },
  { id: "dinossauros", name: "Dinossauros", modality: "Pegue e Monte",
    aliases: ["dino", "dinos", "dinossauro", "jurassic", "rex", "t-rex"] },
  { id: "ursinhos", name: "Ursinhos", modality: "Festa na Mesa",
    aliases: ["ursinho", "ursos", "urso", "teddy", "chá de bebê"] },
  { id: "bailarina", name: "Bailarina", modality: "Festa na Mesa",
    aliases: ["bailarinas", "ballet", "balé", "sapatilha"] },
  { id: "circo", name: "Circo", modality: "Pegue e Monte",
    aliases: ["circo", "palhaço", "palhaco", "picadeiro"] },
  { id: "espacial", name: "Espacial", modality: "Pegue e Monte",
    aliases: ["espaço", "espaco", "astronauta", "planetas", "galaxia", "galáxia", "space"] },
  { id: "sereia", name: "Sereia", modality: "Festa na Mesa",
    aliases: ["sereias", "ariel", "fundo do mar", "mermaid"] },
  { id: "super-herois", name: "Super-Heróis", modality: "Pegue e Monte",
    aliases: ["heroi", "herois", "super herói", "vingadores", "marvel", "batman", "homem aranha"] },
  { id: "futebol", name: "Futebol", modality: "Pegue e Monte",
    aliases: ["bola", "campo", "torcida", "soccer", "gol"] },
  { id: "chuva-bencaos", name: "Chuva de Bênçãos", modality: "Festa na Mesa",
    aliases: ["cha de bebe", "chá de bebê", "bencao", "bênção", "chuva de amor"] },
  { id: "boteco", name: "Boteco", modality: "Pegue e Monte",
    aliases: ["botequim", "bar", "cerveja", "boteco chique"] },
  { id: "tropical", name: "Tropical", modality: "Festa na Mesa",
    aliases: ["hawaii", "havai", "havaiana", "frutas", "abacaxi", "flamingo"] },
];

export const THEMES: CatalogTheme[] = RAW_THEMES.map((t) => {
  const pool = t.modality === "Festa na Mesa" ? festaNaMesaImages : pegEMonteImages;
  const fallback = [...pool, ...inspireSeImages];
  return { ...t, imageUrl: pickImage(fallback, t.id) };
});

// ---------- Kits oficiais ----------
// ATENÇÃO: a fonte única e oficial dos kits é `src/data/kits.ts`.
// Este módulo apenas adapta aquela fonte ao formato `CatalogKit` usado
// historicamente pelo site/Consultor. NÃO declarar kits aqui.

export const KITS: CatalogKit[] = OFFICIAL_KITS.filter((k) => k.ativo)
  .sort((a, b) => a.modalidade.localeCompare(b.modalidade) || a.ordem - b.ordem)
  .map((k) => {
    const isMesa = k.modalidade === "festa-na-mesa";
    const pool = isMesa ? festaNaMesaImages : pegEMonteImages;
    return {
      id: k.id,
      name: k.nome,
      shortDescription: k.descricao,
      items: k.itens,
      priceBand: priceBandFor(k.preco),
      modality: (isMesa ? "Festa na Mesa" : "Pegue e Monte") as KitModality,
      imageUrl: pickImage(pool, k.id),
    };
  });

function priceBandFor(preco: number): BudgetBand[] {
  if (preco <= 200) return ["ate-200"];
  if (preco <= 300) return ["200-300"];
  if (preco <= 450) return ["300-450"];
  return ["acima-450"];
}

export function getKitById(id?: string): CatalogKit | undefined {
  if (!id) return undefined;
  return KITS.find((k) => k.id === id);
}


export function getThemeById(id?: string): CatalogTheme | undefined {
  if (!id) return undefined;
  return THEMES.find((t) => t.id === id);
}
