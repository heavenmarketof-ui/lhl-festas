// ============================================================================
// FLUXO ÚNICO DAS COMPRAS — LHL FESTAS
// ----------------------------------------------------------------------------
// Um item de compra só avança por este arquivo. A Central de Produção e a
// Ordem de Produção usam exatamente a mesma função — não existem dois fluxos.
//
// Cadastrar item → Salvar item → Aguardando orçamento → Orçamento recebido →
// Enviar para aprovação (nasce a Solicitação Financeira) → Aprovação →
// Compra autorizada → Marcar compra realizada → Registrar pagamento →
// Fluxo de Caixa.
//
// Regras de propriedade do dado (arquitetura oficial):
//  · Contrato          → cliente, tema, kit, datas, valores, caução, pagamentos.
//  · Ordem de Produção → compras, produção, separação, conferência, patrimônio.
//  · Solicitações      → autorizar, recusar, cancelar, auditar.
//  · Gestão Financeira → lançamentos do Fluxo de Caixa.
// ============================================================================

import type { StoredOrder } from "./orders-storage";
import type { Solicitacao } from "./solicitacoes-types";
import { criarSolicitacao, registrarPagamentoSolicitacao } from "./solicitacoes-api";
import { createPatrimonioOnSheet, type PatrimonioItem } from "./patrimonio-api";
import {
  applyCompraStatus,
  COMPRA_BLOQUEIO_MENSAGEM,
  COMPRA_STATUS_MENSAGEM,
  compraStatusOf,
  descricaoCompra,
  logAction,
  saveOrdem,
  fetchOrdens,
  valorPrevistoCompra,
  valorRealCompra,
  reconciliarItemComSolicitacao,
  type CompraStatus,
  type ItemCompra,
  type OrdemProducao,
} from "./producao-api";

/** Hierarquia oficial das etapas — base da regra de soberania/monotonicidade. */
export const NIVEL_COMPRA: Record<CompraStatus, number> = {
  "Aguardando orçamento": 1,
  "Orçamento recebido": 2,
  "Aguardando autorização": 3,
  "Compra autorizada": 4,
  "Compra realizada": 5,
  Pago: 6,
};

export type AvancoResultado = {
  op: OrdemProducao;
  mensagem: string;
  solicitacaoCriada: boolean;
  patrimonioCriado: boolean;
  lancamentoId?: string;
};

/** Dados finais confirmados pelo usuário ao marcar a compra como realizada. */
export type ConfirmacaoCompra = {
  fornecedor?: string;
  valorReal?: number;
  dataCompra?: string;
  formaPagamento?: string;
  conta?: string;
  observacao?: string;
};

/**
 * Solicitação já aprovada — libera "Marcar compra realizada" e o registro do
 * pagamento. "comprada" é uma compra já realizada sem financeiro: continua
 * autorizada e pode ser lançada no Fluxo de Caixa depois.
 */
export function solicitacaoAprovada(s?: Solicitacao | null): boolean {
  return s?.status === "autorizada" || s?.status === "lancada" || s?.status === "comprada";
}

/** Pagamento já lançado no Fluxo de Caixa. */
export function solicitacaoPaga(s?: Solicitacao | null): boolean {
  return s?.status === "lancada";
}

/**
 * Valida e aplica a próxima etapa de um item de compra, gravando na fonte
 * oficial (planilha) e acionando a Solicitação Financeira quando aplicável.
 * Lança Error com mensagem pronta para o usuário quando a etapa não é válida.
 */
