import {
  listarParcelasFn,
  salvarParcelasFn,
  atualizarStatusParcelaFn,
  registrarPagamentoParcelaFn,
} from "./parcelas.functions";
import type { Parcela, ParcelaInput, ParcelaStatus } from "./parcelas.server";
import { createLancamento, fetchLancamentos, type Lancamento } from "./financeiro-api";

export type { Parcela, ParcelaInput, ParcelaStatus } from "./parcelas.server";

export const STATUS_LABEL: Record<ParcelaStatus, string> = {
  a_gerar: "A GERAR",
  gerado: "GERADO",
  enviado: "ENVIADO",
  pago: "PAGO",
  vencido: "VENCIDO",
};

export function statusEfetivo(p: Parcela, hoje = new Date().toISOString().slice(0, 10)): ParcelaStatus {
  if (p.status === "pago") return "pago";
  if (p.vencimento && p.vencimento < hoje) return "vencido";
  return p.status;
}

export async function listarParcelas(contratoId: string): Promise<Parcela[]> {
  return await listarParcelasFn({ data: { contratoId } } as any) as Parcela[];
}

export async function salvarParcelas(
  contratoId: string,
  contratoCliente: string,
  parcelas: ParcelaInput[],
): Promise<Parcela[]> {
  return await salvarParcelasFn({ data: { contratoId, contratoCliente, parcelas } } as any) as Parcela[];
}

export async function atualizarStatusParcela(
  id: string,
  status: Exclude<ParcelaStatus, "pago">,
  observacoes?: string,
): Promise<Parcela> {
  return await atualizarStatusParcelaFn({ data: { id, status, observacoes } } as any) as Parcela;
}

export function gerarPlanoParcelas(opts: {
  quantidade: number;
  valorTotal: number;
  primeiroVencimento: string;
}): ParcelaInput[] {
  const qtd = Math.max(1, Math.min(24, Math.floor(opts.quantidade || 1)));
  const totalCentavos = Math.round(Math.max(0, opts.valorTotal) * 100);
  const base = Math.floor(totalCentavos / qtd);
  let sobra = totalCentavos - base * qtd;

  const [ano, mes, dia] = opts.primeiroVencimento.split("-").map(Number);
  if (!ano || !mes || !dia) throw new Error("Informe a data do primeiro vencimento.");

  return Array.from({ length: qtd }, (_, i) => {
    const valorCentavos = base + (sobra > 0 ? 1 : 0);
    if (sobra > 0) sobra--;

    const alvo = new Date(ano, mes - 1 + i, 1);
    const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    const d = Math.min(dia, ultimoDia);
    const vencimento = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    return {
      numero: i + 1,
      total: qtd,
      valor: valorCentavos / 100,
      vencimento,
      status: "a_gerar",
      observacoes: "",
    };
  });
}

/**
 * Pagamento idempotente: o lançamento do fluxo usa um ID determinístico por parcela.
 * Mesmo que a tela seja recarregada no meio do processo, uma nova tentativa não duplica a entrada.
 */
export async function registrarPagamentoParcela(opts: {
  parcela: Parcela;
  contratoCliente: string;
  valorPago: number;
  data?: string;
}): Promise<Parcela> {
  const lancamentoId = `boleto-parcela-${opts.parcela.id}`;
  const data = opts.data || new Date().toISOString().slice(0, 10);

  const result = await registrarPagamentoParcelaFn({
    data: {
      id: opts.parcela.id,
      valorPago: opts.valorPago,
      lancamentoId,
    },
  } as any) as { parcela: Parcela; criarLancamento: boolean };

  // Garante que o lançamento existe no Fluxo, sem duplicar em reenvios/reloads.
  const atuais = await fetchLancamentos({ force: true }).catch(() => [] as Lancamento[]);
  if (!atuais.some((l) => l.id === lancamentoId)) {
    const lancamento: Lancamento = {
      id: lancamentoId,
      data,
      tipo: "Entrada",
      categoria: "Pagamento Boleto",
      descricao: `Pagamento boleto ${opts.parcela.numero}/${opts.parcela.total} — ${opts.contratoCliente}`,
      valor: opts.valorPago,
      formaPagamento: "Boleto",
      conta: "PIX",
      beneficiario: opts.contratoCliente,
      observacoes: `Parcela ${opts.parcela.numero}/${opts.parcela.total}. Vencimento ${opts.parcela.vencimento}.`,
      contratoId: opts.parcela.contratoId,
      origem: `boleto_parcela:${opts.parcela.id}`,
      createdAt: new Date().toISOString(),
      ativo: "Sim",
    };
    await createLancamento(lancamento);
  }

  return result.parcela;
}
