// ============================================================================
// CONFIRMAÇÃO HUMANA DE "KIT PRONTO" — LHL FESTAS
// ----------------------------------------------------------------------------
// O sistema NUNCA marca uma OP como Kit Pronto sozinho. Quando não há mais
// compras nem produções pendentes, ele apenas avisa e pede a confirmação de
// uma pessoa. Ao confirmar, registramos usuário, data/hora, origem da ação,
// número da OP e contrato no histórico da Ordem de Produção.
//
// REGRA SOBERANA: pré-contrato sem recebimento confirmado não pode avançar na
// operação. O diálogo consulta o gate financeiro antes de habilitar a ação.
// ============================================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, PackageCheck } from "lucide-react";
import {
  confirmarKitPronto,
  pendenciasOperacionais,
  type OrdemProducao,
} from "@/lib/producao-api";
import {
  assertOperacaoLiberada,
  OPERACAO_BLOQUEADA_SEM_RECEBIMENTO,
  resolveOperacaoGate,
  type OperacaoGateStatus,
} from "@/lib/operacao-gate";

export type ConfirmarKitAlvo = {
  op: OrdemProducao;
  cliente?: string;
  /** De onde a ação partiu: "Dashboard", "Central de Produção", "OP". */
  origem: string;
};

export function ConfirmarKitDialog({
  alvo,
  onClose,
  onAtualizado,
}: {
  alvo: ConfirmarKitAlvo | null;
  onClose: () => void;
  onAtualizado?: (op: OrdemProducao) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [checandoGate, setChecandoGate] = useState(false);
  const [gate, setGate] = useState<OperacaoGateStatus | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!alvo) {
      setGate(null);
      setChecandoGate(false);
      return;
    }

    setChecandoGate(true);
    setGate(null);
    void resolveOperacaoGate(alvo.op.contratoId)
      .then(({ status }) => {
        if (ativo) setGate(status);
      })
      .catch(() => {
        if (ativo) {
          setGate({
            liberada: false,
            totalRecebido: 0,
            origemLegado: false,
            motivo: "Não foi possível confirmar o recebimento deste contrato agora.",
          });
        }
      })
      .finally(() => {
        if (ativo) setChecandoGate(false);
      });

    return () => {
      ativo = false;
    };
  }, [alvo?.op.id, alvo?.op.contratoId]);

  if (!alvo) return null;

  const pend = pendenciasOperacionais(alvo.op);
  const temPendencias = pend.compras > 0 || pend.producao > 0;
  const semRecebimento = !checandoGate && gate?.liberada === false;
  const bloqueado = temPendencias || checandoGate || semRecebimento;

  const confirmar = async () => {
    if (bloqueado) {
      if (semRecebimento) toast.error(gate?.motivo || OPERACAO_BLOQUEADA_SEM_RECEBIMENTO);
      return;
    }
    setSalvando(true);
    try {
      // Barreira arquitetural executada imediatamente antes da mutation.
      // Assim, mesmo uma tela antiga ou estado visual desatualizado não consegue
      // confirmar Kit Pronto sem recebimento real vinculado ao contrato.
      await assertOperacaoLiberada(alvo.op.contratoId);

      const atualizada = await confirmarKitPronto(alvo.op, alvo.origem);
      toast.success(`Kit Pronto confirmado — ${atualizada.numero}`);
      onAtualizado?.(atualizada);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível confirmar o Kit Pronto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !salvando && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" /> Confirmar Kit Pronto?
          </DialogTitle>
          <DialogDescription>
            {alvo.op.numero}
            {alvo.cliente ? ` · ${alvo.cliente}` : ""}
          </DialogDescription>
        </DialogHeader>

        {checandoGate ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Conferindo recebimento do contrato...
          </div>
        ) : semRecebimento ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Operação bloqueada — aguardando sinal
            </p>
            <p className="mt-1 text-xs">
              {gate?.motivo || OPERACAO_BLOQUEADA_SEM_RECEBIMENTO}
            </p>
          </div>
        ) : temPendencias ? (
          <p className="text-sm text-destructive">
            Ainda existem {pend.compras} compra(s) e {pend.producao} produção(ões) pendentes
            nesta Ordem de Produção. Conclua os itens antes de confirmar.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800">
              Recebimento confirmado · operação liberada.
            </div>
            <p>
              Todos os itens desta festa foram concluídos:{" "}
              <strong className="text-foreground">{pend.totalCompras} compra(s)</strong> e{" "}
              <strong className="text-foreground">{pend.totalProducao} produção(ões)</strong>.
            </p>
            <p>
              Ao confirmar, o kit será marcado como <strong>Kit Pronto</strong>, com separação
              e conferência confirmadas, e o registro ficará no histórico da OP com seu
              usuário e a data/hora.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="rounded-full" onClick={onClose} disabled={salvando}>
            Ainda não
          </Button>
          <Button className="rounded-full" onClick={confirmar} disabled={salvando || bloqueado}>
            {salvando || checandoGate ? "Confirmando…" : "Confirmar Kit Pronto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
