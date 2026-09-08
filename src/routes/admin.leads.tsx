import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Search, Filter, Users, Trash2 } from "lucide-react";
import {
  fetchLeadsFromSheet, updateLeadStatusOnSheet, updateLeadStageOnSheet, deleteLeadOnSheet,
  LEAD_STATUSES, LEAD_ORIGENS, LEAD_STAGES, LEAD_STAGE_LABELS,
  type LeadRecord, type LeadStatus, type LeadOrigem, type LeadStage,
} from "@/lib/leads-api";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Leads — LHL Festas" }] }),
  component: LeadsPage,
});

const STATUS_STYLES: Record<LeadStatus, string> = {
  "Novo Lead": "bg-blue-100 text-blue-800 border-blue-200",
  "Em Atendimento": "bg-amber-100 text-amber-800 border-amber-200",
  "Convertido": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Perdido": "bg-rose-100 text-rose-800 border-rose-200",
};

const STAGE_STYLES: Record<LeadStage, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  QUALIFIED: "bg-orange-100 text-orange-800 border-orange-200",
  CONTACTING: "bg-amber-100 text-amber-800 border-amber-200",
  NEGOTIATION: "bg-violet-100 text-violet-800 border-violet-200",
  CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LOST: "bg-rose-100 text-rose-800 border-rose-200",
};

function formatDataFesta(value: string) {
  const s = String(value || "").trim();
  if (!s) return "—";
  // YYYY-MM-DD (também aceita YYYY-MM-DDTHH:mm:ss.sssZ) — usar só a parte da data
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  // DD/MM/YYYY já formatada
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return s;
  return s;
}

