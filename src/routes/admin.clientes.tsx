import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, CalendarDays, Phone, ArrowRight, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchOrdersFromSheet } from "@/lib/sheets-api";
import { formatDateBR, toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Admin LHL Festas" }] }),
  component: ClientesPage,
});

type ClienteResumo = {
  chave: string;
  nome: string;
  telefone: string;
  email: string;
  festas: StoredOrder[];
  proximaData: string;
  ultimaData: string;
};

function norm(v: string) {
  return (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ClientesPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchOrdersFromSheet().then(setOrders).finally(() => setLoading(false));
  }, []);

  const clientes = useMemo(() => {
    const map = new Map<string, ClienteResumo>();
    const hoje = new Date().toISOString().slice(0, 10);

    for (const o of orders) {
      if (o.status === "Cancelado") continue;
      const d = o.details;
      const nome = (d?.nomeCompleto || "Cliente sem nome").trim();
      const telefone = (d?.telefone || "").trim();
      const email = (d?.email || "").trim();
      const chave = telefone.replace(/\D/g, "") || norm(email) || norm(nome);
      const data = toDateISO(d?.dataEvento) || "";
      const atual = map.get(chave) || { chave, nome, telefone, email, festas: [], proximaData: "", ultimaData: "" };
      atual.festas.push(o);
      if (data) {
        if (data >= hoje && (!atual.proximaData || data < atual.proximaData)) atual.proximaData = data;
        if (!atual.ultimaData || data > atual.ultimaData) atual.ultimaData = data;
      }
      map.set(chave, atual);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.proximaData && b.proximaData) return a.proximaData.localeCompare(b.proximaData);
      if (a.proximaData) return -1;
      if (b.proximaData) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [orders]);

  const filtrados = useMemo(() => {
    const query = norm(q);
    if (!query) return clientes;
    return clientes.filter((c) => norm(`${c.nome} ${c.telefone} ${c.email}`).includes(query));
  }, [clientes, q]);

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-[#b27b4e]">Relacionamento</div>
            <h1 className="mt-2 font-serif text-4xl text-[#651421] sm:text-5xl">Clientes</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#7b676a]">Uma pessoa pode ter várias festas. Aqui começa o histórico único de cada cliente da LHL.</p>
          </div>
          <div className="rounded-2xl border border-[#eaded8] bg-white px-5 py-3 text-sm shadow-sm">
            <span className="text-[#8a7779]">Clientes identificados</span>
            <strong className="ml-3 text-xl text-[#651421]">{clientes.length}</strong>
          </div>
        </header>

        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8588]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" className="h-12 rounded-2xl border-[#e3d5cf] bg-white pl-11" />
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#7b676a]"><Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...</div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-3xl border border-[#e6d8d2] bg-white p-10 text-center shadow-sm">
            <Users className="mx-auto h-8 w-8 text-[#d87982]" />
            <h2 className="mt-3 font-serif text-2xl text-[#651421]">Nenhum cliente encontrado</h2>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtrados.map((c) => {
              const proxima = c.festas.find((o) => toDateISO(o.details?.dataEvento) === c.proximaData) || c.festas[0];
              return (
                <article key={c.chave} className="rounded-3xl border border-[#e7dad4] bg-white p-5 shadow-[0_12px_35px_rgba(91,17,29,.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-2xl text-[#651421]">{c.nome}</h2>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7e696c]">
                        {c.telefone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.telefone}</span>}
                        <span>{c.festas.length} {c.festas.length === 1 ? "festa" : "festas"}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#f7e2df] px-3 py-1 text-[11px] font-semibold text-[#651421]">{c.proximaData ? "Com festa futura" : "Histórico"}</span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#fbf6f2] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a18479]">Próxima festa</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#5b3037]"><CalendarDays className="h-4 w-4 text-[#d87982]" />{c.proximaData ? formatDateBR(c.proximaData) : "Sem próxima festa"}</div>
                    </div>
                    <div className="rounded-2xl bg-[#fbf6f2] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a18479]">Tema mais recente</div>
                      <div className="mt-2 truncate text-sm font-semibold text-[#5b3037]">{proxima?.details?.tema || "—"}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button asChild variant="ghost" className="rounded-full text-[#651421] hover:bg-[#f7e2df]">
                      <Link to="/admin/$id" params={{ id: proxima.id }}>Ver festa <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
