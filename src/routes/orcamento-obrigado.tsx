import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, PartyPopper, AlertTriangle } from "lucide-react";
import { logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import { markLeadWaOpened } from "@/lib/leads-api";

export const Route = createFileRoute("/orcamento-obrigado")({
  head: () => ({
    meta: [
      { title: "Obrigado! — Orçamento LHL Festas" },
      { name: "description", content: "Recebemos sua solicitação de orçamento. Nossa equipe entrará em contato em breve." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Obrigado! — LHL Festas" },
      { property: "og:description", content: "Recebemos sua solicitação de orçamento." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://lhl-festas.lovable.app/orcamento-obrigado" },
    ],
  }),
  component: Obrigado,
});

type LastLead = {
  nome?: string;
  dataFesta?: string;
  tema?: string;
  modalidade?: string;
  modelo?: string;
  imagemReferencia?: string;
  tipoSolicitacao?: string;
  observacoes?: string;
  descricao?: string;
  qualified?: boolean;
  waUrl?: string;
  waMessage?: string;
  leadId?: string;
};

function formatDataBR(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function Obrigado() {
  const [lead, setLead] = useState<LastLead>({});
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lhl_last_lead");
      if (raw) setLead(JSON.parse(raw) as LastLead);
    } catch { /* noop */ }
    setReady(true);
    // Nenhum disparo de conversão aqui — generate_lead é a fonte oficial em /orcamento
    // e o GTM encaminha Lead para o Meta Pixel a partir daquele evento.
  }, []);


  const primeiroNome = (lead.nome || "").trim().split(" ")[0];
  const dataFormatada = formatDataBR(lead.dataFesta);
  const isPersonalizado = lead.tipoSolicitacao === "tema-personalizado";
  const descricaoTxt = (lead.descricao || lead.observacoes || "").trim();
  const qualified = !!lead.qualified;
  const leadId = lead.leadId || "";
  const openedKey = leadId ? `lhl_wa_opened:${leadId}` : "";

  // Mensagem WhatsApp: usa a construída no envio; fallback compat.
  let waUrl = lead.waUrl || "";
  if (!waUrl) {
    const linhas: string[] = ["Olá! 😊"];
    if (isPersonalizado) {
      linhas.push("Acabei de solicitar um orçamento de tema personalizado pelo site da LHL Festas.");
      const det: string[] = [];
      if (lead.nome) det.push(`Nome: ${lead.nome}`);
      if (dataFormatada) det.push(`Data da Festa: ${dataFormatada}`);
      det.push("Solicitação: Tema personalizado");
      if (lead.tema) det.push(`Tema desejado: ${lead.tema}`);
      if (lead.modalidade) det.push(`Modalidade: ${lead.modalidade}`);
      if (descricaoTxt) det.push(`Descrição: ${descricaoTxt}`);
      if (lead.imagemReferencia) det.push(`Referência: ${lead.imagemReferencia}`);
      if (det.length) linhas.push("", ...det);
    } else {
      linhas.push("Acabei de solicitar um orçamento pelo site da LHL Festas e gostaria de continuar meu atendimento.");
      const det: string[] = [];
      if (lead.nome) det.push(`Nome: ${lead.nome}`);
      if (dataFormatada) det.push(`Data da Festa: ${dataFormatada}`);
      if (lead.tema) det.push(`Tema: ${lead.tema}`);
      if (lead.modalidade) det.push(`Modalidade: ${lead.modalidade}`);
      if (lead.modelo) det.push(`Modelo: ${lead.modelo}`);
      if (lead.imagemReferencia) det.push(`Imagem: ${lead.imagemReferencia}`);
      if (lead.observacoes) det.push(`Observações: ${lead.observacoes}`);
      if (det.length) linhas.push("", ...det);
    }
    waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(linhas.join("\n"))}`;
  }

  function markOpened(method: "automatic" | "manual") {
    if (openedKey) {
      try { sessionStorage.setItem(openedKey, new Date().toISOString()); } catch { /* noop */ }
    }
    if (leadId) void markLeadWaOpened(leadId, method);
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "whatsapp_open", source: "obrigado", method, qualified });
    } catch { /* noop */ }
  }

  function onManualClick() {
    // Ao clicar manualmente, o navegador confia na ação do usuário — não haverá bloqueio.
    markOpened("manual");
    setPopupBlocked(false); // usuário resolveu manualmente
  }

  // Fluxo A — Lead Qualificado: abre WhatsApp automaticamente, UMA ÚNICA VEZ por lead.
  useEffect(() => {
    if (!ready) return;
    if (!qualified || !waUrl) return;
    // Se já foi aberto para este lead (F5, voltar histórico, revisita), não reabrir.
    if (openedKey) {
      try {
        if (sessionStorage.getItem(openedKey)) return;
      } catch { /* noop */ }
    }
    const t = setTimeout(() => {
      let win: Window | null = null;
      try {
        win = window.open(waUrl, "_blank", "noopener");
      } catch {
        win = null;
      }
      if (win === null) {
        // Popup bloqueado: mantém botão manual visível com aviso.
        setPopupBlocked(true);
        try {
          const w = window as unknown as { dataLayer?: unknown[] };
          w.dataLayer = w.dataLayer || [];
          w.dataLayer.push({ event: "whatsapp_auto_open_blocked", source: "obrigado" });
        } catch { /* noop */ }
      } else {
        markOpened("automatic");
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, qualified, waUrl, openedKey]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 text-center">
      <img src={logoImages[0]} alt="LHL Festas" className="w-24 sm:w-28 mb-8 rounded-full object-cover" />

      <div className="max-w-xl w-full rounded-3xl bg-card border border-border/60 p-8 sm:p-12 shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-6 h-12 w-12 rounded-full bg-primary flex items-center justify-center">
          <PartyPopper className="h-5 w-5 text-primary-foreground" />
        </div>
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-[color:var(--gold)] mb-3">
          Solicitação recebida
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-primary leading-tight">
          🎉 Solicitação recebida{primeiroNome ? `, ${primeiroNome}` : ""}!
        </h1>
        <div className="mx-auto my-6 h-px w-20 bg-gradient-to-r from-transparent via-[color:var(--gold)] to-transparent" />

        {qualified ? (
          <>
            <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
              Recebemos sua solicitação com sucesso.
              <br />
              Como você já escolheu um tema ou enviou uma imagem de referência,
              seu atendimento pode ser iniciado <strong>agora mesmo</strong>.
            </p>

            {popupBlocked && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  Seu navegador bloqueou a abertura automática. Use o botão abaixo para continuar pelo WhatsApp.
                </span>
              </div>
            )}

            <p className="mt-4 text-sm text-foreground/80">
              Clique abaixo para continuar sua conversa pelo WhatsApp.
            </p>

            <a href={waUrl} target="_blank" rel="noreferrer" onClick={onManualClick} className="mt-4 inline-block w-full">
              <Button className="h-14 w-full gap-2 text-base bg-[#25D366] text-white hover:bg-[#25D366]/90">
                <MessageCircle className="h-5 w-5" /> 💬 Continuar atendimento no WhatsApp
              </Button>
            </a>

            <p className="mt-5 text-xs text-muted-foreground">
              Se o WhatsApp não abrir automaticamente, use o botão acima.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
              Seu pedido de orçamento já foi encaminhado para nossa equipe.
              <br />
              Em breve entraremos em contato pelo WhatsApp informado no formulário.
            </p>

            <p className="mt-8 text-sm text-foreground/80">
              Se preferir agilizar seu atendimento, clique abaixo e fale conosco agora mesmo.
            </p>

            <a href={waUrl} target="_blank" rel="noreferrer" onClick={onManualClick} className="mt-4 inline-block w-full">
              <Button className="h-14 w-full gap-2 text-base bg-[#25D366] text-white hover:bg-[#25D366]/90">
                <MessageCircle className="h-5 w-5" /> 💬 Falar no WhatsApp
              </Button>
            </a>

            <p className="mt-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Não consegue falar agora? Sem problemas!
              <br />
              Sua solicitação já está registrada e nossa equipe entrará em contato em breve.
            </p>
          </>
        )}

        <Link to="/orcamento" className="mt-6 inline-block text-xs text-muted-foreground hover:text-foreground">
          Voltar
        </Link>
      </div>
    </div>
  );
}
