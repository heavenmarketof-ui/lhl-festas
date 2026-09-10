import * as base from "./solicitacoes-api";
import { fetchOrdersFromSheet } from "./sheets-api";
import { fetchOrdens, type OrdemProducao } from "./producao-api";
import { mudarEtapaCompra } from "./compras-flow";
import { itensAprovacaoSemSolicitacao } from "./solicitacoes-reconciliacao";

export * from "./solicitacoes-api";

let reparoEmCurso: Promise<void> | null = null;

async function reconciliarSolicitacoesFaltantes(): Promise<void> {
  if (reparoEmCurso) return reparoEmCurso;

  reparoEmCurso = (async () => {
    try {
      const [orders, ordens] = await Promise.all([
        fetchOrdersFromSheet(),
        fetchOrdens(),
      ]);

      const orderById = new Map(orders.map((order) => [order.id, order]));

      for (const opOriginal of ordens) {
        const order = orderById.get(opOriginal.contratoId);
        if (!order) continue;

        let opAtual: OrdemProducao = opOriginal;
        const faltantes = itensAprovacaoSemSolicitacao(order, opAtual);

        for (const item of faltantes) {
          try {
            const resultado = await mudarEtapaCompra({
              op: opAtual,
              itemId: item.id,
              status: "Aguardando autorização",
              order,
            });
            opAtual = resultado.op;
          } catch (error) {
            console.error("[Solicitações] Falha ao reconciliar item enviado para aprovação:", error);
          }
        }
      }
    } catch (error) {
      console.error("[Solicitações] Falha ao reconciliar solicitações financeiras:", error);
    }
  })().finally(() => {
    reparoEmCurso = null;
  });

  return reparoEmCurso;
}

export async function fetchSolicitacoes() {
  await reconciliarSolicitacoesFaltantes();
  return base.fetchSolicitacoes();
}
