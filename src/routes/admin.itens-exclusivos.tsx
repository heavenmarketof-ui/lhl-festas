import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/components/admin-shell";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_EXCLUSIVE_ITEMS,
  getExclusiveConfig,
  resetExclusiveConfig,
  saveExclusiveConfig,
  type ExclusiveCategory,
  type ExclusiveItem,
} from "@/lib/exclusive-items";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { parseSelected } from "@/lib/exclusive-items";
import { isContratoAtivo, type StoredOrder } from "@/lib/orders-storage";
import { Save, RotateCcw, Lock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/itens-exclusivos")({
  component: ItensExclusivosPage,
  head: () => ({ meta: [{ title: "Itens Exclusivos — LHL Festas" }] }),
});

function ItensExclusivosPage() {
  const [items, setItems] = useState<ExclusiveItem[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(getExclusiveConfig());
    fetchOrdersFromSheet().then(setOrders).catch(() => { /* ignore */ });
  }, []);

  const activeReservationsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (!isContratoAtivo(o)) continue;
      const list = parseSelected(o.details?.itensExclusivos);
      for (const s of list) map.set(s.itemId, (map.get(s.itemId) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const byCategory = useMemo(() => {
    const g: Record<ExclusiveCategory, ExclusiveItem[]> = {
      mesa: [], cilindros: [], escadinha: [], painel: [], arco: [], tapete: [],
      numero_led_21: [], numero_led_50: [], happy_birthday: [],
    };
    for (const it of items) g[it.categoria].push(it);
    return g;
  }, [items]);

  const setQty = (id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantidade: Math.max(0, qty) } : i)));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      saveExclusiveConfig(items);
      toast.success("Configuração salva.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Restaurar quantidades padrão de fábrica?")) return;
    resetExclusiveConfig();
    setItems(DEFAULT_EXCLUSIVE_ITEMS.map((i) => ({ ...i })));
    toast.success("Configuração restaurada.");
  };

  return (
    <AdminShell>
      <Toaster position="top-center" richColors />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-primary flex items-center gap-2">
              <Lock className="h-6 w-6 text-gold" /> Configuração de Itens Exclusivos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Ajuste aqui as quantidades disponíveis de cada equipamento exclusivo. Estas quantidades
              são usadas automaticamente pelo sistema para impedir que dois contratos ativos reservem
              o mesmo item na mesma data.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
        </div>

        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => (
            <section key={cat} className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
              <h2 className="font-serif text-lg text-primary mb-3">{CATEGORY_LABELS[cat]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byCategory[cat].map((it) => {
                  const used = activeReservationsById.get(it.id) ?? 0;
                  const disponivel = Math.max(0, it.quantidade - used);
                  return (
                    <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {it.nome}
                          {it.pecas ? <span className="text-muted-foreground"> · {it.pecas} peças</span> : null}
                          {it.aComprar ? <span className="ml-1 text-[10px] uppercase tracking-wider rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">A comprar</span> : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Reservado agora: <span className="font-semibold text-foreground">{used}</span>
                          {" · "}Disponível: <span className={disponivel === 0 ? "text-destructive font-semibold" : "text-emerald-700 font-semibold"}>{disponivel}</span>
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={it.quantidade}
                        onChange={(e) => setQty(it.id, Number(e.target.value) || 0)}
                        className="w-24 h-9 text-center"
                        disabled={it.aComprar}
                        title={it.aComprar ? "Item 'A Comprar' — quantidade ilimitada" : ""}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95"
          >
            <Save className="h-4 w-4 mr-2" /> Salvar Configuração
          </Button>
          <Button onClick={handleReset} variant="outline" className="rounded-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Restaurar Padrão
          </Button>
        </div>

        <p className="mt-4 text-[11px] italic text-muted-foreground">
          As quantidades são armazenadas neste navegador. Ajustes feitos por outros computadores
          precisam ser refeitos aqui — combine com a equipe qual dispositivo será a fonte oficial.
        </p>
      </main>
    </AdminShell>
  );
}
