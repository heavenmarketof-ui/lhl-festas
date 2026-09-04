import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, CONTAS_PADRAO, FORMAS_PAGAMENTO } from "@/lib/financeiro-api";
import { type OrdemProducao, type ItemCompra } from "@/lib/producao-api";
import { mudarEtapaCompra } from "@/lib/compras-flow";
import { toast } from "sonner";
import { CheckCircle2, Wallet, Loader2 } from "lucide-react";

export type RegistrarCompraAlvo = {
  op: OrdemProducao;
  item: ItemCompra;
  cliente: string;
  order?: any;
  solicitacao?: any;
} | null;

interface RegistrarCompraDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  op?: OrdemProducao;
  item?: ItemCompra;
  cliente?: string;
  order?: any;
  solicitacao?: any;
  onSuccess?: (op: OrdemProducao) => void;
  // Suporte legado
  alvo?: RegistrarCompraAlvo;
  onClose?: () => void;
  onAtualizado?: (op: OrdemProducao) => void;
}

export function RegistrarCompraDialog({
  open,
  onOpenChange,
  op: propOp,
  item: propItem,
  cliente: propCliente,
  order: propOrder,
  solicitacao: propSolicitacao,
  onSuccess: propOnSuccess,
  alvo,
  onClose,
  onAtualizado,
}: RegistrarCompraDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [valorReal, setValorReal] = useState<number>(0);
  const [conta, setConta] = useState("Caixa");
  const [formaPagamento, setFormaPagamento] = useState("PIX");

  const currentOpen = open ?? !!alvo;
  const [currentOp, setCurrentOp] = useState<OrdemProducao | undefined>(propOp ?? alvo?.op);
  const currentItem = propItem ?? alvo?.item;
  const currentCliente = propCliente ?? alvo?.cliente ?? "";
  const currentOrder = propOrder ?? alvo?.order;
  const currentSolicitacao = propSolicitacao ?? alvo?.solicitacao;

  useEffect(() => {
    setCurrentOp(propOp ?? alvo?.op);
  }, [propOp, alvo?.op]);
  
  const handleOpenChange = (val: boolean) => {
    onOpenChange?.(val);
    if (!val) {
      onClose?.();
      setStep(1);
    }
  };
  
  const handleSuccess = (op: OrdemProducao) => {
    setCurrentOp(op);
    propOnSuccess?.(op);
    onAtualizado?.(op);
  };

  useEffect(() => {
    if (currentOpen && currentItem) {
      setStep(1);
      setValorReal(currentItem.valorReal || currentItem.valorOrcado || 0);
      setFormaPagamento(currentItem.formaPagamento || "PIX");
      setConta("Caixa");
    }
  }, [currentOpen, currentItem]);

  if (!currentOp || !currentItem) return null;

  // Passo 1: Confirmar Compra na OP
  const handleConfirmarCompra = async () => {
    setLoading(true);
    try {
      const res = await mudarEtapaCompra({
        op: currentOp,
        itemId: currentItem.id,
        status: "Compra realizada",
        order: currentOrder,
        // A autorização financeira é a fonte soberana para liberar a compra.
        // Sem repassá-la, uma OP ainda desatualizada podia bloquear uma compra
        // que já estava autorizada na Central de Solicitações.
        solicitacao: currentSolicitacao,
        confirmacao: {
          valorReal,
          dataCompra: new Date().toISOString().split("T")[0],
        }
      });
      
      handleSuccess(res.op);
      toast.success("Compra marcada como realizada na Ordem de Produção!");
      setStep(2); // Avança para pergunta sobre financeiro
    } catch (error) {
      console.error("Erro ao registrar compra:", error);
      toast.error(error instanceof Error ? error.message : "Falha ao registrar compra.");
    } finally {
      setLoading(false);
    }
  };

  // Passo 3: Registrar no Financeiro (Pago)
  const handleRegistrarFinanceiro = async () => {
    setLoading(true);
    try {
      const res = await mudarEtapaCompra({
        op: currentOp,
        itemId: currentItem.id,
        status: "Pago",
        order: currentOrder,
        solicitacao: currentSolicitacao,
        confirmacao: {
          valorReal,
          conta,
          formaPagamento,
          dataCompra: new Date().toISOString().split("T")[0],
        }
      });
      
      handleSuccess(res.op);
      toast.success("Pagamento registrado com sucesso no Fluxo de Caixa!");
      handleOpenChange(false);
    } catch (error) {
      console.error("Erro financeiro:", error);
      toast.error(error instanceof Error ? error.message : "Falha ao registrar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Registrar Compra
              </DialogTitle>
              <DialogDescription>
                Confirme os detalhes da aquisição do material.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Item</Label>
                <p className="font-bold text-sm">{currentItem.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Quantidade</Label>
                  <p className="font-medium text-sm">{currentItem.quantidade} {currentItem.unidade}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Valor Previsto</Label>
                  <p className="font-medium text-sm">{fmtBRL((currentItem.valorOrcado || 0) * (currentItem.quantidade || 1))}</p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="valorReal" className="text-sm font-bold text-primary">
                  VALOR REAL PAGO (TOTAL)
                </Label>
                <MoneyInput
                  id="valorReal"
                  value={valorReal}
                  onChange={setValorReal}
                  className="text-lg font-bold text-emerald-700"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmarCompra}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                CONFIRMAR COMPRA
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Wallet className="h-5 w-5 text-gold" />
                Autorização Financeira
              </DialogTitle>
              <DialogDescription>
                A compra foi registrada na OP. Deseja lançar o pagamento no Fluxo de Caixa agora?
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center gap-4">
               <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
               </div>
               <p className="text-center text-sm font-medium text-muted-foreground px-4">
                 O item saiu das filas de compra pendente.
               </p>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                AGORA NÃO
              </Button>
              <Button 
                className="bg-gold hover:bg-gold/90 text-amber-950 font-bold"
                onClick={() => setStep(3)}
                disabled={loading}
              >
                REGISTRAR NO FLUXO
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-gold" />
                Confirmar Lançamento
              </DialogTitle>
              <DialogDescription>
                Revise os dados bancários para a saída financeira.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-800/70 uppercase font-bold">Valor a Lançar</span>
                  <span className="text-lg font-bold text-amber-950">{fmtBRL(valorReal)}</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-amber-800/70">Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-amber-800/70">Conta de Origem</Label>
                  <Select value={conta} onValueChange={setConta}>
                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAS_PADRAO.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button 
                className="bg-gold hover:bg-gold/90 text-amber-950 font-bold"
                onClick={handleRegistrarFinanceiro}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                CONFIRMAR SAÍDA
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
