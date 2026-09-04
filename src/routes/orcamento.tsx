import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MessageCircle,
  MapPin,
  PartyPopper,
  Sparkles,
  Package,
  Truck,
  Wrench,
  Gift,
  PackageCheck,
  ClipboardList,
  Instagram,
  Star,
  X,
  Check,
} from "lucide-react";
import {
  heroImages,
  festaNaMesaImages,
  pegEMonteImages,
  inspireSeImages,
  feedbackImages,
  logoImages,
} from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import { supabase } from "@/integrations/supabase/client";

import {
  buildCatalogUrl,
  buildCatalogReturnUrl,
  readAndPersistCampaignParams,
  isSafeImageUrl,
} from "@/lib/campaign-params";
import {
  MODALIDADES,
  MODALIDADE_EMOJI,
  MODALIDADE_DESCRICAO,
  getKitsByModalidade,
  kitsForModalidadeLabel,
  type ModalidadeId,
} from "@/data/kits";

const WA_MSG_DEFAULT = "Olá! Quero fazer uma festa com a LHL Festas.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_MSG_DEFAULT)}`;
const INSTAGRAM_URL = "https://www.instagram.com/lhl_festas";
const ORCAMENTO_DRAFT_KEY = "lhl_orcamento_draft";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento LHL Festas — Sua festa linda sem gastar uma fortuna" },
      {
        name: "description",
        content:
          "Solicite seu orçamento em menos de 20 segundos. Decoração de festa infantil pronta para retirar e montar em Mauá, ABC e região.",
      },
      { property: "og:title", content: "Orçamento LHL Festas" },
      {
        property: "og:description",
        content:
          "Escolha o tema, retire seu kit e monte uma decoração incrível no conforto da sua casa.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroImages[0] },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImages[0] },
      { property: "og:url", content: "https://lhl-festas.lovable.app/orcamento" },
    ],
    links: [
      { rel: "canonical", href: "https://lhl-festas.lovable.app/orcamento" },
      { rel: "preload", as: "image", href: heroImages[0], fetchPriority: "high" } as never,
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "LHL Festas",
          image: heroImages[0],
          telephone: "+5511925543380",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Mauá",
            addressRegion: "SP",
            addressCountry: "BR",
          },
          areaServed: "Mauá, ABC e região",
          url: "https://lhl-festas.lovable.app/orcamento",
        }),
      },
    ],
  }),
  component: OrcamentoPage,
});

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function smoothScrollToForm(e: React.MouseEvent<HTMLAnchorElement>) {
  if (typeof document === "undefined") return;
  const el = document.getElementById("orcamento");
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}


type LeadPayload = {
  nome: string;
  whatsapp: string;
  dataFesta: string;
  tema: string;
  submittedAt: string;
  pageUrl: string;
  userAgent: string;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  modalidade?: string;
  kit?: string;
  modelo?: string;
  imagemReferencia?: string;
  origem?: string;
  tipoSolicitacao?: string;
  themeId?: string;
  imageId?: string;
  categoryId?: string;
  descricao?: string;
  qualified?: boolean;
  qualificationReason?: string;
  leadStage?: "NEW" | "QUALIFIED" | "CONTACTING" | "NEGOTIATION" | "CLOSED" | "LOST";
};


function detectBrowser(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Outro";
}
function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

async function storeLead(lead: LeadPayload): Promise<{ id: string }> {
  // Cache local para retomada offline (não substitui backend).
  try {
    const key = "lhl_leads";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(lead);
    localStorage.setItem(key, JSON.stringify(prev));
  } catch { /* noop */ }

  // Envio permanente ao backend (Google Sheets via Apps Script).
  const { createLeadOnSheet } = await import("@/lib/leads-api");
  const res = await createLeadOnSheet(lead);
  if (!res.ok) throw new Error("Backend recusou o lead");
  return { id: res.id };
}



function OrcamentoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MiniHeader />
      <Hero />
      <ComoFunciona />
      <Kits />
      <Galeria />
      <InstagramSection />
      <Depoimentos />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingWhatsApp />
      <Suspense fallback={null}>
        <ConsultorFAB />
      </Suspense>
    </div>
  );
}

function MiniHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-serif text-lg font-semibold tracking-tight">LHL Festas</span>
        </div>
        <a href="#orcamento" onClick={smoothScrollToForm}>
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            🎈 Orçamento
          </Button>
        </a>

      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)]" /> Decoração pronta e prática
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Sua festa <span className="italic text-primary">linda, prática</span> e sem gastar uma fortuna!
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Escolha seu tema, retire seu kit e monte uma decoração incrível no conforto da sua casa.
          </p>
          <div className="mt-7">
            <a href="#orcamento" onClick={smoothScrollToForm}>
              <Button
                size="lg"
                className="h-14 gap-2 px-8 text-base bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90"
              >
                🎈 Receber meu orçamento
              </Button>
            </a>
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/75">
              <li className="inline-flex items-center gap-1.5"><span className="text-primary">✔</span> Orçamento gratuito</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-primary">✔</span> Resposta rápida</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-primary">✔</span> Sem compromisso</li>
            </ul>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Mauá, ABC e região</li>
            <li className="flex items-center gap-2"><PartyPopper className="h-4 w-4 text-primary" /> Diversos temas</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Atendimento rápido</li>
          </ul>

        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-[color:var(--gold)]/15 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[var(--shadow-soft)]">
            <img
              src={heroImages[0]}
              alt="Decoração de festa infantil LHL Festas"
              className="aspect-[4/5] w-full object-cover"
              fetchPriority="high"
            />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LeadForm />
      </div>
    </section>
  );
}

type CatalogState = {
  tema: string;
  modalidade: string;
  modelo: string;
  imagem: string;
  origem: string;
  tipoSolicitacao: string;
  themeId: string;
  imageId: string;
  categoryId: string;
  descricao: string;
};

function sanitize(v: string) {
  // Remove qualquer HTML e limita tamanho de campos vindos da query string.
  return v.replace(/<[^>]*>/g, "").slice(0, 500);
}

function readCatalogState(): CatalogState {
  const empty: CatalogState = {
    tema: "", modalidade: "", modelo: "", imagem: "", origem: "", tipoSolicitacao: "",
    themeId: "", imageId: "", categoryId: "", descricao: "",
  };
  if (typeof window === "undefined") return empty;
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => sanitize((p.get(k) || "").trim());
  const imagemRaw = (p.get("imagem") || "").trim();
  return {
    tema: get("tema"),
    modalidade: get("modalidade"),
    modelo: get("modelo"),
    imagem: isSafeImageUrl(imagemRaw) ? imagemRaw : "",
    origem: get("origem"),
    tipoSolicitacao: get("tipoSolicitacao"),
    themeId: get("themeId"),
    imageId: get("imageId"),
    categoryId: get("categoryId"),
    descricao: sanitize((p.get("descricao") || "").trim()).slice(0, 2000),
  };
}

