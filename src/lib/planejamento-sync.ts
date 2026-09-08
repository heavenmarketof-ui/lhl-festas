// ============================================================================
// SINCRONISMO BIDIRECIONAL DO PLANEJAMENTO — LHL FESTAS
// ----------------------------------------------------------------------------
// Itens nascidos no Contrato (Itens a Comprar / Itens a Produzir) descem para a
// Ordem de Produção pelo vínculo `origemContratoItemId`. Este arquivo cuida do
// caminho inverso: quando o item é excluído (ou cancelado) na OP, ele também
// sai do planejamento do Contrato — assim a sincronização idempotente nunca o
// recria.
//
// Regra de ouro: nada com histórico financeiro ou produtivo é apagado. Itens
// avançados só podem ser CANCELADOS (mantendo valores, fornecedor, solicitação
// e histórico) e saem apenas da lista ativa do Contrato.
// ============================================================================

import { updateOrderOnSheet } from "./sheets-api";
import { updateOrder, type StoredOrder } from "./orders-storage";
import {
  parseItensComprar,
  parseItensProduzir,
  stringifyItensComprar,
  stringifyItensProduzir,
} from "./materiais-catalogo";
import {
  compraTemHistorico,
  producaoTemHistorico,
} from "./producao-api";

export { compraTemHistorico, producaoTemHistorico };

export const MSG_COMPRA_BLOQUEADA =
  "Este item já possui histórico financeiro e não pode ser excluído. Utilize a opção Cancelar item.";

export const MSG_PRODUCAO_BLOQUEADA =
  "Este item já possui histórico de produção e não pode ser excluído. Utilize a opção Cancelar item.";

export const MSG_CONFIRMA_EXCLUIR_COMPRA =
  "Este item foi criado pelo Contrato. Ao excluí-lo, ele também será removido da seção Itens a Comprar do Contrato. Deseja continuar?";

export const MSG_CONFIRMA_EXCLUIR_PRODUCAO =
  "Este item foi criado pelo Contrato. Ao excluí-lo, ele também será removido da seção Itens a Produzir do Contrato. Deseja continuar?";

/** Payload completo do Contrato (o Apps Script grava a linha inteira). */
function orderPayload(order: StoredOrder) {
  const d = order.details;
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    nomeCompleto: order.nome,
    cpf: order.cpf,
    rg: "",
    telefone: order.telefone,
    email: order.email,
    endereco: order.endereco,
    cidadeUf: order.cidadeUf,
    tema: order.tema,
    modalidade: order.modalidade,
    plano: order.plano,
    dataEvento: d?.dataEvento ?? "",
    dataRetirada: d?.dataRetirada ?? "",
    horaRetirada: d?.horaRetirada ?? "",
    dataDevolucao: d?.dataDevolucao ?? "",
    horaDevolucao: d?.horaDevolucao ?? "",
    nomeAniversariante: d?.nomeAniversariante ?? "",
    idadeAniversariante: d?.idadeAniversariante ?? "",
    tipoFesta: d?.tipoFesta ?? "",
    valorTotal: d?.valorTotal ?? "",
    valorSinal: d?.valorSinal ?? "",
    valorRestante: d?.valorRestante ?? "",
    caucao: d?.valorCaucao ?? "",
    demaisPecas: d?.demaisPecas ?? "",
    observacoes: d?.observacoes ?? "",
    kitJson: d?.kit ? JSON.stringify(d.kit) : "",
    origemCliente: d?.origemCliente ?? "",
    veioAnuncio: d?.veioAnuncio ?? "",
    pagamentoFinalizado: d?.pagamentoFinalizado ?? "",
    devolucaoConfirmada: d?.devolucaoConfirmada ?? "",
    ativo: d?.ativo ?? "",
    observacoesInternas: d?.observacoesInternas ?? "",
    sinalRecebido: d?.sinalRecebido ?? "",
    pagamentoFinalRecebido: d?.pagamentoFinalRecebido ?? "",
    caucaoDevolvida: d?.caucaoDevolvida ?? "",
    dataPagamentoFinal: d?.dataPagamentoFinal ?? "",
    dataDevolucaoCaucao: d?.dataDevolucaoCaucao ?? "",
    clienteRecorrente: d?.clienteRecorrente ?? "",
    aceiteContrato: d?.aceiteContrato ?? "",
    dataHoraAceite: d?.dataHoraAceite ?? "",
    fotoDecoracaoUrl: d?.fotoDecoracaoUrl ?? "",
    checklistMontado: d?.checklistMontado ?? "",
    kitSeparado: d?.kitSeparado ?? "",
    caucaoRecebida: d?.caucaoRecebida ?? "",
    rua: d?.rua ?? "",
    numero: d?.numero ?? "",
    bairro: d?.bairro ?? "",
    cidade: d?.cidade ?? "",
    cep: d?.cep ?? "",
    balaoTipo: d?.balaoTipo ?? "",
    itensExclusivos: d?.itensExclusivos ?? "",
    itensComprar: d?.itensComprar ?? "",
    itensProduzir: d?.itensProduzir ?? "",
  };
}

