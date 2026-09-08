import type { StoredOrder } from "./orders-storage";
import type { Lancamento } from "./financeiro-api";
import type { OrdemProducao } from "./producao-api";
import { getContractPaymentStatus, indexRecebimentos } from "./pagamentos";
import { getOperacaoGateStatus } from "./operacao-gate";
import { toDateISO } from "./date-utils";

export type SeveridadeAuditoria = "critica" | "atencao" | "info";

export type AlertaAuditoria = {
  id: string;
  severidade: SeveridadeAuditoria;
  titulo: string;
  detalhe: string;
  contratoId?: string;
  opId?: string;
  cliente?: string;
  tema?: string;
};

export type ResumoAuditoria = {
  alertas: AlertaAuditoria[];
  criticos: number;
  atencoes: number;
  infos: number;
  contratosVerificados: number;
  opsVerificadas: number;
};

export function auditarConsistencia(
  orders: StoredOrder[],
  lancamentos: Lancamento[],
  ops: OrdemProducao[],
): ResumoAuditoria {
  const alertas: AlertaAuditoria[] = [];
  const idx = indexRecebimentos(lancamentos);
  const byId = new Map(orders.map((o) => [o.id, o]));
  const hoje = new Date().toISOString().slice(0, 10);

  const add = (a: AlertaAuditoria) => alertas.push(a);

  for (const order of orders) {
    if (order.status === "Cancelado") continue;
    const fin = getContractPaymentStatus(order, idx);
    const gate = getOperacaoGateStatus(order, lancamentos);
    const evento = toDateISO(order.details?.dataEvento);
    const op = ops.find((x) => x.contratoId === order.id);
    const base = { contratoId: order.id, cliente: order.nome, tema: order.tema };

    if (fin.valorTotal <= 0) {
      add({ id: `sem-valor:${order.id}`, severidade: "atencao", titulo: "Contrato sem valor total", detalhe: "O contrato não possui valor total utilizável para conciliação financeira.", ...base });
    }

    if (evento && evento >= hoje && !gate.liberada) {
      add({ id: `sem-sinal:${order.id}`, severidade: "atencao", titulo: "Festa futura aguardando sinal", detalhe: `Evento em ${evento.split("-").reverse().join("/")} permanece fora da operação até existir recebimento confirmado.`, ...base });
    }

    if (op && !gate.liberada) {
      const houveAvanco = op.status !== "Aguardando Início" || (op.compras || []).some((c) => c.comprado || c.pago || c.statusCompra === "Compra realizada" || c.statusCompra === "Pago") || (op.producao || []).some((p) => p.status !== "Pendente");
      if (houveAvanco) {
        add({ id: `op-sem-sinal:${op.id}`, severidade: "critica", titulo: "Operação avançou sem liberação financeira", detalhe: `A ${op.numero || "OP"} possui avanço operacional, mas o contrato não tem recebimento suficiente para liberar a operação.`, ...base, opId: op.id });
      }
    }

    if ((order.status === "Finalizado" || order.details?.caucaoDevolvida === "Sim") && fin.saldoReceber > 0) {
      add({ id: `finalizado-saldo:${order.id}`, severidade: "critica", titulo: "Contrato finalizado com saldo a receber", detalhe: `Ainda existem ${fin.saldoReceber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} pendentes neste contrato.`, ...base });
    }

    if (fin.totalRecebido > fin.valorTotal && fin.valorTotal > 0) {
      add({ id: `recebido-maior:${order.id}`, severidade: "critica", titulo: "Recebimento acima do valor contratado", detalhe: "As entradas vinculadas ao contrato superam o valor total e precisam ser conciliadas.", ...base });
    }
  }

  for (const op of ops) {
    const order = byId.get(op.contratoId);
    if (!order) {
      add({ id: `op-sem-contrato:${op.id}`, severidade: "critica", titulo: "Ordem de Produção sem contrato", detalhe: `${op.numero || "OP sem número"} aponta para um contrato que não foi encontrado.`, opId: op.id });
      continue;
    }

    for (const item of op.compras || []) {
      if (item.cancelado) continue;
      if (item.pago && !item.solicitacaoId) {
        add({ id: `pago-sem-sol:${op.id}:${item.id}`, severidade: "info", titulo: "Compra paga sem solicitação vinculada", detalhe: `${item.descricao || "Item"} está pago na OP, mas sem ID de solicitação financeira. Pode ser um registro legado.`, contratoId: order.id, opId: op.id, cliente: order.nome, tema: order.tema });
      }
    }
  }

  alertas.sort((a, b) => {
    const peso = { critica: 0, atencao: 1, info: 2 } as const;
    return peso[a.severidade] - peso[b.severidade] || a.titulo.localeCompare(b.titulo, "pt-BR");
  });

  return {
    alertas,
    criticos: alertas.filter((a) => a.severidade === "critica").length,
    atencoes: alertas.filter((a) => a.severidade === "atencao").length,
    infos: alertas.filter((a) => a.severidade === "info").length,
    contratosVerificados: orders.filter((o) => o.status !== "Cancelado").length,
    opsVerificadas: ops.length,
  };
}
