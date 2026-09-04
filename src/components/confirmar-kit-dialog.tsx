// ============================================================================
// CONFIRMAÇÃO HUMANA DE "KIT PRONTO" — LHL FESTAS
// ----------------------------------------------------------------------------
// O sistema NUNCA marca uma OP como Kit Pronto sozinho. Quando não há mais
// compras nem produções pendentes, ele apenas avisa e pede a confirmação de
// uma pessoa. Ao confirmar, registramos usuário, data/hora, origem da ação,
// número da OP e contrato no histórico da Ordem de Produção.
// ============================================================================

import { useState } from "react";
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
import { PackageCheck } from "lucide-react";
import {
  confirmarKitPronto,
  pendenciasOperacionais,
  type OrdemProducao,
} from "@/lib/producao-api";

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
  if (!alvo) return null;

  const pend = pendenciasOperacionais(alvo.op);
  const bloqueado = pend.compras > 0 || pend.producao > 0;

  const confirmar = async () => {
    setSalvando(true);
    try {
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

        {bloqueado ? (
          <p className="text-sm text-destructive">
            Ainda existem {pend.compras} compra(s) e {pend.producao} produção(ões) pendentes
            nesta Ordem de Produção. Conclua os itens antes de confirmar.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
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
            {salvando ? "Confirmando…" : "Confirmar Kit Pronto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
