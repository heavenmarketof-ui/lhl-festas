// ============================================================================
// FLUXO ÚNICO DAS COMPRAS — LHL FESTAS
// ============================================================================
import type { StoredOrder } from "./orders-storage";
import type { Solicitacao } from "./solicitacoes-types";
import { criarSolicitacao, registrarPagamentoSolicitacao } from "./solicitacoes-api";
import { createPatrimonioOnSheet, type PatrimonioItem } from "./patrimonio-api";
import { assertOperacaoLiberada } from "./operacao-gate";
import {
  applyCompraStatus, COMPRA_BLOQUEIO_MENSAGEM, COMPRA_STATUS_MENSAGEM,
  compraStatusOf, descricaoCompra, logAction, saveOrdem, fetchOrdens,
  valorPrevistoCompra, valorRealCompra, reconciliarItemComSolicitacao,
  type CompraStatus, type ItemCompra, type OrdemProducao,
} from "./producao-api";

export const NIVEL_COMPRA: Record<CompraStatus, number> = {
  "Aguardando orçamento":1,"Orçamento recebido":2,"Aguardando autorização":3,
  "Compra autorizada":4,"Compra realizada":5,Pago:6,
};
export type AvancoResultado={op:OrdemProducao;mensagem:string;solicitacaoCriada:boolean;patrimonioCriado:boolean;lancamentoId?:string};
export type ConfirmacaoCompra={fornecedor?:string;valorReal?:number;dataCompra?:string;formaPagamento?:string;conta?:string;observacao?:string};
export function solicitacaoAprovada(s?:Solicitacao|null){return s?.status==="autorizada"||s?.status==="lancada"||s?.status==="comprada"}
export function solicitacaoPaga(s?:Solicitacao|null){return s?.status==="lancada"}

