import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));

import { getKitsByModalidade } from "@/data/kits";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  MessageCircle,
  FileText,
  ShieldCheck,
  Heart,
  Instagram,
  Facebook,
  Palette,
  Crown,
  Check,
  Gem,
  Handshake,
  MapPin,
  Clock,
  Menu,
  X,
  PartyPopper,
  Package,
  Truck,
  Wrench,
  PackageCheck,
  ClipboardList,
  ArrowRight,
  LayoutGrid,
  MousePointerClick,
  Image as ImageIcon,
  Receipt,
  Rocket,
} from "lucide-react";

import {
  heroImages,
  festaNaMesaImages,
  pegEMonteImages,
  inspireSeImages,
  feedbackImages,
  logoImages,
} from "@/assets/lhl";
import personalizadoHeroAsset from "@/assets/lhl/personalizado/personalizado-lenda.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Mais de 1.000 temas para Festa na Mesa e Peg & Monte" },
      {
        name: "description",
        content:
          "Catálogo digital com mais de 1.000 temas para Festa na Mesa e Peg & Monte, além de temas personalizados. Escolha a arte, receba seu orçamento e monte sua festa com praticidade.",
      },
      { property: "og:title", content: "LHL Festas — Catálogo com mais de 1.000 temas de festa" },
      {
        property: "og:description",
        content:
          "Escolha entre mais de 1.000 temas para Festa na Mesa e Peg & Monte, ou solicite um tema personalizado. Decoração prática, bonita e com excelente custo-benefício.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroImages[0] },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImages[0] },
      { property: "og:url", content: "https://lhl-festas.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://lhl-festas.lovable.app/" },
      { rel: "preload", as: "image", href: heroImages[0], fetchPriority: "high" } as never,
    ],
  }),
  component: HomePage,
});

import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import { buildCatalogUrl, buildCatalogReturnUrl } from "@/lib/campaign-params";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero fazer uma festa com a LHL Festas.")}`;

function trackHomeEvent(evt: string, extra: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: evt, ...extra });
    w.gtag?.("event", evt, extra);
  } catch { /* noop */ }
}

/**
 * Só depois da hidratação os links passam a carregar os parâmetros de campanha
 * (sessionStorage). Isso mantém o HTML do servidor e do cliente idênticos e
 * evita erro de hidratação — que no desktop derrubava a página inteira.
 */
let CATALOG_READY = false;

function useCatalogLinksReady() {
  const [, force] = useState(0);
  useEffect(() => {
    CATALOG_READY = true;
    force((n) => n + 1);
  }, []);
}

function catalogHref(modalidade?: "mesa" | "peg" | "personalizado"): string {
  if (!CATALOG_READY || typeof window === "undefined") return "https://catalogo-lhlfestas.lovable.app/";
  if (modalidade === "mesa") return buildCatalogReturnUrl({ modalidade: "festa_na_mesa" });
  if (modalidade === "peg") return buildCatalogReturnUrl({ modalidade: "peg_monte" });
  if (modalidade === "personalizado") return buildCatalogReturnUrl({ personalizado: true });
  return buildCatalogUrl("home");
}


