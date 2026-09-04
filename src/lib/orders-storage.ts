import { resolveKit } from "@/data/kits";

export type OrderStatus = "Pendente" | "Em andamento" | "Finalizado" | "Cancelado";

/** Modalidades oficiais (a legada permanece apenas para leitura de contratos antigos). */
export type Modalidade = "Festa na Mesa" | "Peg & Monte" | "Pegue e Monte Tradicional";
/** Nome do kit gravado no contrato. Strings livres para compat com contratos legados. */
export type Plano = string;

export type KitChecklist = {
  bandejas: number;
  cilindros: number;
  displays: number;
  baloes: number;
  mesa: number;
  tapete: number;
  vasoGrego: number;
  boloFake: number;
  arcoSuporte: number;
  buchinhoFloreira: number;
  numeroLed: number;
  painelPersonalizado: number;
  escadinha: number;
  happyBirthday: number;
};

export type ExtraPiece = { nome: string; quantidade: number };

export const BALAO_OPTIONS = [
  "Guirlanda de balões",
  "Guirlanda de balões na frente da mesa",
  "Mini arco de balões",
  "Arco de balões 1 m",
  "Arco de balões 1,5 m",
  "Arco de balões 2 m",
  "Balões no painel",
  "Balões no arco romano de mesa",
  "Outro",
] as const;
export type BalaoTipo = string;

export const TIPO_FESTA_OPTIONS = [
  "Aniversário", "Chá de Bebê", "Chá Bar", "Chá Revelação",
  "Batizado", "Casamento", "Noivado", "Corporativo", "Outro",
] as const;
export type TipoFesta = typeof TIPO_FESTA_OPTIONS[number] | "";

export const HORARIO_AVISO =
  "Retiradas e devoluções: segunda a sábado, 9h às 18h. Não realizamos aos domingos.";

export type ContractDetails = {
  dataEvento: string;
  dataRetirada: string;
  horaRetirada: string;
  dataDevolucao: string;
  horaDevolucao: string;
  nomeAniversariante: string;
  idadeAniversariante: string;
  tipoFesta: string;
  valorTotal: string;
  valorSinal: string;
  valorRestante: string;
  valorCaucao: string;
  kit: KitChecklist;
  balaoTipo: string;
  demaisPecas: string;
  observacoes: string;
  origemCliente: string;
  veioAnuncio: string;
  pagamentoFinalizado: string;
  devolucaoConfirmada: string;
  ativo: string;
  observacoesInternas: string;
  sinalRecebido: string;
  pagamentoFinalRecebido: string;
  caucaoDevolvida: string;
  dataPagamentoFinal: string;
  dataDevolucaoCaucao: string;
  clienteRecorrente: string;
  aceiteContrato: string;
  dataHoraAceite: string;
  fotoDecoracaoUrl: string;
  checklistMontado: string;
  kitSeparado: string;
  caucaoRecebida: string;
  /** Endereço em partes (novo cadastro). O campo `endereco` continua sendo o composto. */
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  /** JSON com a lista de itens exclusivos reservados nesse contrato. */
  itensExclusivos: string;
  /** JSON com os "Itens a Comprar" planejados (nome, quantidade, observação). */
  itensComprar: string;
  /** JSON com os "Itens a Produzir" planejados (produção artesanal interna). */
  itensProduzir: string;
  servicoMontagem: string; // "Sim" | "Não"

};

export type StoredOrder = {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
  endereco: string;
  cidadeUf: string;
  tema: string;
  modalidade: string;
  plano: string;
  status: OrderStatus;
  createdAt: string;
  details?: ContractDetails;
};

const KEY = "lhl_orders";

export function getOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

export function getOrder(id: string): StoredOrder | undefined {
  return getOrders().find((o) => o.id === id);
}

export function saveOrder(data: Omit<StoredOrder, "id" | "status" | "createdAt">): StoredOrder {
  const order: StoredOrder = {
    ...data,
    id: crypto.randomUUID(),
    status: "Pendente",
    createdAt: new Date().toISOString(),
  };
  const all = getOrders();
  all.unshift(order);
  localStorage.setItem(KEY, JSON.stringify(all));
  return order;
}