function LeadForm() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataFesta, setDataFesta] = useState("");
  const [tema, setTema] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [modalidadeEscolhida, setModalidadeEscolhida] = useState("");
  const [kitEscolhido, setKitEscolhido] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const utmRef = useRef<Record<string, string>>({});
  const [catalog, setCatalog] = useState<CatalogState>({
    tema: "", modalidade: "", modelo: "", imagem: "", origem: "", tipoSolicitacao: "",
    themeId: "", imageId: "", categoryId: "", descricao: "",
  });
  const [imgOk, setImgOk] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const isPersonalizado = catalog.tipoSolicitacao === "tema-personalizado";
  const hasCatalogTheme = !!catalog.tema && !isPersonalizado;
  const hasCatalogData = hasCatalogTheme || isPersonalizado;
  const hasCatalogImage = !!catalog.imagem;
  const isQualifiedLead = hasCatalogTheme || hasCatalogImage || !!uploadedImage;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Persistir UTMs (podem ter chegado do catálogo).
    const campaign = readAndPersistCampaignParams();
    utmRef.current = { ...campaign } as Record<string, string>;

    const cat = readCatalogState();
    setCatalog(cat);
    if (cat.tema) setTema(cat.tema);

    // Restaurar rascunho, se existir.
    try {
      const raw = sessionStorage.getItem(ORCAMENTO_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<{ nome: string; whatsapp: string; dataFesta: string; tema: string; observacoes: string }>;
        if (d.nome) setNome(d.nome);
        if (d.whatsapp) setWhatsapp(d.whatsapp);
        if (d.dataFesta) setDataFesta(d.dataFesta);
        if (!cat.tema && d.tema) setTema(d.tema);
        if (d.observacoes) setObservacoes(d.observacoes);
      }
    } catch { /* noop */ }

    // Se vier descrição do catálogo (tema personalizado), pré-preencher observações.
    if (cat.tipoSolicitacao === "tema-personalizado" && cat.descricao) {
      setObservacoes((prev) => prev || cat.descricao);
    }

    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      if (cat.tipoSolicitacao === "tema-personalizado") {
        w.dataLayer.push({
          event: "custom_theme_received",
          tema: cat.tema, modalidade: cat.modalidade, origem: cat.origem,
        });
      } else if (cat.tema || cat.modalidade || cat.modelo) {
        w.dataLayer.push({
          event: "catalog_selection_received",
          tema: cat.tema, modalidade: cat.modalidade, modelo: cat.modelo,
          themeId: cat.themeId, imageId: cat.imageId, origem: cat.origem,
        });
      }
      w.dataLayer.push({ event: "budget_form_started" });
    } catch { /* noop */ }
  }, []);

  function saveDraft() {
    try {
      sessionStorage.setItem(
        ORCAMENTO_DRAFT_KEY,
        JSON.stringify({ nome, whatsapp, dataFesta, tema, observacoes }),
      );
    } catch { /* noop */ }
  }

  function abrirCatalogo(origem: string) {
    saveDraft();
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "click_catalog_budget", origem });
    } catch { /* noop */ }
    const url = buildCatalogUrl(origem);
    window.open(url, "_blank", "noopener");
  }

  function alterarEscolha() {
    saveDraft();
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: "catalog_selection_changed",
        modalidade: catalog.modalidade,
        tipoSolicitacao: catalog.tipoSolicitacao,
      });
    } catch { /* noop */ }
    const url = buildCatalogReturnUrl({
      modalidade: catalog.modalidade,
      personalizado: isPersonalizado,
    });
    if (typeof window !== "undefined") window.location.href = url;
  }


  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const mime = (f.type || "").toLowerCase();
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!ACCEPTED.includes(mime) && !["jpg", "jpeg", "png", "webp"].includes(ext)) {
      const { toast } = await import("sonner");
      toast.error("Formato inválido. Envie JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      const { toast } = await import("sonner");
      toast.error("Arquivo muito grande. Limite: 5 MB.");
      return;
    }
    setUploading(true);
    const { toast } = await import("sonner");
    const toastId = toast.loading("Enviando imagem...");
    try {
      const safeExt = ext || "jpg";
      const path = `orcamento/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const { error } = await supabase.storage
        .from("contract-photos")
        .upload(path, f, { upsert: false, contentType: mime || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`, cacheControl: "3600" });
      if (error) throw error;
      const { data, error: e2 } = await supabase.storage
        .from("contract-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (e2 || !data?.signedUrl) throw e2 ?? new Error("Falha ao gerar URL da imagem.");
      setUploadedImage(data.signedUrl);
      toast.success("Imagem anexada.", { id: toastId });
    } catch (err) {
      console.error("[upload orcamento]", err);
      const msg = (err as { message?: string })?.message || "Erro desconhecido";
      toast.error(`Falha no upload: ${msg}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  function buildWhatsAppMessage(lead: LeadPayload): string {
    const linhas = [
      "Olá! Acabei de solicitar um orçamento pelo site da LHL Festas.",
      "",
      "Minha escolha foi:",
    ];
    const det: string[] = [];
    if (lead.modalidade) det.push(`• Modalidade: ${lead.modalidade}`);
    if (lead.kit) det.push(`• Kit: ${lead.kit}`);
    if (lead.tema) det.push(`• Tema: ${lead.tema}`);
    if (lead.modelo) det.push(`• Opção: ${lead.modelo}`);
    if (lead.dataFesta) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lead.dataFesta);
      det.push(`• Data da festa: ${m ? `${m[3]}/${m[2]}/${m[1]}` : lead.dataFesta}`);
    }
    if (lead.imagemReferencia) det.push(`• Imagem de referência: ${lead.imagemReferencia}`);
    if (det.length === 0) {
      return "Olá! Acabei de solicitar um orçamento pelo site da LHL Festas e gostaria de continuar meu atendimento.";
    }
    linhas.push(...det, "", "Gostaria de continuar meu atendimento.");
    return linhas.join("\n");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Informe seu nome";
    if (whatsapp.replace(/\D/g, "").length < 10) errs.whatsapp = "WhatsApp inválido";
    if (!dataFesta) errs.dataFesta = "Escolha a data";
    if (!isPersonalizado && !tema.trim()) errs.tema = "Informe o tema";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSending(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const temaFinal = isPersonalizado ? (tema.trim() || "Tema personalizado") : tema.trim();
    const origemFinal = catalog.origem
      ? (catalog.origem === "catalogo" ? "Catálogo LHL" : catalog.origem)
      : (isPersonalizado ? "Tema personalizado" : "");
    // Prioriza imagem do catálogo; se não houver, usa a anexada pelo cliente.
    const imagemRefFinal = catalog.imagem || uploadedImage || "";
    // Se houver ambas, inclui a anexada na descrição para não perder o dado.
    const descricaoBase = isPersonalizado ? (observacoes || catalog.descricao || "") : "";
    const descricaoFinal = uploadedImage && catalog.imagem
      ? `${descricaoBase ? descricaoBase + "\n\n" : ""}Imagem anexada pelo cliente: ${uploadedImage}`
      : descricaoBase;
    // Motivo(s) de qualificação
    const reasons: string[] = [];
    if (hasCatalogTheme && catalog.themeId) reasons.push("catalog_theme");
    else if (hasCatalogTheme) reasons.push("catalog_theme");
    if (hasCatalogImage) reasons.push("catalog_image");
    if (uploadedImage) reasons.push("uploaded_reference");
    const qualified = isQualifiedLead;
    const qualificationReason = reasons.join(",");

    const lead: LeadPayload = {
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      dataFesta,
      tema: temaFinal,
      submittedAt: new Date().toISOString(),
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      userAgent: ua,
      device: detectDevice(),
      browser: detectBrowser(ua),
      ...utmRef.current,
      modalidade: catalog.modalidade || modalidadeEscolhida || undefined,
      kit: kitEscolhido || undefined,
      modelo: catalog.modelo || undefined,
      imagemReferencia: imagemRefFinal || undefined,
      origem: origemFinal || undefined,
      tipoSolicitacao: catalog.tipoSolicitacao || undefined,
      themeId: catalog.themeId || undefined,
      imageId: catalog.imageId || undefined,
      categoryId: catalog.categoryId || undefined,
      descricao: descricaoFinal || undefined,
      qualified,
      qualificationReason: qualificationReason || undefined,
      leadStage: qualified ? "QUALIFIED" : "NEW",
    };
    let createdId = "";
    try {
      const res = await storeLead(lead);
      createdId = res.id || "";
    } catch (err) {
      setSending(false);
      console.error("[Lead] Falha ao registrar", err);
      const { toast } = await import("sonner");
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
      saveDraft();
      return;
    }
    setSending(false);

    const waMessage = buildWhatsAppMessage(lead);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;

    try {
      sessionStorage.setItem(
        "lhl_last_lead",
        JSON.stringify({ ...lead, observacoes, qualified, waUrl, waMessage, leadId: createdId }),
      );
      sessionStorage.removeItem(ORCAMENTO_DRAFT_KEY);
    } catch { /* noop */ }

    // Evento de conversão — GTM centraliza envio para GA4 e Meta Pixel (Lead).
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "generate_lead", tema: lead.tema, source: "orcamento", qualified });
      w.dataLayer.push({ event: "budget_form_submitted", qualified });
      if (hasCatalogData) {
        w.dataLayer.push({
          event: "budget_submitted_from_catalog",
          tema: lead.tema, modalidade: lead.modalidade, modelo: lead.modelo,
          themeId: lead.themeId, imageId: lead.imageId, origem: lead.origem,
        });
      }
      if (qualified) w.dataLayer.push({ event: "qualified_lead", tema: lead.tema, reason: qualificationReason });
    } catch { /* noop */ }


    navigate({ to: "/orcamento-obrigado" });
  }



  return (
    <div id="orcamento" className="mx-auto -mt-2 mb-6 max-w-3xl scroll-mt-24 rounded-3xl border border-border/70 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <div className="text-center">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {isPersonalizado ? "Tema personalizado" : "Orçamento sem compromisso"}
        </div>
        <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
          {isPersonalizado ? "Solicite um tema personalizado" : "🎉 Sua festa começa aqui!"}
        </h2>
        <p className="mt-3 text-base text-foreground/80 sm:text-lg">
          {isPersonalizado
            ? "Não encontrou o tema que procura em nosso catálogo? Conte para nós qual é a sua ideia."
            : "Vamos montar um orçamento personalizado para você."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha os dados abaixo e nossa equipe enviará todas as informações pelo WhatsApp.
        </p>
      </div>

      {hasCatalogTheme ? (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Sua escolha</div>
          <div className="mt-2 grid gap-4 sm:grid-cols-[112px_1fr_auto] sm:items-center">
            <div className="h-24 w-24 flex-none overflow-hidden rounded-xl border border-border/60 bg-muted sm:h-28 sm:w-28">
              {catalog.imagem && imgOk ? (
                <img
                  src={catalog.imagem}
                  alt={`Referência: ${catalog.tema}`}
                  className="h-full w-full object-cover"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                  {catalog.imagem ? (
                    <a href={catalog.imagem} target="_blank" rel="noreferrer" className="underline">Ver imagem escolhida</a>
                  ) : "Sem imagem"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-serif text-xl text-foreground">Tema: {catalog.tema}</div>
              {catalog.modalidade && (
                <div className="text-sm text-muted-foreground">Modalidade: {catalog.modalidade}</div>
              )}
              {catalog.modelo && (
                <div className="text-xs text-muted-foreground">Modelo: {catalog.modelo}</div>
              )}
            </div>
            <div className="flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={alterarEscolha}>
                Alterar escolha
              </Button>
            </div>
          </div>
        </div>
      ) : isPersonalizado ? (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Solicitação de tema personalizado
          </div>
          <div className="mt-2 grid gap-4 sm:grid-cols-[112px_1fr_auto] sm:items-start">
            <div className="h-24 w-24 flex-none overflow-hidden rounded-xl border border-border/60 bg-muted sm:h-28 sm:w-28">
              {catalog.imagem && imgOk ? (
                <img
                  src={catalog.imagem}
                  alt="Referência da solicitação"
                  className="h-full w-full object-cover"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                  {catalog.imagem ? (
                    <a href={catalog.imagem} target="_blank" rel="noreferrer" className="underline">Ver imagem escolhida</a>
                  ) : "Sem referência"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              {catalog.tema && (
                <div className="font-serif text-lg text-foreground">Tema desejado: {catalog.tema}</div>
              )}
              {catalog.modalidade && (
                <div className="text-sm text-muted-foreground">Modalidade: {catalog.modalidade}</div>
              )}
              {catalog.descricao && (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">
                  {catalog.descricao}
                </p>
              )}
            </div>
            <div className="flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={alterarEscolha}>
                Alterar solicitação
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="font-serif text-lg text-foreground">Já escolheu o tema da sua festa?</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Consulte nosso catálogo com mais de 1.000 opções e selecione a arte que deseja usar
                como referência para o seu orçamento.
              </p>
            </div>
            <div>
              <Button type="button" variant="outline" onClick={() => abrirCatalogo("orcamento")}>
                Escolher um tema no catálogo
              </Button>
            </div>
          </div>
        </div>
      )}


      <ul className="mt-6 grid gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-foreground/85 sm:grid-cols-3">
        <li className="flex items-center justify-center gap-2 text-center">
          <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
          Temas personalizados
        </li>
        <li className="flex items-center justify-center gap-2 text-center">
          <Gift className="h-4 w-4 text-primary" />
          Excelente custo-benefício
        </li>
        <li className="flex items-center justify-center gap-2 text-center">
          <Truck className="h-4 w-4 text-primary" />
          Retire e monte no conforto da sua casa
        </li>
      </ul>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={errors.nome}>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="h-12"
            autoComplete="name"
          />
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp}>
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            placeholder="(11) 90000-0000"
            className="h-12"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Data da festa" error={errors.dataFesta}>
          <Input
            type="date"
            value={dataFesta}
            onChange={(e) => setDataFesta(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="h-12"
          />
        </Field>
        {isPersonalizado ? (
          <Field label="Tema desejado (opcional)">
            <Input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Bailarina espacial, tema misto…"
              className="h-12"
            />
          </Field>
        ) : hasCatalogTheme ? (
          <Field label="Tema da festa">
            <Input value={tema} readOnly className="h-12 bg-muted/60" />
          </Field>
        ) : (
          <Field label="Tema da festa" error={errors.tema}>
            <Input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder='Ex: Safari, Princesas ou "Ainda não escolhi"'
              className="h-12"
            />
          </Field>
        )}
        {isPersonalizado && (
          <div className="sm:col-span-2">
            <Field label="Descrição / referência">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Conte sua ideia, cores preferidas, personagens, link de inspiração…"
                className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              A criação ou adaptação de novos temas está sujeita à análise, disponibilidade e orçamento.
            </p>
          </div>
        )}
        <Field label="Modalidade (opcional)">
          <select
            value={modalidadeEscolhida}
            onChange={(e) => { setModalidadeEscolhida(e.target.value); setKitEscolhido(""); }}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Ainda não sei</option>
            {MODALIDADES.map((m) => (
              <option key={m.id} value={m.label}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Kit (opcional)">
          <select
            value={kitEscolhido}
            onChange={(e) => setKitEscolhido(e.target.value)}
            disabled={!modalidadeEscolhida}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value="">
              {modalidadeEscolhida ? "Quero ajuda para escolher" : "Escolha a modalidade primeiro"}
            </option>
            {kitsForModalidadeLabel(modalidadeEscolhida).map((k) => (
              <option key={k.id} value={k.nome}>
                {k.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">

          <Field label="Imagem de referência (opcional)">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              {uploadedImage && (
                <div className="flex items-center gap-2">
                  <img src={uploadedImage} alt="Referência anexada" className="h-14 w-14 rounded-md border border-border/60 object-cover" />
                  <button type="button" onClick={() => setUploadedImage("")} className="text-xs text-muted-foreground underline">
                    remover
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Envie uma foto do tema ou decoração que você gostaria. JPG, PNG ou WEBP até 5 MB.
            </p>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={sending}
            className="h-14 w-full gap-2 text-base font-semibold bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90"
          >
            🎈 {sending ? "Enviando…" : "Quero meu orçamento"}
          </Button>
          <p className="mt-3 text-center text-sm font-medium text-foreground/80">
            ✅ Atendimento rápido • Orçamento sem compromisso
          </p>
          <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
            Ao enviar este formulário você autoriza nosso contato pelo WhatsApp para responder sua solicitação.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const STEPS = [
  { n: 1, label: "Escolha seu tema", icon: PartyPopper },
  { n: 2, label: "Solicite o orçamento", icon: ClipboardList },
  { n: 3, label: "Retire o kit", icon: Truck },
  { n: 4, label: "Monte a decoração", icon: Wrench },
  { n: 5, label: "Aproveite a festa", icon: Gift },
  { n: 6, label: "Devolva depois", icon: PackageCheck },
];

function ComoFunciona() {
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Como funciona</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Simples do início ao fim</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border/70 bg-card p-5 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="font-serif">{s.n}</span>
              </div>
              <s.icon className="mx-auto mt-3 h-5 w-5 text-primary" />
              <div className="mt-2 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Kits oficiais — FONTE ÚNICA: src/data/kits.ts.
// Fluxo: primeiro a modalidade, depois os kits daquela modalidade.
function Kits() {
  const [mod, setMod] = useState<ModalidadeId>("festa-na-mesa");
  const kits = getKitsByModalidade(mod);
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Nossos Kits</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Escolha o kit ideal para a sua festa</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Comece pela modalidade e conheça os kits disponíveis e tudo o que está incluso.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {MODALIDADES.map((m) => {
            const active = mod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMod(m.id)}
                className={[
                  "rounded-2xl border p-5 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                    : "border-border/70 bg-card hover:border-primary/50",
                ].join(" ")}
              >
                <div className="font-serif text-xl">
                  {MODALIDADE_EMOJI[m.id]} {m.label}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{MODALIDADE_DESCRICAO[m.id]}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((k) => (
            <div key={k.id} className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
              <h3 className="font-serif text-xl">{k.nome}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{k.descricao}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {k.itens.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <a href="#orcamento" onClick={smoothScrollToForm} className="mt-5">
                <Button variant="outline" size="sm" className="w-full">Solicitar orçamento</Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Galeria() {
  const imgs = useMemo(
    () =>
      [
        festaNaMesaImages[0],
        festaNaMesaImages[3],
        pegEMonteImages[0],
        pegEMonteImages[2],
        inspireSeImages[0],
        inspireSeImages[1],
        festaNaMesaImages[7],
        pegEMonteImages[4],
      ].filter(Boolean) as string[],
    [],
  );
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Galeria</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Inspire-se com festas reais</h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imgs.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setOpen(src)}
              className="group aspect-square overflow-hidden rounded-xl border border-border/60"
            >
              <img
                src={src}
                alt={`Festa LHL ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
        >
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
          <img src={open} alt="Ampliada" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </section>
  );
}