export async function mudarEtapaCompra(params:{op:OrdemProducao;itemId:string;status:CompraStatus;order?:StoredOrder|null;solicitacao?:Solicitacao|null;confirmacao?:ConfirmacaoCompra}):Promise<AvancoResultado>{
  const {op:opRecebida,itemId,status,order,solicitacao,confirmacao}=params;
  const orderAtual=await assertOperacaoLiberada(opRecebida.contratoId,order);
  let op=opRecebida;try{const lista=await fetchOrdens();const fresca=lista.find(o=>o.id===opRecebida.id);if(fresca?.compras?.some(c=>c.id===itemId))op=fresca}catch{}
  const itemBruto=op.compras.find(c=>c.id===itemId);if(!itemBruto)throw new Error("Item de compra não encontrado.");
  let item=reconciliarItemComSolicitacao(itemBruto,solicitacao??undefined);
  if(solicitacaoAprovada(solicitacao)&&NIVEL_COMPRA[compraStatusOf(item)]<NIVEL_COMPRA["Compra autorizada"])item={...item,statusCompra:"Compra autorizada"};
  if(item!==itemBruto)op={...op,compras:op.compras.map(c=>c.id===itemId?item:c)};
  validarEtapa(item,status,solicitacao);

  const aplicaConfirmacao=(c:ItemCompra):ItemCompra=>status==="Compra realizada"&&confirmacao?{...c,fornecedor:confirmacao.fornecedor??c.fornecedor,valorReal:confirmacao.valorReal??c.valorReal,dataCompra:confirmacao.dataCompra||c.dataCompra,formaPagamento:confirmacao.formaPagamento||c.formaPagamento,observacao:confirmacao.observacao??c.observacao}:c;
  let atual:OrdemProducao={...op,compras:op.compras.map(c=>{if(c.id!==itemId)return c;c=item;const atualStatus=compraStatusOf(c);if(NIVEL_COMPRA[status]<NIVEL_COMPRA[atualStatus])return c;return applyCompraStatus(aplicaConfirmacao(c),status)})};
  atual=logAction(atual,`Compra "${descricaoCompra(item)}" → ${status}`);
  const opServidor=await fetchOrdens().then(list=>list.find(o=>o.id===op.id));if(opServidor){const {mergeOrdens}=await import("./producao-api");atual=mergeOrdens(opServidor,atual)}

  // Regra crítica: PAGO só é persistido depois que o lançamento financeiro existe.
  if(status!=="Pago") atual=await saveOrdem(atual);

  let solicitacaoCriada=false,patrimonioCriado=false,lancamentoId:string|undefined;
  let salvo=atual.compras.find(c=>c.id===itemId)??item;
  const valor=valorRealCompra(salvo)||valorPrevistoCompra(salvo);

  if(status==="Aguardando autorização"&&!salvo.solicitacaoId){
    const criada=await criarSolicitacao({tipo:"compra_materiais",origem:"ordem_producao",pedidoId:op.contratoId,pedidoCliente:orderAtual.nome||"",ordemProducao:op.numero,origemItemId:salvo.id,itens:[{descricao:salvo.descricao,quantidade:salvo.quantidade||1,unidade:salvo.unidade,valor}],fornecedor:salvo.fornecedor||"",categoria:"Fornecedor",conta:"Caixa",formaPagamento:salvo.formaPagamento||"PIX",valor,descricao:`${salvo.descricao} — ${orderAtual.nome||"Pedido"} (${op.numero})`,observacoes:salvo.fornecedor?`Fornecedor: ${salvo.fornecedor}`:"",dataPrevista:salvo.dataCompra||new Date().toISOString().slice(0,10)}) as {id?:string}|undefined;
    solicitacaoCriada=true;atual=await saveOrdem(logAction({...atual,compras:atual.compras.map(c=>c.id===itemId?{...c,solicitacaoId:String(criada?.id||"")}:c)},`Solicitação Financeira criada para "${descricaoCompra(salvo)}"`));salvo=atual.compras.find(c=>c.id===itemId)??salvo;
  }

  if(status==="Compra realizada"&&salvo.solicitacaoId){try{const {marcarCompradaSemFinanceiro}=await import("./solicitacoes-api");await marcarCompradaSemFinanceiro({id:salvo.solicitacaoId,valorReal:valorRealCompra(salvo)||undefined,fornecedor:confirmacao?.fornecedor||salvo.fornecedor||"",dataCompra:salvo.dataCompra||new Date().toISOString().slice(0,10)})}catch(e){console.error("[Sincronização] Falha ao atualizar solicitação:",e)}}

  if(status==="Pago"){
    if(!(solicitacao||confirmacao))throw new Error("Confirme os dados do pagamento antes de marcar como pago.");
    const res=await registrarPagamentoSolicitacao({id:solicitacao?.id||item.solicitacaoId||"",valor,fornecedor:confirmacao?.fornecedor||salvo.fornecedor||"",formaPagamento:confirmacao?.formaPagamento||salvo.formaPagamento||"PIX",conta:confirmacao?.conta||"Caixa",dataPagamento:salvo.dataCompra||new Date().toISOString().slice(0,10),observacoes:confirmacao?.observacao||salvo.observacao||""}) as {lancamentoId?:string}|undefined;
    lancamentoId=res?.lancamentoId;
    atual=await saveOrdem(logAction(atual,`Pagamento registrado no Fluxo de Caixa para "${descricaoCompra(salvo)}"${lancamentoId?` (lançamento ${lancamentoId})`:""}`));
    salvo=atual.compras.find(c=>c.id===itemId)??salvo;
  }

  if((status==="Compra realizada"||status==="Pago")&&salvo.tipo==="Patrimônio"&&!salvo.integrado){
    const patrimonio:PatrimonioItem={id:crypto.randomUUID(),nome:salvo.descricao,categoria:"Outros",quantidade:salvo.quantidade||1,valorAquisicao:String(valor),dataCompra:salvo.dataCompra||new Date().toISOString().slice(0,10),observacoes:`Cadastrado pela ${op.numero}${orderAtual.nome?` — ${orderAtual.nome}`:""}`,status:"Ativo",createdAt:new Date().toISOString(),ativo:"Sim"};
    await createPatrimonioOnSheet(patrimonio);patrimonioCriado=true;atual=await saveOrdem(logAction({...atual,compras:atual.compras.map(c=>c.id===itemId?{...c,integrado:true}:c)},`Patrimônio cadastrado a partir de "${descricaoCompra(salvo)}"`));
  }

  return {op:atual,solicitacaoCriada,patrimonioCriado,lancamentoId,mensagem:solicitacaoCriada?"Aguardando autorização financeira.":patrimonioCriado?"Compra registrada com sucesso e item cadastrado no Patrimônio.":COMPRA_STATUS_MENSAGEM[status]};
}

function validarEtapa(item:ItemCompra,destino:CompraStatus,solicitacao?:Solicitacao|null){
  if(!String(item.descricao??"").trim())throw new Error("Informe a descrição do material antes de avançar a etapa.");
  if(destino==="Aguardando autorização"&&valorPrevistoCompra(item)<=0&&valorRealCompra(item)<=0)throw new Error("Registre o valor do orçamento antes de enviar para aprovação.");
  if(destino==="Compra autorizada"&&compraStatusOf(item)==="Aguardando autorização"&&!solicitacaoAprovada(solicitacao))throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
  if(destino==="Compra realizada"&&compraStatusOf(item)!=="Compra autorizada"&&compraStatusOf(item)!=="Compra realizada")throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
  if(destino==="Pago"){
    if(compraStatusOf(item)!=="Compra realizada")throw new Error("Marque a compra como realizada antes de registrar o pagamento.");
    if(!solicitacao&&!item.solicitacaoId)throw new Error("Este item não possui Solicitação Financeira vinculada — envie para aprovação primeiro.");
    if(solicitacao&&!solicitacaoAprovada(solicitacao))throw new Error(COMPRA_BLOQUEIO_MENSAGEM);
  }
}