const NAV = [
  { label: "Catálogo", href: "#catalogo" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Modalidades", href: "#modalidades" },
  { label: "1.000+ temas", href: "#mil-temas" },
  { label: "Personalizado", href: "#personalizado" },
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "FAQ", href: "#faq" },
];

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" className="h-10 w-10 rounded-full object-cover" />
          <span className="font-serif text-xl font-semibold tracking-tight">LHL Festas</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={catalogHref()}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackHomeEvent("home_catalog_click", { location: "header" })}
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Palette className="h-4 w-4" /> Ver Catálogo
            </Button>
          </a>
          <Link
            to="/orcamento"
            onClick={() => trackHomeEvent("home_budget_click", { location: "header" })}
          >
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Solicitar Orçamento <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <button
          className="rounded-md p-2 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <a
                href={catalogHref()}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
                onClick={() => trackHomeEvent("home_catalog_click", { location: "mobile_menu" })}
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Palette className="h-4 w-4" /> Catálogo
                </Button>
              </a>
              <Link
                to="/orcamento"
                className="flex-1"
                onClick={() => trackHomeEvent("home_budget_click", { location: "mobile_menu" })}
              >
                <Button size="sm" className="w-full">Orçamento</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)]" /> Catálogo digital com mais de 1.000 temas
          </div>
          <h1 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Sua festa começa aqui <span aria-hidden>🎉</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Escolha entre <strong className="text-foreground">mais de 1.000 temas</strong> para
            <em> Festa na Mesa</em> e <em>Peg &amp; Monte</em> — ou solicite um tema totalmente personalizado.
            Transformamos a sua ideia em uma decoração prática, bonita e com excelente custo-benefício.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={catalogHref()}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackHomeEvent("home_catalog_click", { location: "hero" })}
            >
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
                🎨 Ver Catálogo
              </Button>
            </a>
            <Link
              to="/orcamento"
              onClick={() => trackHomeEvent("home_budget_click", { location: "hero" })}
            >
              <Button size="lg" variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Solicitar Orçamento
              </Button>
            </Link>
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "Mais de 1.000 temas",
              "Temas personalizados",
              "Retire e monte com praticidade",
              "Excelente custo-benefício",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-[color:var(--gold)]/15 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[var(--shadow-soft)]">
            <img
              src={heroImages[0]}
              alt="Decoração de festa infantil da LHL Festas"
              className="aspect-[4/5] w-full object-cover"
              fetchPriority="high"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow && (
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </div>
          )}
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}

// ---------- CATÁLOGO EM DESTAQUE (logo após o Hero) ----------

const CATALOG_CARDS = [
  {
    key: "mesa" as const,
    icon: "🎈",
    title: "Festa na Mesa",
    desc: "Kits práticos e completos para receber em casa com charme e simplicidade.",
  },
  {
    key: "peg" as const,
    icon: "🧩",
    title: "Peg & Monte",
    desc: "Você retira, monta e devolve. A festa completa nas suas mãos, sem complicação.",
  },
  {
    key: "personalizado" as const,
    icon: "✨",
    title: "Tema Personalizado",
    desc: "Não encontrou o tema ideal? Criamos uma decoração exclusiva para a sua festa.",
  },
];

