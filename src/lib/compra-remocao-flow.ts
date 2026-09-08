import { decidirRemocaoCompra, type DecisaoRemocaoCompra } from "./compra-remocao";
import {
  fetchSolicitacao,
  cancelarSolicitacao,
  revogarAutorizacao,
} from "./solicitacoes-api";
import { fetchOrdens, saveOrdem, type OrdemProducao } from "./producao-api";

export type ResultadoRemocaoCompra = {
  op: OrdemProducao;
  decisao: DecisaoRemocaoCompra;
  solicitacaoCancelada: boolean;
  autorizacaoRevogada: boolean;
};

/**
 * Remove uma necessidade de compra sem destruir histórico financeiro.
 *
 * - item inicial: exclusão física + tombstone para o merge não ressuscitar;
 * - item com histórico: permanece na OP como cancelado;
 * - item comprado/pago: nunca é apagado como se não tivesse existido;
 * - solicitação pendente é cancelada;
 * - solicitação autorizada tem a autorização revogada e depois é cancelada;
 * - solicitação já comprada permanece como histórico da compra realizada;
 * - solicitação lançada bloqueia a remoção e exige correção pelo Financeiro.
 */
export async function removerItemCompraSeguro(
  opId: string,
  itemId: string,
): Promise<ResultadoRemocaoCompra> {
  const op = (await fetchOrdens()).find((x) => x.id === opId);
  if (!op) throw new Error("Ordem de Produção não encontrada.");

  const item = (op.compras || []).find((x) => x.id === itemId);
  if (!item) throw new Error("Item de compra não encontrado nesta Ordem de Produção.");

  const decisao = decidirRemocaoCompra(item);
  if (decisao.acao === "bloquear") throw new Error(decisao.motivo);

  let solicitacaoCancelada = false;
  let autorizacaoRevogada = false;

  if (item.solicitacaoId) {
    const solicitacao = await fetchSolicitacao(item.solicitacaoId);
    if (solicitacao) {
      if (solicitacao.lancamentoId || solicitacao.status === "lancada") {
        throw new Error("Este item já possui lançamento financeiro. Corrija pelo Financeiro em vez de remover o histórico.");
      }

      if (solicitacao.status === "autorizada") {
        await revogarAutorizacao(solicitacao.id);
        autorizacaoRevogada = true;
        await cancelarSolicitacao(solicitacao.id, "Item removido da necessidade operacional");
        solicitacaoCancelada = true;
      } else if (solicitacao.status === "pendente") {
        await cancelarSolicitacao(solicitacao.id, "Item removido da necessidade operacional");
        solicitacaoCancelada = true;
      }
      // "comprada" é evidência histórica: não apagamos nem tentamos reescrever
      // o passado. Apenas o item operacional será marcado como cancelado.
    }
  }

  const agora = new Date().toISOString();
  const historico = [
    {
      id: crypto.randomUUID(),
      usuario: "Sistema",
      dataHora: agora,
      acao: decisao.acao === "excluir"
        ? `Item de compra removido sem histórico: ${item.descricao || item.id}`
        : `Item de compra cancelado e preservado no histórico: ${item.descricao || item.id}`,
    },
    ...(op.historico || []),
  ];

  const atualizada: OrdemProducao = decisao.acao === "excluir"
    ? {
        ...op,
        compras: (op.compras || []).filter((x) => x.id !== item.id),
        itensExcluidos: Array.from(new Set([...(op.itensExcluidos || []), item.id])),
        historico,
        atualizadoEm: agora,
      }
    : {
        ...op,
        compras: (op.compras || []).map((x) => x.id === item.id ? { ...x, cancelado: true } : x),
        historico,
        atualizadoEm: agora,
      };

  const salva = await saveOrdem(atualizada);
  return { op: salva, decisao, solicitacaoCancelada, autorizacaoRevogada };
}