function InstagramSection() {
  const posts = useMemo(
    () =>
      [
        festaNaMesaImages[1],
        pegEMonteImages[1],
        inspireSeImages[2],
        festaNaMesaImages[5],
        pegEMonteImages[3],
        inspireSeImages[3],
      ].filter(Boolean) as string[],
    [],
  );
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Instagram</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Acompanhe nossos últimos trabalhos</h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {posts.map((src, i) => (
            <a
              key={src + i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
            >
              <img
                src={src}
                alt={`Post Instagram ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Instagram className="h-8 w-8 text-white" />
              </div>
            </a>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Acompanhe mais decorações no nosso Instagram.
          </p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2">
              <Instagram className="h-4 w-4" /> Ver Instagram
            </Button>
          </a>
        </div>

      </div>
    </section>
  );
}

const DEPOIMENTOS = [
  { nome: "Camila R.", texto: "Ficou tudo maravilhoso! Meus convidados amaram. Super prático." },
  { nome: "Débora L.", texto: "Atendimento humanizado e decoração linda. Recomendo demais!" },
  { nome: "Priscila M.", texto: "Preço justo, kit completo e a montagem foi bem simples." },
];

function Depoimentos() {
  return (
    <section className="bg-muted/40 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Depoimentos</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Quem faz, indica</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <div key={d.nome} className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="flex gap-0.5 text-[color:var(--gold)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">"{d.texto}"</p>
              <div className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {d.nome}
              </div>
            </div>
          ))}
        </div>
        {feedbackImages[0] && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {feedbackImages.slice(0, 6).map((src, i) => (
              <img
                key={src + i}
                src={src}
                alt={`Feedback ${i + 1}`}
                loading="lazy"
                className="aspect-square w-full rounded-xl border border-border/60 object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Como funciona o Peg & Monte?", a: "Você retira o kit pronto, monta em casa em poucos minutos e devolve depois. Simples assim." },
  { q: "Preciso pagar caução?", a: "Sim. A caução é devolvida após a devolução do kit em bom estado." },
  { q: "Vocês entregam?", a: "O padrão é retirada. Entrega pode ser combinada conforme a região." },
  { q: "Posso retirar um dia antes da festa?", a: "Sempre que houver disponibilidade em nossa agenda, fazemos o possível para liberar a retirada antecipadamente." },
  { q: "Quanto tempo leva para montar?", a: "A maioria dos nossos kits pode ser montada em poucos minutos seguindo a organização dos itens entregues." },
  { q: "Vocês fazem qualquer tema?", a: "Sim! Além do nosso acervo, criamos temas personalizados exclusivos." },
  { q: "Como funciona a reserva?", a: "Solicite seu orçamento aqui pelo formulário e nossa equipe entra em contato para reservar a data." },
];


function FAQ() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Perguntas frequentes</div>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">Tire suas dúvidas</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`i${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-[color:var(--gold)]/10 to-transparent" />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Vamos deixar sua festa incrível?</h2>
        <p className="mt-3 text-muted-foreground">Receba seu orçamento sem compromisso.</p>
        <a href="#orcamento" onClick={smoothScrollToForm} className="mt-6 inline-block">
          <Button size="lg" className="h-14 gap-2 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
            🎈 Receber meu orçamento
          </Button>
        </a>

      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <div>© {new Date().getFullYear()} LHL Festas — Todos os direitos reservados.</div>
        <div className="flex items-center gap-4">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">@lhl_festas</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">WhatsApp</a>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
