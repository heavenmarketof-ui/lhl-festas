import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { setOrderStatusOnSheet } from "@/lib/sheets-api";

export function RemoveContractControl() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const match = pathname.match(/^\/admin\/([^/]+)$/);
  const contractId = match?.[1] || "";
  const reservedRoutes = new Set([
    "agenda", "auditoria", "clientes", "contratos", "festas", "financeiro",
    "gestao", "heaven-leads", "itens-exclusivos", "leads", "operacao",
    "producao", "solicitacoes", "login",
  ]);
  const isContractPage = Boolean(contractId && contractId.length >= 8 && !reservedRoutes.has(contractId));

  if (!isContractPage) return null;

  async function removeContract() {
    if (!contractId || removing) return;
    setRemoving(true);
    try {
      await setOrderStatusOnSheet(contractId, "Excluído");
      try {
        const key = "lhl_sheet_orders_cache";
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const rows = JSON.parse(raw);
          if (Array.isArray(rows)) {
            sessionStorage.setItem(key, JSON.stringify(rows.filter((row) => row?.id !== contractId)));
          }
        }
      } catch { /* cache local é apenas otimização */ }
      toast.success("Contrato removido com sucesso.");
      setOpen(false);
      navigate({ to: "/admin" });
    } catch {
      toast.error("Não foi possível remover o contrato. Tente novamente.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 h-11 rounded-full border-destructive/40 bg-background/95 px-4 text-destructive shadow-lg backdrop-blur hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" /> Remover contrato
      </Button>

      <AlertDialog open={open} onOpenChange={(value) => !removing && setOpen(value)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato será retirado das listas ativas do sistema. O registro será mantido como excluído para preservar o histórico e a auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void removeContract();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removendo..." : "Sim, remover contrato"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
