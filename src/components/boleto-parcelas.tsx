import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileText, Send, WalletCards, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fetchLancamentos, parseValor } from "@/lib/financeiro-api";
import { formatDateBR } from "@/lib/date-utils";
import { fetchOrderByIdPublic } from "@/lib/sheets-api";
import { getContractPaymentStatus } from "@/lib/pagamentos";
import {
  atualizarStatusParcela, gerarPlanoParcelas, listarParcelas,
  registrarPagamentoParcela, salvarParcelas, cancelarPlanoParcelas,
  statusEfetivo, STATUS_LABEL, type Parcela, type ParcelaInput,
} from "@/lib/parcelas-api";

const cor=(s:string)=>s==="pago"?"bg-emerald-100 text-emerald-800":s==="vencido"?"bg-red-100 text-red-800":s==="enviado"?"bg-blue-100 text-blue-800":s==="gerado"?"bg-amber-100 text-amber-800":"bg-muted text-muted-foreground";
const cents=(n:number)=>Math.round((Number.isFinite(n)?n:0)*100)/100;

export function BoletoParcelas({contratoId,cliente,saldoPendente,dataEvento,onPagamentoRegistrado}:{contratoId:string;cliente:string;saldoPendente:number;dataEvento?:string;onPagamentoRegistrado?:()=>void}){
 const [parcelas,setParcelas]=useState<Parcela[]>([]),[draft,setDraft]=useState<ParcelaInput[]>([]),[qtd,setQtd]=useState(2),[primeiro,setPrimeiro]=useState(""),[saving,setSaving]=useState(false),[pagando,setPagando]=useState<string|null>(null),[cancelando,setCancelando]=useState(false),[valores,setValores]=useState<Record<string,string>>({});
 const [saldoParcelavel,setSaldoParcelavel]=useState(Math.max(0,saldoPendente||0));
 const [totalRecebido,setTotalRecebido]=useState(0);
 const [vendaConfirmada,setVendaConfirmada]=useState(false);

 async function carregar(){try{const ps=await listarParcelas(contratoId);setParcelas(ps);setDraft(ps.map(p=>({id:p.id,numero:p.numero,total:p.total,valor:p.valor,vencimento:p.vencimento,status:p.status,observacoes:p.observacoes})))}catch{toast.error("Não foi possível carregar os boletos.")}}

 useEffect(()=>{
   let vivo=true;
   setSaldoParcelavel(Math.max(0,saldoPendente||0));
   Promise.all([fetchOrderByIdPublic(contratoId),fetchLancamentos({force:true})]).then(([order,lanc])=>{
     if(!vivo||!order)return;
     const p=getContractPaymentStatus(order,lanc);
     const restanteDeclarado=Math.max(0,parseValor(order.details?.valorRestante));
     const valorTotal=Math.max(0,parseValor(order.details?.valorTotal));
     // Boleto usa o SALDO NEGOCIADO, não o "A Receber" contábil.
     // Em pré-contrato sem nenhum recebimento, todo o valor ainda pode ser parcelado.
     const calculado=p.vendaConfirmada
       ? p.saldoNegociado
       : (restanteDeclarado>0?restanteDeclarado:(valorTotal>0?valorTotal:p.saldoNegociado));
     setSaldoParcelavel(cents(Math.max(0,calculado)));
     setTotalRecebido(cents(p.totalRecebido));
     setVendaConfirmada(p.vendaConfirmada);
   }).catch(()=>{});
   return()=>{vivo=false};
 },[contratoId,saldoPendente]);

 useEffect(()=>{const timer=window.setTimeout(()=>void carregar(),250);return()=>window.clearTimeout(timer)},[contratoId]);

 const total=useMemo(()=>cents(draft.reduce((s,p)=>s+Number(p.valor||0),0)),[draft]);
 const quitado=saldoParcelavel<=.009;
 const temPendentes=parcelas.some(p=>p.status!=="pago");
 const temPagas=parcelas.some(p=>p.status==="pago");
 const planoDesatualizado=!!draft.length&&!temPagas&&Math.abs(total-saldoParcelavel)>.009;

 function montar(){if(saldoParcelavel<=0)return toast.info("Não existe saldo negociado para parcelar.");try{setDraft(gerarPlanoParcelas({quantidade:qtd,valorTotal:saldoParcelavel,primeiroVencimento:primeiro}))}catch(e:any){toast.error(e?.message||"Confira os dados do parcelamento.")}}
 function recalcularPlano(){
   if(temPagas)return toast.error("Já existem parcelas pagas. Ajuste apenas as parcelas restantes para preservar o histórico.");
   const quantidade=draft.length||qtd;
   const primeiroVencimento=draft[0]?.vencimento||primeiro;
   if(!primeiroVencimento)return toast.error("Informe o primeiro vencimento.");
   try{
     const novo=gerarPlanoParcelas({quantidade,valorTotal:saldoParcelavel,primeiroVencimento});
     setQtd(quantidade);setPrimeiro(primeiroVencimento);setDraft(novo);
     toast.success(`Plano recalculado para ${quantidade} parcelas, totalizando ${fmtBRL(saldoParcelavel)}. Salve para confirmar.`);
   }catch(e:any){toast.error(e?.message||"Não foi possível recalcular o plano.")}
 }
 async function salvar(){if(!draft.length)return;if(Math.abs(total-saldoParcelavel)>.009&&!temPagas)return toast.error(`A soma das parcelas deve ser ${fmtBRL(saldoParcelavel)}.`);setSaving(true);try{const ps=await salvarParcelas(contratoId,cliente,draft);setParcelas(ps);setDraft(ps.map(p=>({id:p.id,numero:p.numero,total:p.total,valor:p.valor,vencimento:p.vencimento,status:p.status,observacoes:p.observacoes})));toast.success("Plano de boletos salvo.")}catch(e:any){toast.error(e?.message||"Falha ao salvar os boletos.")}finally{setSaving(false)}}
 async function status(p:Parcela,st:"gerado"|"enviado"){try{await atualizarStatusParcela(p.id,st);await carregar();toast.success(st==="gerado"?"Boleto marcado como gerado.":"Boleto marcado como enviado.")}catch(e:any){toast.error(e?.message||"Falha ao atualizar boleto.")}}
 async function pagar(p:Parcela){const valor=Number(String(valores[p.id]??p.valor).replace(",","."));if(!(valor>0))return toast.error("Informe o valor recebido.");if(!window.confirm(`Confirmar recebimento de ${fmtBRL(valor)} e lançar este pagamento no Fluxo de Caixa?`))return;setPagando(p.id);try{await registrarPagamentoParcela({parcela:p,contratoCliente:cliente,valorPago:valor});await carregar();toast.success(p.numero===1&&!vendaConfirmada?"Primeira parcela recebida. Venda confirmada e pagamento lançado no Fluxo de Caixa.":"Pagamento registrado no boleto e no Fluxo de Caixa.");onPagamentoRegistrado?.()}catch(e:any){toast.error(e?.message||"Falha ao registrar pagamento.")}finally{setPagando(null)}}
 async function cancelar(){if(!temPendentes)return;if(!window.confirm("Cancelar todos os boletos ainda pendentes? Parcelas já pagas serão preservadas no histórico."))return;setCancelando(true);try{const ps=await cancelarPlanoParcelas(contratoId,cliente);setParcelas(ps);setDraft(ps.map(p=>({id:p.id,numero:p.numero,total:p.total,valor:p.valor,vencimento:p.vencimento,status:p.status,observacoes:p.observacoes})));toast.success("Boletos pendentes cancelados. Parcelas pagas foram preservadas.")}catch(e:any){toast.error(e?.message||"Não foi possível cancelar os boletos pendentes.")}finally{setCancelando(false)}}

 return <section className="mt-6 space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary"/><h3 className="font-serif text-xl text-primary">Boleto Parcelado</h3></div><p className="mt-1 text-xs text-muted-foreground">Controle dos boletos e dos recebimentos lançados no financeiro.</p></div><Badge className={quitado?"bg-emerald-100 text-emerald-800":"bg-amber-100 text-amber-800"}>{quitado?"SEM SALDO":"SALDO A PARCELAR"}</Badge></div>

  <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-3 text-sm">
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recebido até agora</p><p className="font-semibold">{fmtBRL(totalRecebido)}</p></div>
    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo negociado</p><p className="font-semibold">{fmtBRL(saldoParcelavel)}</p></div>
    {!vendaConfirmada&&saldoParcelavel>0&&<p className="col-span-2 text-xs text-amber-800">Pré-contrato sem pagamento: o parcelamento pode ser criado normalmente. A venda só será confirmada quando a primeira parcela for realmente recebida.</p>}
  </div>

  {planoDesatualizado&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-900">Plano desatualizado</p><p className="mt-1 text-xs text-amber-800">As parcelas atuais somam {fmtBRL(total)}, mas o saldo negociado do contrato é {fmtBRL(saldoParcelavel)}.</p><Button type="button" size="sm" className="mt-3" onClick={recalcularPlano}><RefreshCw className="mr-2 h-4 w-4"/>Recalcular parcelas</Button></div>}

  {!draft.length&&<div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-3"><div><Label>Quantidade</Label><Input type="number" min={1} max={24} value={qtd} onChange={e=>setQtd(Number(e.target.value))}/></div><div><Label>Primeiro vencimento</Label><Input type="date" value={primeiro} onChange={e=>setPrimeiro(e.target.value)}/></div><div className="flex items-end"><Button type="button" className="w-full" onClick={montar}>Montar parcelamento</Button></div><p className="text-xs text-muted-foreground sm:col-span-3">Saldo a parcelar: <strong>{fmtBRL(saldoParcelavel)}</strong>{dataEvento?` · Evento: ${formatDateBR(dataEvento)}`:""}</p></div>}

  {!!draft.length&&<><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">Plano atual · <strong>{fmtBRL(total)}</strong></span>{temPendentes&&<Button type="button" variant="outline" size="sm" className="text-destructive" disabled={cancelando} onClick={()=>void cancelar()}><Trash2 className="mr-1 h-4 w-4"/>{cancelando?"Cancelando...":"Cancelar boletos pendentes"}</Button>}</div><div className="grid gap-3">{draft.map((d,i)=>{const p=parcelas.find(x=>x.numero===d.numero);const efetivo=p?statusEfetivo(p):"a_gerar";const pago=p?.status==="pago";return <div key={d.numero} className="rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><strong>Parcela {d.numero}/{d.total}</strong><Badge className={cor(efetivo)}>{STATUS_LABEL[efetivo]}</Badge>{d.numero===1&&!vendaConfirmada&&<Badge variant="outline">SINAL PROGRAMADO</Badge>}</div>{p&&!pago&&<div className="flex gap-2">{p.status==="a_gerar"&&<Button type="button" size="sm" variant="outline" onClick={()=>status(p,"gerado")}><FileText className="mr-1 h-3.5 w-3.5"/>Gerado</Button>}{(p.status==="gerado"||efetivo==="vencido")&&<Button type="button" size="sm" variant="outline" onClick={()=>status(p,"enviado")}><Send className="mr-1 h-3.5 w-3.5"/>Enviado</Button>}</div>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label>Valor</Label><Input type="number" step="0.01" disabled={pago} value={d.valor} onChange={e=>setDraft(a=>a.map((x,j)=>j===i?{...x,valor:Number(e.target.value)}:x))}/></div><div><Label>Vencimento</Label><Input type="date" disabled={pago} value={d.vencimento} onChange={e=>setDraft(a=>a.map((x,j)=>j===i?{...x,vencimento:e.target.value}:x))}/></div></div>{p&&!pago&&<div className="mt-3 flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-end"><div className="flex-1"><Label>Valor recebido</Label><Input type="number" step="0.01" value={valores[p.id]??String(p.valor)} onChange={e=>setValores(v=>({...v,[p.id]:e.target.value}))}/></div><Button type="button" onClick={()=>void pagar(p)} disabled={pagando===p.id}><CheckCircle2 className="mr-2 h-4 w-4"/>{pagando===p.id?"Registrando...":"Registrar pagamento"}</Button></div>}</div>})}</div><div className="flex justify-end"><Button type="button" onClick={()=>void salvar()} disabled={saving||planoDesatualizado}>{saving?"Salvando...":"Salvar plano de boletos"}</Button></div></>}

  <div className={`rounded-xl border p-3 ${quitado?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}`}><p className={`text-xs font-semibold ${quitado?"text-emerald-800":"text-amber-800"}`}>{quitado?"Não há saldo negociado para parcelar.":`Saldo negociado a parcelar: ${fmtBRL(saldoParcelavel)}.`}</p></div>
 </section>
}