export function updateOrder(id: string, patch: Partial<StoredOrder>): StoredOrder | undefined {
  const all = getOrders();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) {
    const created: StoredOrder = {
      id, nome: "", cpf: "", rg: "", telefone: "", email: "",
      endereco: "", cidadeUf: "", tema: "", modalidade: "", plano: "",
      status: "Pendente", createdAt: new Date().toISOString(),
      ...patch,
    } as StoredOrder;
    all.unshift(created);
    localStorage.setItem(KEY, JSON.stringify(all));
    return created;
  }
  all[idx] = { ...all[idx], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
  return all[idx];
}

/**
 * Hidrata o espelho local com os pedidos vindos do Sheets.
 *
 * O CONTRATO É A FONTE ÚNICA dos dados comerciais e financeiros. Por isso o
 * que vem da planilha SEMPRE vence o espelho local: valores (Total, Sinal, 
 * Saldo, Caução), pagamentos, e datas alterados no Contrato aparecem 
 * imediatamente em todos os módulos (Checklist, PDF, Dashboard) sem 
 * recálculos paralelos. O local só sobrevive para contratos que a planilha 
 * ainda não conhece e para campos que a planilha devolve vazios.
 */
export function hydrateOrdersCache(remote: StoredOrder[]): StoredOrder[] {
  if (typeof window === "undefined") return remote;
  const local = getOrders();
  const localById = new Map(local.map((o) => [o.id, o] as const));
  const byId = new Map<string, StoredOrder>();

  const preferRemote = <T extends Record<string, unknown>>(l?: T, r?: T): T | undefined => {
    if (!r) return l;
    if (!l) return r;
    const out: Record<string, unknown> = { ...l };
    for (const [k, v] of Object.entries(r)) {
      if (v !== "" && v !== null && v !== undefined) out[k] = v;
    }
    return out as T;
  };

  for (const r of remote) {
    const l = localById.get(r.id);
    byId.set(r.id, {
      ...(l ?? r),
      ...r,
      details: preferRemote(l?.details as never, r.details as never) as ContractDetails | undefined,
    });
  }
  // Contratos criados neste aparelho e ainda não presentes na planilha.
  for (const o of local) if (!byId.has(o.id)) byId.set(o.id, o);

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}


export const emptyKit: KitChecklist = {
  bandejas: 0, cilindros: 0, displays: 0, baloes: 0,
  mesa: 0, tapete: 0, vasoGrego: 0, boloFake: 0,
  arcoSuporte: 0, buchinhoFloreira: 0,
  numeroLed: 0, painelPersonalizado: 0,
  escadinha: 0, happyBirthday: 0,
};

export const kitLabels: Record<keyof KitChecklist, string> = {
  bandejas: "Bandejas",
  cilindros: "Cilindros + Capas",
  displays: "Displays",
  baloes: "Balões",
  mesa: "Mesa",
  tapete: "Tapete",
  vasoGrego: "Vaso Grego",
  boloFake: "Bolo Fake",
  arcoSuporte: "Arco/Suporte",
  buchinhoFloreira: "Buchinho/Floreira",
  numeroLed: "Número em LED",
  painelPersonalizado: "Painel Personalizado",
  escadinha: "Escadinha",
  happyBirthday: "Happy Birthday",
};

/* ============ Tabela de preços oficial LHL Festas ============
 * FONTE ÚNICA: src/data/kits.ts. A tabela legada abaixo existe apenas para
 * manter contratos históricos (Bronze/Prata/Ouro) legíveis e calculáveis.
 */

const LEGACY_PRICE_TABLE: Record<string, Record<string, number>> = {
  "Festa na Mesa": { Bronze: 60, Prata: 100, Ouro: 150, Diamante: 200 },
  "Pegue e Monte Tradicional": { Bronze: 150, Prata: 250, Ouro: 350 },
  "Peg & Monte": { Bronze: 150, Prata: 250, Ouro: 350 },
};

