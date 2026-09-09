import * as base from "./producao-api";
import type { OrdemProducao, StatusProducao, SincronizacaoContrato } from "./producao-api";
import type { StoredOrder } from "./orders-storage";

export * from "./producao-api";

function semPendencias(op: OrdemProducao) {
  const p = base.pendenciasOperacionais(op);
  return p.compras === 0 && p.producao === 0;
}

function normalizarKitPronto(op: OrdemProducao): OrdemProducao {
  if (op.status === "Finalizado") return op;
  const pronto = semPendencias(op);
  if (pronto) {
    return {
      ...op,
      status: "Kit Pronto",
      kitProntoConfirmadoEm: op.kitProntoConfirmadoEm || op.atualizadoEm || op.criadoEm,
      kitProntoConfirmadoPor: op.kitProntoConfirmadoPor || "Sistema",
      kitProntoOrigem: op.kitProntoOrigem || "automático",
      conferencia: {
        ...(op.conferencia || {} as any),
        comprasOk: true,
        producaoOk: true,
        kitProntoOk: true,
      },
    };
  }

  if (op.kitProntoConfirmadoEm || op.status === "Kit Pronto") {
    return {
      ...op,
      status: base.deriveStatus({
        ...op,
        kitProntoConfirmadoEm: undefined,
        kitProntoConfirmadoPor: undefined,
        kitProntoOrigem: undefined,
      }),
      kitProntoConfirmadoEm: undefined,
      kitProntoConfirmadoPor: undefined,
      kitProntoOrigem: undefined,
      conferencia: {
        ...(op.conferencia || {} as any),
        kitProntoOk: false,
      },
    };
  }

  return op;
}

async function garantirPersistenciaAutomatica(op: OrdemProducao): Promise<OrdemProducao> {
  let saved = await base.saveOrdem(op);
  if (saved.status === "Finalizado") return saved;

  if (semPendencias(saved) && !saved.kitProntoConfirmadoEm) {
    const agora = new Date().toISOString();
    saved = await base.saveOrdem({
      ...saved,
      status: "Kit Pronto",
      kitProntoConfirmadoEm: agora,
      kitProntoConfirmadoPor: "Sistema",
      kitProntoOrigem: "automático",
      conferencia: {
        ...(saved.conferencia || {} as any),
        comprasOk: true,
        producaoOk: true,
        kitProntoOk: true,
        conferidoPor: saved.conferencia?.conferidoPor || "Sistema",
        data: saved.conferencia?.data || agora.slice(0, 10),
      },
    });
  }

  return normalizarKitPronto(saved);
}

export async function saveOrdem(op: OrdemProducao): Promise<OrdemProducao> {
  return garantirPersistenciaAutomatica(op);
}

export async function fetchOrdens(): Promise<OrdemProducao[]> {
  return (await base.fetchOrdens()).map(normalizarKitPronto);
}

export async function fetchOrdemByContrato(contratoId: string): Promise<OrdemProducao | undefined> {
  return (await fetchOrdens()).find((o) => o.contratoId === contratoId);
}

export function getOrdensLocal(): OrdemProducao[] {
  return base.getOrdensLocal().map(normalizarKitPronto);
}

export function getOrdemByContrato(list: OrdemProducao[], contratoId: string): OrdemProducao | undefined {
  const op = list.find((o) => o.contratoId === contratoId);
  return op ? normalizarKitPronto(op) : undefined;
}

export async function criarOrdem(order: StoredOrder, existentes: OrdemProducao[]): Promise<OrdemProducao> {
  const op = await base.criarOrdem(order, existentes);
  return garantirPersistenciaAutomatica(op);
}

export async function updateItemProducaoStatus(
  opId: string,
  itemId: string,
  status: StatusProducao,
): Promise<OrdemProducao> {
  const op = await base.updateItemProducaoStatus(opId, itemId, status);
  return garantirPersistenciaAutomatica(op);
}

export async function sincronizarItensContrato(order: StoredOrder): Promise<SincronizacaoContrato | null> {
  const res = await base.sincronizarItensContrato(order);
  if (!res?.op) return res;
  const op = await garantirPersistenciaAutomatica(res.op);
  return { ...res, op };
}

export function aguardandoConfirmacaoKit(_op: OrdemProducao): boolean {
  return false;
}

export function conferenciaCompleta(op: OrdemProducao): boolean {
  if (op.status === "Finalizado") return true;
  return semPendencias(op);
}

export function determineNivelOperacional(op: OrdemProducao): base.NivelOperacional {
  if (op.status === "Finalizado") return "finalizado";
  if (!semPendencias(op)) return "pendente";
  return "kit-pronto";
}

export function deriveStatus(op: OrdemProducao): base.OPStatus {
  if (op.status === "Finalizado") return "Finalizado";
  if (semPendencias(op)) return "Kit Pronto";
  return base.deriveStatus(op);
}

export async function confirmarKitPronto(op: OrdemProducao, _origem: string): Promise<OrdemProducao> {
  if (!semPendencias(op)) {
    throw new Error("Ainda existem itens de compra ou produção pendentes nesta OP.");
  }
  return garantirPersistenciaAutomatica(op);
}
