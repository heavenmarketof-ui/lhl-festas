import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, FolderOpen, Wrench, CheckCircle2, RefreshCw, Plus, Search, Pencil, Trash2, RotateCcw, DollarSign, Layers, Download } from "lucide-react";
import { PATRIMONIO_SEED, seedToItem, parseValor } from "@/lib/patrimonio-seed";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminShell } from "@/components/admin-shell";
import {
  fetchPatrimonioFromSheet, createPatrimonioOnSheet, updatePatrimonioOnSheet,
  deletePatrimonioOnSheet, PATRIMONIO_CATEGORIAS,
  type PatrimonioItem, type PatrimonioStatus,
} from "@/lib/patrimonio-api";

export const Route = createFileRoute("/admin/patrimonio")({
  component: PatrimonioPage,
});

type FilterKey = "todos" | "ativos" | "manutencao" | "inativos";

function emptyItem(): PatrimonioItem {
  return {
    id: crypto.randomUUID(),
    nome: "",
    categoria: "Outros",
    quantidade: 1,
    valorAquisicao: "",
    dataCompra: "",
    observacoes: "",
    status: "Ativo",
    fotoUrl: "",
    createdAt: new Date().toISOString(),
    ativo: "Sim",
  };
}

function PatrimonioPage() {
  const [items, setItems] = useState<PatrimonioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [editing, setEditing] = useState<PatrimonioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PatrimonioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(showToast = false) {
    setRefreshing(true);
    try {
      const remote = await fetchPatrimonioFromSheet();
      setItems(remote);
      if (showToast) toast.success("Patrimônio atualizado.");
    } catch {
      toast.error("Não foi possível carregar o patrimônio.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const [importing, setImporting] = useState(false);

  const stats = useMemo(() => {
    const total = items.length;
    const categorias = new Set(items.map((i) => i.categoria)).size;
    const manutencao = items.filter((i) => i.status === "Em Manutenção").length;
    const ativos = items.filter((i) => i.status === "Ativo").length;
    const unidades = items
      .filter((i) => i.status === "Ativo")
      .reduce((sum, i) => sum + (Number(i.quantidade) || 0), 0);
    const valorTotal = items
      .filter((i) => i.status === "Ativo")
      .reduce((sum, i) => sum + (Number(i.quantidade) || 0) * parseValor(i.valorAquisicao), 0);
    return { total, categorias, manutencao, ativos, unidades, valorTotal };
  }, [items]);

  async function importarAcervo() {
    setImporting(true);
    const existing = new Set(items.map((i) => i.nome.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;
    try {
      for (const s of PATRIMONIO_SEED) {
        if (existing.has(s.nome.trim().toLowerCase())) { skipped++; continue; }
        const item = seedToItem(s);
        try {
          await createPatrimonioOnSheet(item);
          setItems((prev) => [item, ...prev]);
          existing.add(s.nome.trim().toLowerCase());
          added++;
        } catch {
          // ignore individual failures
        }
      }
      toast.success(`Importação concluída: ${added} adicionados, ${skipped} já existentes.`);
    } finally {
      setImporting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (q) {
        const inText = i.nome.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q);
        if (!inText) return false;
      }
      switch (filter) {
        case "ativos": return i.status === "Ativo";
        case "manutencao": return i.status === "Em Manutenção";
        case "inativos": return i.status === "Inativo";
        default: return true;
      }
    });
  }, [items, query, filter]);

  async function handleSave() {
    if (!editing) return;
    if (!editing.nome.trim()) { toast.error("Informe o nome do item."); return; }
    setSaving(true);
    try {
      const exists = items.some((i) => i.id === editing.id);
      const payload: PatrimonioItem = {
        ...editing,
        quantidade: Number(editing.quantidade) || 0,
        updatedAt: new Date().toISOString(),
        ativo: editing.ativo || "Sim",
      };
      if (exists) {
        await updatePatrimonioOnSheet(payload);
        setItems((prev) => prev.map((i) => (i.id === payload.id ? payload : i)));
        toast.success("Item atualizado.");
      } else {
        await createPatrimonioOnSheet(payload);
        setItems((prev) => [payload, ...prev]);
        toast.success("Item cadastrado.");
      }
      setEditing(null);
    } catch {
      toast.error("Falha ao salvar item.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePatrimonioOnSheet(toDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
      toast.success("Item excluído.");
      setToDelete(null);
    } catch {
      toast.error("Falha ao excluir item.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStatus(item: PatrimonioItem, next: PatrimonioStatus) {
    const payload = { ...item, status: next, updatedAt: new Date().toISOString() };
    try {
      await updatePatrimonioOnSheet(payload);
      setItems((prev) => prev.map((i) => (i.id === item.id ? payload : i)));
      toast.success(`Status alterado para ${next}.`);
    } catch {
      toast.error("Falha ao atualizar status.");
    }
  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-primary">Patrimônio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Carregando acervo..." : "Cadastro e organização do acervo da empresa."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11 rounded-full" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} sm:mr-2`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={importarAcervo}
              disabled={importing || loading}
              title="Importar itens iniciais do acervo (não duplica)"
            >
              <Download className={`h-4 w-4 ${importing ? "animate-pulse" : ""} sm:mr-2`} />
              <span className="hidden sm:inline">{importing ? "Importando..." : "Importar Acervo"}</span>
            </Button>
            <Button
              className="h-11 rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95"
              onClick={() => setEditing(emptyItem())}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Item</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <StatCard icon={<Package className="h-4 w-4" />} label="Total de Itens" value={stats.total} />
          <StatCard icon={<Layers className="h-4 w-4" />} label="Unidades (Ativos)" value={stats.unidades} />
          <StatCard icon={<FolderOpen className="h-4 w-4" />} label="Categorias" value={stats.categorias} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Itens Ativos" value={stats.ativos} tone="ok" />
          <StatCard icon={<Wrench className="h-4 w-4" />} label="Em Manutenção" value={stats.manutencao} tone={stats.manutencao > 0 ? "warn" : "neutral"} />
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Valor Total" valueText={stats.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        </div>


        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por Nome ou Categoria..."
              className="pl-10 h-11 rounded-full bg-card"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["todos", "Todos"],
              ["ativos", "Ativos"],
              ["manutencao", "Em Manutenção"],
              ["inativos", "Inativos"],
            ] as const).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  filter === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-primary"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-serif text-xl text-primary">Nenhum item encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Novo Item" para cadastrar o primeiro registro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-primary">{i.nome}</TableCell>
                      <TableCell>{i.categoria}</TableCell>
                      <TableCell className="text-right">{i.quantidade}</TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          {i.status !== "Ativo" && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleStatus(i, "Ativo")}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reativar
                            </Button>
                          )}
                          {i.status === "Ativo" && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleStatus(i, "Inativo")}>
                              Desativar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing({ ...i })}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setToDelete(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              {editing && items.some((i) => i.id === editing.id) ? "Editar Item" : "Novo Item"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Ex.: Bandeja Rosa Pequena" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</label>
                <Select value={editing.categoria} onValueChange={(v) => setEditing({ ...editing, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PATRIMONIO_CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Quantidade</label>
                <Input
                  type="number"
                  min={0}
                  value={editing.quantidade}
                  onChange={(e) => setEditing({ ...editing, quantidade: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Valor de Aquisição</label>
                <Input
                  value={editing.valorAquisicao || ""}
                  onChange={(e) => setEditing({ ...editing, valorAquisicao: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Data da Compra</label>
                <Input
                  type="date"
                  value={editing.dataCompra || ""}
                  onChange={(e) => setEditing({ ...editing, dataCompra: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as PatrimonioStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Foto (URL)</label>
                <Input
                  value={editing.fotoUrl || ""}
                  onChange={(e) => setEditing({ ...editing, fotoUrl: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</label>
                <Textarea
                  value={editing.observacoes || ""}
                  onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir "{toDelete?.nome}"? Esta ação usa exclusão lógica e pode ser revertida diretamente na planilha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function StatCard({
  icon, label, value, valueText, tone = "neutral",
}: {
  icon: React.ReactNode; label: string; value?: number; valueText?: string; tone?: "neutral" | "warn" | "ok";
}) {
  const color = tone === "warn" ? "text-destructive" : tone === "ok" ? "text-emerald-700" : "text-primary";
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span className="text-gold">{icon}</span> {label}
      </p>
      <p className={`font-serif text-3xl mt-1 ${color}`}>{valueText ?? value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PatrimonioStatus }) {
  const cls =
    status === "Ativo"
      ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
      : status === "Em Manutenção"
        ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
        : "bg-muted text-muted-foreground border border-border";
  return <Badge className={`${cls} rounded-full font-normal`}>{status}</Badge>;
}