export type Pricing = {
  total: number;
  sinal: number;
  restante: number;
  caucao: number;
  sinalPercent: number;
};

/**
 * Preço e caução vêm dos kits oficiais (src/data/kits.ts).
 * Regra do sinal: sempre 50%.
 */
export function computePricing(
  modalidade: string,
  plano: string,
  _dataEvento?: string,
): Pricing {
  const kit = resolveKit(modalidade, plano);
  // O valor total comercial agora é manual. Se não houver kit ou for legado, retornamos 0 ou o legado.
  const total = 0; 
  const sinalPercent = 0.5;
  const sinal = 0;
  const restante = 0;
  
  let caucao = kit?.caucao ?? 0;
  if (!kit) {
    if (modalidade === "Festa na Mesa") caucao = plano === "Diamante" ? 80 : 50;
    else if (plano) caucao = plano === "Ouro" ? 100 : 80;
  }
  return { total, sinal, restante, caucao, sinalPercent };
}


export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ============ Devolução (mesma data por padrão) ============ */

export function computeDevolucao(dataRetirada: string, _horaRetirada?: string): { data: string; hora: string } {
  return { data: dataRetirada || "", hora: "" };
}

/* ============ Endereço composto ============ */

export function buildEnderecoCompleto(p: {
  rua?: string; numero?: string; bairro?: string; cidade?: string; cep?: string;
}): string {
  const linha1 = [p.rua, p.numero].filter((x) => (x || "").trim()).join(", ");
  const linha2 = [p.bairro, p.cidade].filter((x) => (x || "").trim()).join(", ");
  const cep = (p.cep || "").trim();
  const parts = [linha1, linha2].filter(Boolean).join(" — ");
  return cep ? `${parts}${parts ? " — " : ""}CEP ${cep}` : parts;
}

/* ============ Status derivado ============ */

/**
 * Contrato ativo enquanto a caução ainda não foi devolvida e o contrato não foi cancelado.
 * Quando Caução Devolvida = Sim, o contrato é considerado encerrado automaticamente.
 */
export function isContratoAtivo(o: StoredOrder): boolean {
  if (o.status === "Cancelado") return false;
  const details = o.details;
  if (!details) return true;
  return String(details.caucaoDevolvida || "Não") !== "Sim";
}

/** Conta linhas não vazias em Itens Pendentes / Observações internas. */
export function countItensPendentes(text?: string): number {
  if (!text) return 0;
  return text
    .split(/\r?\n|;|•|·/g)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

/* ============ WhatsApp ============ */

export const WHATSAPP_NUMBER = "5511925543380";

export function buildWhatsAppMessage(o: {
  nome: string; cpf: string; telefone: string; email: string;
  endereco: string;
  tema: string; modalidade: string; plano: string;
  dataEvento: string;
  nomeAniversariante?: string; idadeAniversariante?: string; tipoFesta?: string;
}): string {
  const fmtD = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "—";
  return [
    "Olá, LHL Festas! Gostaria de enviar minha *solicitação de reserva*.",
    "",
    "*DADOS DO CLIENTE*",
    `Nome: ${o.nome}`,
    `CPF: ${o.cpf}`,
    `Telefone: ${o.telefone}`,
    `E-mail: ${o.email}`,
    `Endereço: ${o.endereco}`,
    "",
    "*DADOS DA FESTA*",
    `Tipo da Festa: ${o.tipoFesta || "—"}`,
    ...(o.nomeAniversariante ? [`Aniversariante: ${o.nomeAniversariante}`] : []),
    ...(o.idadeAniversariante ? [`Idade: ${o.idadeAniversariante}`] : []),
    `Tema escolhido: ${o.tema}`,
    `Modalidade: ${o.modalidade}`,
    `Plano: ${o.plano}`,
    `Data do Evento: ${fmtD(o.dataEvento)}`,
    "",
    "Aguardo o retorno da equipe LHL Festas com os valores, disponibilidade e as próximas etapas para elaboração do contrato. Obrigada! ♡",
  ].join("\n");
}