export async function mudarEtapaCompra(params: {
  op: OrdemProducao;
  itemId: string;
  status: CompraStatus;
  order?: StoredOrder | null;
  solicitacao?: Solicitacao | null;
  confirmacao?: ConfirmacaoCompra;
}): Promise<AvancoResultado> {
  const { op: opRecebida, itemId, status, order, solicitacao, confirmacao } = params;

  // -------------------------------------------------------------------------
  // 1) A validação NUNCA usa uma versão antiga da OP. Buscamos a OP mais
  //    recente, localizamos o item pelo itemId e reconciliamos com a
  //    Solicitação Financeira. Uma autorização válida no financeiro não pode
  //    ser anulada por um status desatualizado da OP.
  // -------------------------------------------------------------------------
  let op = opRecebida;
  try {
    const lista = await fetchOrdens();
    const fresca = lista.find((o) => o.id === opRecebida.id);
    if (fresca?.compras?.some((c) => c.id === itemId)) op = fresca;
  } catch {
    /* planilha indisponível — segue com a versão em mãos */
  }

  const itemBruto = op.compras.find((c) => c.id === itemId);
  if (!itemBruto) throw new Error("Item de compra não encontrado.");

  const itemReconciliado = reconciliarItemComSolicitacao(itemBruto, solicitacao ?? undefined);
  let item = itemReconciliado;

  // Autorização financeira válida ⇒ o item está, no mínimo, em "Compra autorizada".
  if (
    solicitacaoAprovada(solicitacao) &&
    NIVEL_COMPRA[compraStatusOf(item)] < NIVEL_COMPRA["Compra autorizada"]
  ) {
    item = { ...item, statusCompra: "Compra autorizada" };
  }

  // A OP em memória passa a refletir o item reconciliado.
  if (item !== itemBruto) {
    op = { ...op, compras: op.compras.map((c) => (c.id === itemId ? item : c)) };
  }

  validarEtapa(item, status, solicitacao);

  // "Compra realizada" grava os dados finais confirmados pelo usuário.
  const aplicaConfirmacao = (c: ItemCompra): ItemCompra =>
    status === "Compra realizada" && confirmacao
      ? {
          ...c,
          fornecedor: confirmacao.fornecedor ?? c.fornecedor,
          valorReal: confirmacao.valorReal ?? c.valorReal,
          dataCompra: confirmacao.dataCompra || c.dataCompra,
          formaPagamento: confirmacao.formaPagamento || c.formaPagamento,
          observacao: confirmacao.observacao ?? c.observacao,
        }
      : c;

  let atual: OrdemProducao = {
    ...op,
    compras: op.compras.map((c) => {
      if (c.id !== itemId) return c;
      c = item;
      const novoStatus = status;
      const atualStatus = compraStatusOf(c);
      
      // REGRA DE SOBERANIA: Não permite rebaixar o status
      const niveis = NIVEL_COMPRA;

      if (niveis[novoStatus] < niveis[atualStatus]) {
        console.warn(`[Soberania] Tentativa de rebaixar ${c.descricao}: ${atualStatus} -> ${novoStatus}. Ignorado.`);
        return c;
      }
      
      return applyCompraStatus(aplicaConfirmacao(c), novoStatus);
    }),
  };
  atual = logAction(atual, `Compra "${descricaoCompra(item)}" → ${status}`);
  
  // MERGE ANTES DE SALVAR: Garante que não sobrescrevemos avanços de outros itens na mesma OP
  const opServidor = await fetchOrdens().then((list: OrdemProducao[]) => list.find((o: OrdemProducao) => o.id === op.id));

  if (opServidor) {
    const { mergeOrdens } = await import("./producao-api");
    atual = mergeOrdens(opServidor, atual);
  }
  
  atual = await saveOrdem(atual);

  let solicitacaoCriada = false;
  let patrimonioCriado = false;
  let lancamentoId: string | undefined;
  const salvo = atual.compras.find((c) => c.id === itemId) ?? item;
  const valor = valorRealCompra(salvo) || valorPrevistoCompra(salvo);

  // A Solicitação Financeira nasce ao ENVIAR PARA APROVAÇÃO — nunca depois.
  if (status === "Aguardando autorização" && !salvo.solicitacaoId) {
    const criada = (await criarSolicitacao({
      tipo: "compra_materiais",
      origem: "ordem_producao",
      pedidoId: op.contratoId,
      pedidoCliente: order?.nome || "",
      ordemProducao: op.numero,
      origemItemId: salvo.id,
      itens: [
        {
          descricao: salvo.descricao,
          quantidade: salvo.quantidade || 1,
          unidade: salvo.unidade,
          valor,
        },
      ],
      fornecedor: salvo.fornecedor || "",
      categoria: "Fornecedor",
      conta: "Caixa",
      formaPagamento: salvo.formaPagamento || "PIX",
      valor,
      descricao: `${salvo.descricao} — ${order?.nome || "Pedido"} (${op.numero})`,
      observacoes: salvo.fornecedor ? `Fornecedor: ${salvo.fornecedor}` : "",
      dataPrevista: salvo.dataCompra || new Date().toISOString().slice(0, 10),
    })) as { id?: string } | undefined;
    solicitacaoCriada = true;
    atual = await saveOrdem(
      logAction(
        {
          ...atual,
          compras: atual.compras.map((c) =>
            c.id === itemId
              ? { ...c, solicitacaoId: String(criada?.id || "") }
              : c,
          ),
        },
        `Solicitação Financeira criada para "${descricaoCompra(salvo)}"`,
      ),
    );
  }

  // Compras de Patrimônio entram no acervo quando a compra é realizada.
  if ((status === "Compra realizada" || status === "Pago") && salvo.tipo === "Patrimônio" && !salvo.integrado) {
    const patrimonio: PatrimonioItem = {
      id: crypto.randomUUID(),
      nome: salvo.descricao,
      categoria: "Outros",
      quantidade: salvo.quantidade || 1,
      valorAquisicao: String(valor),
      dataCompra: salvo.dataCompra || new Date().toISOString().slice(0, 10),
      observacoes: `Cadastrado pela ${op.numero}${order?.nome ? ` — ${order.nome}` : ""}`,
      status: "Ativo",
      createdAt: new Date().toISOString(),
      ativo: "Sim",
    };
    await createPatrimonioOnSheet(patrimonio);
    patrimonioCriado = true;
    atual = await saveOrdem(
      logAction(
        {
          ...atual,
          compras: atual.compras.map((c) => (c.id === itemId ? { ...c, integrado: true } : c)),
        },
        `Patrimônio cadastrado a partir de "${descricaoCompra(salvo)}"`,
      ),
    );
  }
  
  // GARANTIA DE SINCRONIZAÇÃO (SOMENTE STATUS): se a compra foi realizada, a
  // solicitação vinculada sai da fila ativa. Nenhum lançamento financeiro é
  // criado aqui — "Agora não" significa compra realizada e caixa intocado.
  if (status === "Compra realizada" && salvo.solicitacaoId) {
    try {
      const { marcarCompradaSemFinanceiro } = await import("./solicitacoes-api");
      await marcarCompradaSemFinanceiro({
        id: salvo.solicitacaoId,
        valorReal: valorRealCompra(salvo) || undefined,
        fornecedor: confirmacao?.fornecedor || salvo.fornecedor || "",
        dataCompra: salvo.dataCompra || new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      console.error("[Sincronização] Falha ao atualizar status da solicitação:", e);
    }
  }

  // O lançamento no Fluxo de Caixa nasce SOMENTE no registro do pagamento.
  // O servidor garante idempotência: nunca há dois lançamentos para o item.
  if (status === "Pago" && (solicitacao || confirmacao)) {
    const res = (await registrarPagamentoSolicitacao({
      id: solicitacao?.id || item.solicitacaoId || "",
      valor: valor,
      fornecedor: confirmacao?.fornecedor || salvo.fornecedor || "",
      formaPagamento: confirmacao?.formaPagamento || salvo.formaPagamento || "PIX",
      conta: confirmacao?.conta || "Caixa",
      dataPagamento: salvo.dataCompra || new Date().toISOString().slice(0, 10),
      observacoes: confirmacao?.observacao || salvo.observacao || "",
    })) as { lancamentoId?: string } | undefined;
    
    lancamentoId = res?.lancamentoId;
    atual = await saveOrdem(
      logAction(
        atual,
        `Pagamento registrado no Fluxo de Caixa para "${descricaoCompra(salvo)}"${
          lancamentoId ? ` (lançamento ${lancamentoId})` : ""
        }`,
      ),
    );
  }

  return {
    op: atual,
    solicitacaoCriada,
    patrimonioCriado,
    lancamentoId,
    mensagem: solicitacaoCriada
      ? "Aguardando autorização financeira."
      : patrimonioCriado
        ? "Compra registrada com sucesso e item cadastrado no Patrimônio."
        : COMPRA_STATUS_MENSAGEM[status],
  };
}

/** Regras do fluxo — impedem atalhos e ações inválidas. */
function validarEtapa(item: ItemCompra, destino: CompraStatus, solicitacao?: Solicitacao | null) {
  if (!String(item.descricao ?? "").trim()) {
    throw new Error("Informe a descrição do material antes de avançar a etapa.");
  }
  if (
    destino === "Aguardando autorização" &&
    valorPrevistoCompra(item) <= 0 &&
    valorRealCompra(item) <= 0
  ) {
    throw new Error("Registre o valor do orçamento antes de enviar para aprovação.");
  }
  if (
    destino === "Compra autorizada" &&
    compraStatusOf(item) === "Aguardando autorização" &&
    !solicitacaoAprovada(solicitacao)
  ) {
    throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
  }
  if (destino === "Compra realizada" && compraStatusOf(item) !== "Compra autorizada") {
    // Exceção: permitir se já estiver como "Compra realizada" (edição de valor real)
    if (compraStatusOf(item) !== "Compra realizada") {
      throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
    }
  }
  if (destino === "Pago") {
    if (compraStatusOf(item) !== "Compra realizada") {
      throw new Error("Marque a compra como realizada antes de registrar o pagamento.");
    }
    if (!solicitacao && !item.solicitacaoId) {
      throw new Error(
        "Este item não possui Solicitação Financeira vinculada — envie para aprovação primeiro.",
      );
    }
    if (solicitacao && !solicitacaoAprovada(solicitacao)) {
      throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
    }
  }
}