function CatalogHighlight() {
  return (
    <Section
      id="catalogo"
      eyebrow="Catálogo digital"
      title="Explore nosso catálogo digital"
      subtitle="Agora ficou muito mais fácil encontrar o tema ideal para a sua festa. Navegue por mais de 1.000 temas, compare artes diferentes e chegue ao orçamento com a sua escolha já preenchida automaticamente."
      className="bg-muted/40"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {CATALOG_CARDS.map((c) => (
          <a
            key={c.title}
            href={catalogHref(c.key)}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackHomeEvent(
                c.key === "personalizado" ? "home_custom_theme_click" : "home_catalog_click",
                { location: "catalog_highlight", modalidade: c.key },
              )
            }
            className="group flex flex-col rounded-2xl border border-border/70 bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
          >
            <div className="text-3xl">{c.icon}</div>
            <h3 className="mt-4 font-serif text-2xl text-foreground">{c.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Explorar no catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </a>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <a
          href={catalogHref()}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackHomeEvent("home_catalog_click", { location: "catalog_highlight_main" })}
        >
          <Button size="lg" className="h-14 gap-2 px-8 text-base bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
            <Palette className="h-4 w-4" /> Explorar Catálogo
          </Button>
        </a>
      </div>
    </Section>
  );
}

// ---------- COMO FUNCIONA ----------

const STEPS = [
  { n: 1, label: "Escolha a modalidade", desc: "Festa na Mesa ou Peg & Monte.", icon: LayoutGrid },
  { n: 2, label: "Escolha o tema", desc: "Mais de 1.000 opções no catálogo.", icon: MousePointerClick },
  { n: 3, label: "Escolha a arte", desc: "Compare variações do mesmo tema.", icon: ImageIcon },
  { n: 4, label: "Solicite seu orçamento", desc: "Sua escolha já vem preenchida.", icon: Receipt },
  { n: 5, label: "Retire e monte sua festa", desc: "Praticidade do início ao fim.", icon: Rocket },
];

function ComoFunciona() {
  return (
    <Section
      id="como-funciona"
      eyebrow="Como funciona"
      title="Do tema à festa em 5 passos"
      subtitle="Um processo simples e organizado para você comemorar sem complicação."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-border/70 bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <span className="font-serif text-lg">{s.n}</span>
            </div>
            <s.icon className="mx-auto mt-4 h-5 w-5 text-primary" />
            <div className="mt-2 font-medium text-foreground">{s.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- MODALIDADES ----------

const MODALIDADES = [
  {
    title: "Festa na Mesa",
    desc: "Kit completo, prático e cheio de charme para receber em casa sem complicação.",
    img: festaNaMesaImages[0],
    key: "mesa" as const,
  },
  {
    title: "Peg & Monte",
    desc: "Você retira, monta e devolve. Toda a estrutura da festa nas suas mãos.",
    img: pegEMonteImages[0],
    key: "peg" as const,
  },
  {
    title: "Tema Personalizado",
    desc: "Criamos artes exclusivas para transformar exatamente a sua ideia em realidade.",
    img: personalizadoHeroAsset,
    key: "personalizado" as const,
  },
];

function Modalidades() {
  return (
    <Section
      id="modalidades"
      eyebrow="Modalidades"
      title="Escolha o formato ideal para a sua festa"
      subtitle="Três formas de comemorar, com o mesmo cuidado em cada detalhe."
    >
      <div className="grid gap-8 md:grid-cols-3">
        {MODALIDADES.map((m) => (
          <div
            key={m.title}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={m.img}
                alt={`Decoração ${m.title} — LHL Festas`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-serif text-2xl text-foreground">{m.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <a
                href={catalogHref(m.key)}
                target="_blank"
                rel="noreferrer"
                className="mt-6"
                onClick={() =>
                  trackHomeEvent(
                    m.key === "personalizado" ? "home_custom_theme_click" : "home_catalog_click",
                    { location: "modalidades", modalidade: m.key },
                  )
                }
              >
                <Button variant="outline" size="sm" className="gap-2">
                  Ver no catálogo <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- MAIS DE 1.000 TEMAS ----------

const CATEGORIAS = [
  "Personagens",
  "Princesas",
  "Super-heróis",
  "Chá de bebê",
  "Adultos",
  "Datas comemorativas",
  "Clássicos",
  "Tendências",
];

function MilTemas() {
  return (
    <section id="mil-temas" className="relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[color:var(--gold)]/10 via-transparent to-primary/10" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Catálogo em constante crescimento</div>
          <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            Mais de 1.000 temas disponíveis
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Nosso catálogo reúne centenas de opções para todos os estilos de festa —
            de clássicos infantis a tendências do momento — e recebe novos temas com frequência.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <li
              key={c}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-3 text-sm text-foreground/85"
            >
              <Check className="h-4 w-4 flex-none text-primary" /> {c}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-muted-foreground">E muito mais.</p>

        <div className="mt-10 flex justify-center">
          <a
            href={catalogHref()}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackHomeEvent("home_catalog_click", { location: "mil_temas" })}
          >
            <Button size="lg" className="h-14 gap-2 px-8 text-base bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
              <Palette className="h-4 w-4" /> Ver todos os temas
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

// ---------- TEMA PERSONALIZADO ----------

function Personalizado() {
  const href = catalogHref("personalizado");
  return (
    <section id="personalizado" className="relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-[color:var(--gold)]/10 to-transparent" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Tema personalizado
          </div>
          <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            Não encontrou o tema ideal?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Também desenvolvemos temas personalizados. Conte a sua ideia e nossa equipe
            fará uma análise para criar uma decoração exclusiva para a sua festa —
            do painel aos displays, com identidade visual completa.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-foreground">
            {[
              "Nome e idade",
              "Foto da criança",
              "Qualquer personagem",
              "Paleta de cores livre",
              "Painéis exclusivos",
              "Displays personalizados",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 font-serif text-2xl italic text-primary">
            Se você imaginou… nós podemos criar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackHomeEvent("home_custom_theme_click", { location: "personalizado_section" })}
            >
              <Button size="lg" className="gap-2 bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
                <Sparkles className="h-4 w-4" /> Solicitar tema personalizado
              </Button>
            </a>
            <Link
              to="/orcamento"
              onClick={() => trackHomeEvent("home_budget_click", { location: "personalizado_section" })}
            >
              <Button size="lg" variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Solicitar Orçamento
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/20 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[var(--shadow-soft)]">
            <img
              src={personalizadoHeroAsset}
              alt="Exemplo de tema personalizado LHL Festas"
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- DIFERENCIAIS ----------

const DIFFERENCIAIS = [
  { icon: LayoutGrid, title: "Mais de 1.000 temas", desc: "Um catálogo completo, com atualizações frequentes." },
  { icon: Palette, title: "Temas personalizados", desc: "Criamos exatamente como você imaginou." },
  { icon: Sparkles, title: "Catálogo digital inteligente", desc: "Escolha a arte antes mesmo de pedir o orçamento." },
  { icon: MessageCircle, title: "Atendimento rápido", desc: "Resposta ágil no WhatsApp em cada etapa." },
  { icon: Gem, title: "Excelente custo-benefício", desc: "Festa incrível sem pesar no bolso." },
  { icon: Package, title: "Retire e monte com praticidade", desc: "Tudo pronto para você montar em minutos." },
  { icon: FileText, title: "Processo simples e organizado", desc: "Contrato digital e etapas claras do início ao fim." },
  { icon: Heart, title: "Atendimento humanizado", desc: "Cuidamos de cada detalhe com carinho." },
];

function Diferenciais() {
  return (
    <Section
      id="diferenciais"
      eyebrow="Diferenciais"
      title="Por que escolher a LHL Festas?"
      subtitle="Praticidade, variedade e um atendimento que faz diferença — do primeiro contato à devolução do kit."
      className="bg-muted/40"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {DIFFERENCIAIS.map((d) => (
          <div
            key={d.title}
            className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <d.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-serif text-lg text-foreground">{d.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- KITS / PLANOS ----------

function Planos() {
  const kits = getKitsByModalidade("festa-na-mesa");
  return (
    <Section
      id="planos"
      eyebrow="🎉 Festa na Mesa"
      title="Festa na Mesa"
      subtitle="Transforme sua mesa principal em uma linda decoração, com praticidade, economia e muito charme."
    >
      <p className="mx-auto -mt-6 mb-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
        A modalidade Festa na Mesa foi criada para quem deseja uma decoração bonita,
        prática e acessível para aniversários, chás, pequenas comemorações e festas em casa.
        Você escolhe o tema no nosso catálogo e define o kit ideal para deixar sua
        comemoração ainda mais especial, sem abrir mão da qualidade e da beleza.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {kits.map((p) => {
          const highlight = p.id === "fm-premium";
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                highlight
                  ? "border-primary/60 bg-gradient-to-br from-card to-primary/5 shadow-[var(--shadow-soft)] lg:-translate-y-3"
                  : "border-border/70 bg-card hover:-translate-y-1"
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Mais escolhido
                </div>
              )}
              <div className="flex items-center gap-2">
                {highlight ? (
                  <Crown className="h-5 w-5 text-[color:var(--gold)]" />
                ) : (
                  <Gem className="h-5 w-5 text-primary" />
                )}
                <h3 className="font-serif text-2xl text-foreground">{p.nome}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.descricao}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
                {p.itens.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/orcamento"
                className="mt-8"
                onClick={() => trackHomeEvent("home_budget_click", { location: "planos", plano: p.nome })}
              >
                <Button
                  className={`w-full ${highlight ? "" : "bg-foreground text-background hover:bg-foreground/90"}`}
                >
                  Solicitar {p.nome}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
        Ainda não escolheu o seu tema? <a href={catalogHref()} target="_blank" rel="noreferrer" onClick={() => trackHomeEvent("home_catalog_click", { location: "planos_footer" })} className="font-medium text-primary hover:underline">Explore nosso catálogo</a> com mais de mil opções e depois escolha o kit perfeito para a sua comemoração.
      </p>
    </Section>
  );
}


// ---------- PEG & MONTE ----------

const PEG_MONTE_ADICIONAIS = [
  { label: "Número iluminado em LED", icon: Sparkles },
  { label: "Letreiro decorativo", icon: PartyPopper },
  { label: "Nome personalizado", icon: Palette },
  { label: "Tapete", icon: LayoutGrid },
  { label: "Display de chão", icon: Gem },
  { label: "Cubos decorativos", icon: Package },
  { label: "Urso decorativo", icon: Heart },
  { label: "Arcos extras de balões", icon: Crown },
];

function PegMonte() {
  const kits = getKitsByModalidade("peg-monte");
  return (
    <Section
      id="peg-monte"
      eyebrow="🎈 Peg & Monte"
      title="Peg & Monte"
      subtitle="Retire sua decoração pronta, monte com facilidade e transforme qualquer ambiente em uma linda comemoração."
      className="bg-muted/40"
    >
      <p className="mx-auto -mt-6 mb-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
        A modalidade Peg &amp; Monte foi criada para quem deseja uma decoração mais completa,
        mantendo praticidade e excelente custo-benefício. Você retira, monta em minutos e
        aproveita a festa sem preocupação.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {kits.map((k) => {
          const destaque = k.id === "pm-completo";
          return (
            <div
              key={k.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all ${
                destaque
                  ? "border-primary/60 shadow-[var(--shadow-soft)] lg:-translate-y-3"
                  : "border-border/70 hover:-translate-y-1"
              }`}
            >
              {destaque && (
                <div className="absolute right-4 top-4 z-10 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Mais escolhido
                </div>
              )}
              <div className="flex flex-1 flex-col p-8">
                <h3 className="font-serif text-2xl text-foreground">{k.nome}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{k.descricao}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  {k.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/orcamento"
                  className="mt-6"
                  onClick={() =>
                    trackHomeEvent("home_budget_click", {
                      location: "peg_monte",
                      kit: k.nome,
                    })
                  }
                >
                  <Button className="w-full">Solicitar orçamento</Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>


      {/* Adicionais */}
      <div className="mt-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Adicionais</div>
          <h3 className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">
            Personalize sua decoração
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Todos os kits Peg &amp; Monte podem receber itens adicionais conforme a necessidade
            da sua festa — combine à vontade para deixar o cenário com a sua cara.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PEG_MONTE_ADICIONAIS.map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <a.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-foreground">{a.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/orcamento"
            onClick={() =>
              trackHomeEvent("home_budget_click", { location: "peg_monte_adicionais" })
            }
          >
            <Button size="lg" className="gap-2">
              Montar meu orçamento personalizado <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ---------- TRABALHOS ----------

function Trabalhos() {
  const gallery = [
    festaNaMesaImages[1],
    festaNaMesaImages[3],
    pegEMonteImages[1],
    festaNaMesaImages[5],
    pegEMonteImages[2],
    festaNaMesaImages[8],
  ].filter(Boolean);
  return (
    <Section
      id="trabalhos"
      eyebrow="Portfólio"
      title="Festas reais montadas com nossos kits"
      subtitle="Uma pequena mostra do que já entregamos — com carinho, praticidade e temas para todos os estilos."
      className="bg-muted/40"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((src, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <img
              src={src}
              alt={`Decoração de festa infantil montada com kit LHL — exemplo ${i + 1}`}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <a href="https://www.instagram.com/lhl_festas" target="_blank" rel="noreferrer">
          <Button variant="outline" size="lg" className="gap-2">
            <Instagram className="h-4 w-4" /> Ver mais no Instagram
          </Button>
        </a>
      </div>
    </Section>
  );
}

// ---------- FEEDBACKS ----------

const FEEDBACKS = [
  {
    name: "Camila R.",
    text: "Simplesmente perfeito! Recebemos tudo pronto e a festa ficou linda. Vou indicar para todo mundo.",
    img: feedbackImages[0],
  },
  {
    name: "Fernanda L.",
    text: "Atendimento incrível e muito cuidado nos detalhes. Deu para fazer uma festa dos sonhos sem estourar o orçamento.",
    img: feedbackImages[1],
  },
  {
    name: "Juliana M.",
    text: "Personalizaram exatamente como eu imaginei. Minha filha amou o painel dela!",
    img: feedbackImages[2],
  },
];

function Feedbacks() {
  return (
    <Section
      eyebrow="Depoimentos"
      title="Famílias que já viveram essa experiência"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {FEEDBACKS.map((f) => (
          <figure
            key={f.name}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-8"
          >
            <div className="text-[color:var(--gold)]">★★★★★</div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
              "{f.text}"
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <img src={f.img} alt={f.name} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
              <div className="text-sm font-medium text-foreground">{f.name}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

// ---------- CONFIANÇA ----------

const ORG = [
  "Reserva online",
  "Contrato digital",
  "Checklist de entrega",
  "Controle de retirada",
  "Controle de devolução",
  "Atendimento rápido no WhatsApp",
  "Processo organizado do início ao fim",
];

function Organizada() {
  return (
    <Section
      eyebrow="Confiança"
      title="Mais organização para a sua tranquilidade"
      subtitle="Cada etapa é cuidada com processos claros — para você só se preocupar em comemorar."
      className="bg-muted/40"
    >
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {ORG.map((o) => (
          <div
            key={o}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-5 py-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">{o}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- FAQ ----------

const FAQ = [
  {
    q: "Quantos temas posso escolher no catálogo?",
    a: "Nosso catálogo digital tem mais de 1.000 temas disponíveis, para Festa na Mesa e Peg & Monte, com novas artes adicionadas constantemente.",
  },
  {
    q: "E se eu não encontrar o tema ideal?",
    a: "Também desenvolvemos temas personalizados. Você conta a sua ideia e nossa equipe cria uma decoração exclusiva para a sua festa.",
  },
  {
    q: "Como funciona o Peg & Monte?",
    a: "Você retira o kit completo na nossa loja, monta em minutos seguindo as instruções e depois devolve. Simples assim.",
  },
  {
    q: "Como faço o meu orçamento?",
    a: "Escolha o tema no catálogo e sua seleção segue automaticamente para o formulário de orçamento. Se preferir, você também pode solicitar direto pelo WhatsApp.",
  },
  {
    q: "Preciso pagar caução?",
    a: "Sim, uma caução simbólica é retida e devolvida integralmente após a devolução do kit em bom estado.",
  },
  {
    q: "Qual a antecedência ideal para reservar?",
    a: "Recomendamos reservar com pelo menos 2 a 3 semanas de antecedência, especialmente para temas personalizados.",
  },
];

function FAQBlock() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Perguntas frequentes">
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="overflow-hidden rounded-xl border border-border/70 bg-card px-5"
            >
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

// ---------- CTA FINAL ----------

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-[color:var(--gold)]/10 to-primary/10" />
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Heart className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-6 font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          Sua festa começa aqui.
          <br />
          <span className="italic text-primary">Comece pelo catálogo.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Escolha entre mais de 1.000 temas, encontre o kit ideal e receba seu orçamento com tudo pronto.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href={catalogHref()}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackHomeEvent("home_catalog_click", { location: "final_cta" })}
          >
            <Button size="lg" className="gap-2 bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90">
              🎨 Ver Catálogo
            </Button>
          </a>
          <Link
            to="/orcamento"
            onClick={() => trackHomeEvent("home_budget_click", { location: "final_cta" })}
          >
            <Button size="lg" variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" /> Solicitar Orçamento
            </Button>
          </Link>
          <a
            href={catalogHref("personalizado")}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackHomeEvent("home_custom_theme_click", { location: "final_cta" })}
          >
            <Button size="lg" variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" /> Tema Personalizado
            </Button>
          </a>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Prefere falar com a gente? <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Chame no WhatsApp</a>.
        </p>
      </div>
    </section>
  );
}

// ---------- FOOTER ----------

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoImages[0]} alt="LHL Festas" className="h-10 w-10 rounded-full object-cover" />
              <span className="font-serif text-xl">LHL Festas</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Catálogo digital com mais de 1.000 temas para Festa na Mesa, Peg &amp; Monte e temas personalizados.
            </p>
            <div className="mt-5 flex gap-3">
              <a href="https://www.instagram.com/lhl_festas" target="_blank" rel="noreferrer" aria-label="Instagram @lhl_festas" className="rounded-full border border-border/70 p-2 hover:bg-muted">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full border border-border/70 p-2 hover:bg-muted">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="rounded-full border border-border/70 p-2 hover:bg-muted">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Contato</div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" /> Nossa loja física</li>
              <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4" /> Seg — Sáb, 9h às 18h</li>
              <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4" /> Atendimento no WhatsApp</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Links úteis</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#catalogo" className="hover:text-foreground">Catálogo</a></li>
              <li><a href="#como-funciona" className="hover:text-foreground">Como funciona</a></li>
              <li><a href="#modalidades" className="hover:text-foreground">Modalidades</a></li>
              <li><a href="#personalizado" className="hover:text-foreground">Tema personalizado</a></li>
              <li><a href="#faq" className="hover:text-foreground">Perguntas frequentes</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Comece agora</div>
            <p className="mt-4 text-sm text-muted-foreground">Escolha o tema no catálogo e receba seu orçamento.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={catalogHref()}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackHomeEvent("home_catalog_click", { location: "footer" })}
              >
                <Button size="sm" variant="outline" className="gap-2">
                  <Palette className="h-4 w-4" /> Catálogo
                </Button>
              </a>
              <Link
                to="/orcamento"
                onClick={() => trackHomeEvent("home_budget_click", { location: "footer" })}
              >
                <Button size="sm" className="gap-2">
                  <Handshake className="h-4 w-4" /> Orçamento
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} LHL Festas. Todos os direitos reservados.</div>
          <Link to="/login" className="text-muted-foreground/70 hover:text-foreground">
            Acesso Interno
          </Link>
        </div>
      </div>
    </footer>
  );
}

// Silence unused-icon warning if any icon is imported but not used above.
const _unusedIcons = { PartyPopper, Truck, Wrench, PackageCheck, ClipboardList };
void _unusedIcons;

function HomePage() {
  useCatalogLinksReady();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <CatalogHighlight />
        <ComoFunciona />
        <Modalidades />
        <MilTemas />
        <Personalizado />
        <Diferenciais />
        <Planos />
        <PegMonte />
        <Trabalhos />
        <Feedbacks />
        <Organizada />
        <FAQBlock />
        <FinalCTA />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ConsultorFAB />
      </Suspense>
    </div>
  );
}