function formatHoraCadastro(value: string) {
  const s = String(value || "").trim();
  if (!s) return "";
  // HH:mm ou HH:mm:ss
  const hm = s.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  // ISO com hora (ex.: 1899-12-30T12:07:00.000Z) — extrair HH:mm
  const iso = s.match(/T(\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}:${iso[2]}`;
  return "";
}

function formatCadastro(lead: LeadRecord) {
  const data = formatDataFesta(lead.dataCadastro);
  const hora = formatHoraCadastro(lead.horaCadastro);
  if (data === "—" && !hora) return "—";
  if (data === "—") return hora;
  return hora ? `${data} às ${hora}` : data;
}

function LeadsPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | LeadStatus>("todos");
  const [stageFiltro, setStageFiltro] = useState<"todos" | LeadStage>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<"todas" | LeadOrigem>("todas");
  const [selecionado, setSelecionado] = useState<LeadRecord | null>(null);
  const [excluindo, setExcluindo] = useState<LeadRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onConfirmDelete() {
    if (!excluindo) return;
    const lead = excluindo;
    setDeletingId(lead.id);
    try {
      await deleteLeadOnSheet(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (selecionado?.id === lead.id) setSelecionado(null);
      toast.success("Lead excluído com sucesso.");
      setExcluindo(null);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir o lead. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  async function reload() {
    setLoading(true);
    try {
      const data = await fetchLeadsFromSheet();
      data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setLeads(data);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFiltro !== "todos" && l.status !== statusFiltro) return false;
      if (stageFiltro !== "todos" && l.leadStage !== stageFiltro) return false;
      if (origemFiltro !== "todas" && l.origem !== origemFiltro) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.whatsapp.toLowerCase().includes(q) ||
        l.whatsappNormalizado.includes(q.replace(/\D/g, "")) ||
        l.tema.toLowerCase().includes(q)
      );
    });
  }, [leads, busca, statusFiltro, stageFiltro, origemFiltro]);

  const totais = useMemo(() => {
    const t = { total: leads.length, novos: 0, atendimento: 0, convertidos: 0, perdidos: 0 };
    for (const l of leads) {
      if (l.status === "Novo Lead") t.novos++;
      else if (l.status === "Em Atendimento") t.atendimento++;
      else if (l.status === "Convertido") t.convertidos++;
      else if (l.status === "Perdido") t.perdidos++;
    }
    return t;
  }, [leads]);

  async function onChangeStatus(lead: LeadRecord, novo: LeadStatus) {
    const anterior = lead.status;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: novo } : l)));
    if (selecionado?.id === lead.id) setSelecionado({ ...lead, status: novo });
    try {
      await updateLeadStatusOnSheet(lead.id, novo);
      toast.success(`Status atualizado para "${novo}"`);
    } catch (e) {
      console.error(e);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: anterior } : l)));
      if (selecionado?.id === lead.id) setSelecionado({ ...lead, status: anterior });
      toast.error("Falha ao atualizar status.");
    }
  }

  async function onChangeStage(lead: LeadRecord, novo: LeadStage) {
    const anterior = lead.leadStage;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, leadStage: novo } : l)));
    if (selecionado?.id === lead.id) setSelecionado({ ...lead, leadStage: novo });
    try {
      await updateLeadStageOnSheet(lead.id, novo);
      toast.success(`Estágio atualizado para "${LEAD_STAGE_LABELS[novo]}"`);
    } catch (e) {
      console.error(e);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, leadStage: anterior } : l)));
      if (selecionado?.id === lead.id) setSelecionado({ ...lead, leadStage: anterior });
      toast.error("Falha ao atualizar estágio.");
    }
  }

  function waNumber(lead: LeadRecord) {
    const n = lead.whatsappNormalizado;
    return n.length === 11 || n.length === 10 ? `55${n}` : (n || WHATSAPP_NUMBER);
  }

  function whatsappUrl(lead: LeadRecord) {
    const primeiroNome = (lead.nome || "").trim().split(" ")[0] || "";
    const msg = `Olá, ${primeiroNome}!\n\nAqui é da LHL Festas.\nRecebemos sua solicitação de orçamento e vou dar continuidade ao seu atendimento por aqui. 😊`;
    return `https://wa.me/${waNumber(lead)}?text=${encodeURIComponent(msg)}`;
  }

  function preContratoUrl(lead: LeadRecord) {
    const nome = (lead.nome || "").trim().split(" ")[0] || (lead.nome || "").trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/reserva`;
    const msg =
      `Olá, ${nome}! 😊\n\n` +
      `Para darmos continuidade à sua reserva na LHL Festas, preciso que você preencha nosso Pré-Contrato pelo link abaixo:\n\n` +
      `${link}\n\n` +
      `Nele você informará os dados necessários e confirmará que está ciente das condições da locação, incluindo caução, retirada, devolução e cuidados com os itens.\n\n` +
      `Assim que finalizar, me avise por aqui. 🎉`;
    return `https://wa.me/${waNumber(lead)}?text=${encodeURIComponent(msg)}`;
  }

  async function onEnviarPreContrato(lead: LeadRecord) {
    const url = preContratoUrl(lead);
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "pre_contrato_enviado", source: "admin_leads", lead_id: lead.id });
      w.gtag?.("event", "pre_contrato_enviado", { source: "admin_leads" });
    } catch { /* noop */ }
    if (lead.status !== "Em Atendimento") {
      try {
        await updateLeadStatusOnSheet(lead.id, "Em Atendimento");
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "Em Atendimento" } : l)));
        setSelecionado((cur) => (cur && cur.id === lead.id ? { ...cur, status: "Em Atendimento" } : cur));
        toast.success('Status atualizado para "Em Atendimento".');
      } catch (e) {
        console.error(e);
        toast.warning("WhatsApp aberto, mas não foi possível atualizar o status.");
      }
    }
  }

  function onWhatsappClick(lead: LeadRecord) {
    try {
      const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "whatsapp_click", source: "admin_leads", lead_id: lead.id });
      w.gtag?.("event", "whatsapp_click", { source: "admin_leads" });
    } catch { /* noop */ }
  }

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-primary flex items-center gap-2">
              <Users className="h-6 w-6" /> Novos Leads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solicitações recebidas pela Landing Page de Orçamento.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card label="Total" value={totais.total} />
          <Card label="Novos" value={totais.novos} accent="text-blue-700" />
          <Card label="Em atendimento" value={totais.atendimento} accent="text-amber-700" />
          <Card label="Convertidos" value={totais.convertidos} accent="text-emerald-700" />
          <Card label="Perdidos" value={totais.perdidos} accent="text-rose-700" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 mb-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, WhatsApp ou tema"
                className="pl-9 h-11"
              />
            </div>
            <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFiltro} onValueChange={(v) => setStageFiltro(v as "todos" | LeadStage)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Estágio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estágios</SelectItem>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={origemFiltro} onValueChange={(v) => setOrigemFiltro(v as any)}>
              <SelectTrigger className="h-11">
                <div className="flex items-center gap-2"><Filter className="h-4 w-4" /><SelectValue placeholder="Origem" /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as origens</SelectItem>
                {LEAD_ORIGENS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Lead</th>
                  <th className="text-left px-4 py-3">WhatsApp</th>
                  <th className="text-left px-4 py-3">Data da Festa</th>
                  <th className="text-left px-4 py-3">Tema / Escolha</th>
                  <th className="text-left px-4 py-3">Origem</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Estágio</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Carregando…</td></tr>
                )}
                {!loading && filtrados.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
                )}
                {filtrados.map((l) => {
                  const reasons = (l.qualificationReason || "").split(",").map(s => s.trim()).filter(Boolean);
                  const isPersonalizado = l.tipoSolicitacao === "tema-personalizado";
                  return (
                    <tr key={l.id} className="border-t border-border/60 hover:bg-muted/30 align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {l.imagemReferencia ? (
                            <a href={l.imagemReferencia} target="_blank" rel="noreferrer" className="flex-none">
                              <img
                                src={l.imagemReferencia}
                                alt="Referência"
                                className="h-12 w-12 rounded-md border border-border/60 object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            </a>
                          ) : null}
                          <div className="min-w-0">
                            <div className="font-medium">{l.nome}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {l.qualified && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">🔥 Qualificado</Badge>
                              )}
                              {reasons.includes("catalog_theme") && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">Do catálogo</Badge>
                              )}
                              {reasons.includes("catalog_image") && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">Arte escolhida</Badge>
                              )}
                              {reasons.includes("uploaded_reference") && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">Referência própria</Badge>
                              )}
                              {isPersonalizado && (
                                <Badge variant="outline" className="bg-pink-50 text-pink-800 border-pink-200">Personalizado</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{l.whatsapp}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDataFesta(l.dataFesta)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.tema || "—"}</div>
                        {(l.modalidade || l.kit || l.modelo) && (
                          <div className="text-xs text-muted-foreground">
                            {[l.modalidade, l.kit, l.modelo].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{l.origem}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_STYLES[l.status]}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STAGE_STYLES[l.leadStage]}>{LEAD_STAGE_LABELS[l.leadStage]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatCadastro(l)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelecionado(l)}>Detalhes</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Excluir lead"
                            title="Excluir lead"
                            onClick={() => setExcluindo(l)}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>


        <p className="mt-6 text-xs text-muted-foreground text-center">
          <Link to="/admin" className="hover:text-foreground">← Voltar à Central</Link>
        </p>
      </main>

      <Dialog open={!!selecionado} onOpenChange={(o) => !o && setSelecionado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-4">
              {selecionado.qualified && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">🔥 Lead qualificado</Badge>
                  {(selecionado.qualificationReason || "").split(",").map(s => s.trim()).filter(Boolean).map((r) => {
                    const label = r === "catalog_theme" ? "Veio do catálogo"
                      : r === "catalog_image" ? "Escolheu uma arte"
                      : r === "uploaded_reference" ? "Enviou referência própria"
                      : r;
                    return <Badge key={r} variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">{label}</Badge>;
                  })}
                  {selecionado.tipoSolicitacao === "tema-personalizado" && (
                    <Badge variant="outline" className="bg-pink-50 text-pink-800 border-pink-200">Tema personalizado</Badge>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Nome" value={selecionado.nome} />
                <Info label="WhatsApp" value={selecionado.whatsapp} />
                <Info label="Data da Festa" value={formatDataFesta(selecionado.dataFesta)} />
                <Info label="Tema" value={selecionado.tema} />
                {selecionado.modalidade ? <Info label="Modalidade" value={selecionado.modalidade} /> : null}
                {selecionado.kit ? <Info label="Kit" value={selecionado.kit} /> : null}
                {selecionado.modelo ? <Info label="Modelo / Opção" value={selecionado.modelo} /> : null}
                {selecionado.tipoSolicitacao ? <Info label="Tipo da solicitação" value={selecionado.tipoSolicitacao} /> : null}
                <Info label="Origem" value={selecionado.origem} />
                <Info label="Cadastro" value={formatCadastro(selecionado)} />
              </div>

              {selecionado.descricao ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Descrição do cliente</div>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{selecionado.descricao}</p>
                </div>
              ) : null}

              {selecionado.imagemReferencia ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Imagem de referência</div>
                  <div className="flex items-start gap-3">
                    <a href={selecionado.imagemReferencia} target="_blank" rel="noreferrer" className="flex-none">
                      <img
                        src={selecionado.imagemReferencia}
                        alt="Referência do cliente"
                        className="h-24 w-24 rounded-md border border-border/60 object-cover"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          t.style.display = "none";
                          const sib = t.nextElementSibling as HTMLElement | null;
                          if (sib) sib.style.display = "inline";
                        }}
                      />
                      <span style={{ display: "none" }} className="text-xs text-muted-foreground">Imagem indisponível</span>
                    </a>
                    <a
                      href={selecionado.imagemReferencia}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline break-all"
                    >
                      Abrir imagem em nova aba
                    </a>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                  value={selecionado.status}
                  onValueChange={(v) => onChangeStatus(selecionado, v as LeadStatus)}
                >
                  <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Estágio</label>
                <Select
                  value={selecionado.leadStage}
                  onValueChange={(v) => onChangeStage(selecionado, v as LeadStage)}
                >
                  <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>




              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => onEnviarPreContrato(selecionado)}
                  className="w-full h-12 gap-2"
                >
                  📄 Enviar Pré-Contrato
                </Button>
                <a
                  href={whatsappUrl(selecionado)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onWhatsappClick(selecionado)}
                  className="block"
                >
                  <Button variant="outline" className="w-full h-12 gap-2 border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/10">
                    <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {selecionado && (
              <Button
                variant="ghost"
                onClick={() => setExcluindo(selecionado)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-2"
              >
                <Trash2 className="h-4 w-4" /> Excluir lead
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelecionado(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && !deletingId && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente excluir este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluindo ? (<>Esta ação não pode ser desfeita. O lead <strong>{excluindo.nome}</strong> será removido permanentemente.</>) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void onConfirmDelete(); }}
              disabled={!!deletingId}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {deletingId ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function Card({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground break-words">{value || "—"}</div>
    </div>
  );
}