/**
 * Remove do planejamento do Contrato os itens indicados pelos vínculos
 * `origemContratoItemId`. Persiste na planilha (fonte oficial) e no espelho
 * local. Idempotente: se o item já não existir, nada é gravado.
 */
export async function removerPlanejamentoDoContrato(
  order: StoredOrder,
  alvos: { compraOrigemIds?: string[]; producaoOrigemIds?: string[] },
): Promise<StoredOrder> {
  const details = order.details;
  if (!details) return order;

  const compraIds = new Set((alvos.compraOrigemIds ?? []).filter(Boolean));
  const producaoIds = new Set((alvos.producaoOrigemIds ?? []).filter(Boolean));
  if (!compraIds.size && !producaoIds.size) return order;

  const comprar = parseItensComprar(details.itensComprar);
  const produzir = parseItensProduzir(details.itensProduzir);
  const novoComprar = comprar.filter((i) => !compraIds.has(i.id));
  const novoProduzir = produzir.filter((i) => !producaoIds.has(i.id));

  if (novoComprar.length === comprar.length && novoProduzir.length === produzir.length) {
    return order;
  }

  const atualizado: StoredOrder = {
    ...order,
    details: {
      ...details,
      itensComprar: stringifyItensComprar(novoComprar),
      itensProduzir: stringifyItensProduzir(novoProduzir),
    },
  };

  await updateOrderOnSheet(orderPayload(atualizado));
  try {
    updateOrder(atualizado.id, { details: atualizado.details });
  } catch {
    /* espelho local indisponível */
  }
  return atualizado;
}

/* ============================================================================
   FUSÃO A 3 VIAS DO PLANEJAMENTO DO CONTRATO (anti-perda)
   ----------------------------------------------------------------------------
   A tela do Contrato grava a linha inteira. Se ela estiver aberta com uma
   versão antiga, itens cadastrados depois (em outro aparelho ou em outra tela)
   seriam apagados. Regra:
   · base    = o que a tela carregou ao abrir;
   · local   = o que a tela está enviando agora;
   · remoto  = o que está gravado na planilha neste instante.
   Itens que apareceram no remoto DEPOIS da abertura da tela (não estão na base)
   são preservados. Itens que existiam na base e o usuário apagou continuam
   apagados — exclusão explícita é respeitada.
   ========================================================================== */

export function mergePlanejamento<T extends { id: string }>(
  base: T[],
  local: T[],
  remoto: T[],
): T[] {
  const baseIds = new Set(base.map((i) => i.id));
  const localIds = new Set(local.map((i) => i.id));
  const novosNoRemoto = remoto.filter((r) => !localIds.has(r.id) && !baseIds.has(r.id));
  return [...local, ...novosNoRemoto];
}
