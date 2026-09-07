// ============================================================================
// CONTAS A PAGAR — FLUXO SEGURO LHL FESTAS
// ----------------------------------------------------------------------------
// Regra: obrigação, baixa (pago) e saída no Fluxo de Caixa são estados
// diferentes. Uma conta paga pode existir sem lançamento financeiro, mas um
// mesmo pagamento nunca deve gerar duas saídas no Fluxo de Caixa.
// ============================================================================

import {
  createLancamento,
  fetchLancamentos,
  parseValor,
  type ContaPagar,
  type Lancamento,
} from "./financeiro-api";

export type ContaPagarFinanceiroStatus =
  | "pendente"
  | "paga_sem_lancamento"
  | "paga_lancada";

export function origemContaPagar(contaId: string): string {
  return `conta_pagar:${String(contaId || "").trim()}`;
}

export function lancamentoDaConta(
  conta: ContaPagar,
  lancamentos: Lancamento[],
): Lancamento | undefined {
  const origem = origemContaPagar(conta.id);
  return lancamentos.find(
    (l) =>
      (l.ativo || "Sim").toLowerCase() === "sim" &&
      l.tipo === "Saída" &&
      String(l.origem || "").trim() === origem,
  );
}

export function statusFinanceiroConta(
  conta: ContaPagar,
  lancamentos: Lancamento[],
): ContaPagarFinanceiroStatus {
  if (conta.pago !== "Sim") return "pendente";
  return lancamentoDaConta(conta, lancamentos) ? "paga_lancada" : "paga_sem_lancamento";
}

/**
 * Registra a saída de uma conta já paga com idempotência.
 *
 * 1. Procura lançamento já existente pela origem estável conta_pagar:<id>.
 * 2. Se existir, retorna o mesmo lançamento e NÃO cria outro.
 * 3. Se não existir, cria uma saída com ID estável.
 * 4. Se a requisição falhar após o Apps Script possivelmente ter processado,
 *    relê o Fluxo antes de propagar erro. Assim um timeout não induz retry cego.
 */
export async function registrarContaPagaNoFluxo(
  conta: ContaPagar,
  opts?: {
    contaCaixa?: string;
    formaPagamento?: string;
    lancamentos?: Lancamento[];
  },
): Promise<{ lancamento: Lancamento; criado: boolean }> {
  if (conta.pago !== "Sim") {
    throw new Error("A conta precisa estar marcada como paga antes do lançamento no Fluxo de Caixa.");
  }

  const atuais = opts?.lancamentos ?? (await fetchLancamentos({ force: true }));
  const existente = lancamentoDaConta(conta, atuais);
  if (existente) return { lancamento: existente, criado: false };

  const origem = origemContaPagar(conta.id);
  const lancamento: Lancamento = {
    id: `conta-pagar-${conta.id}`,
    data: conta.dataPagamento || new Date().toISOString().slice(0, 10),
    tipo: "Saída",
    categoria: conta.categoria || "Outros",
    descricao: `Pagamento — ${conta.descricao}`,
    valor: parseValor(conta.valor),
    formaPagamento: opts?.formaPagamento || "PIX",
    conta: opts?.contaCaixa || "PIX",
    beneficiario: conta.fornecedor || "",
    observacoes: conta.observacoes || "",
    origem,
    createdAt: new Date().toISOString(),
    ativo: "Sim",
  };

  try {
    await createLancamento(lancamento);
  } catch (erro) {
    // POST pode ter sido aplicado antes de um timeout de rede. Nunca fazemos
    // retry cego: primeiro conferimos a fonte oficial.
    try {
      const depoisDoErro = await fetchLancamentos({ force: true });
      const confirmado = lancamentoDaConta(conta, depoisDoErro);
      if (confirmado) return { lancamento: confirmado, criado: false };
    } catch {
      // mantém o erro original, que contém o contexto mais útil
    }
    throw erro;
  }

  // Confirmação final evita a UI assumir sucesso sem evidência da fonte oficial.
  try {
    const confirmados = await fetchLancamentos({ force: true });
    const salvo = lancamentoDaConta(conta, confirmados);
    if (salvo) return { lancamento: salvo, criado: true };
  } catch {
    // A criação respondeu sucesso; em indisponibilidade apenas devolvemos o
    // lançamento conhecido, sem disparar novo POST.
  }

  return { lancamento, criado: true };
}

/**
 * Uma conta com saída já lançada não deve ser simplesmente excluída nem
 * desmarcada como paga sem tratar o lançamento financeiro correspondente.
 */
export function podeDesfazerBaixaSemAjusteFinanceiro(
  conta: ContaPagar,
  lancamentos: Lancamento[],
): boolean {
  return !lancamentoDaConta(conta, lancamentos);
}
