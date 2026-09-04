import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Instagram,
  Menu,
  MessageCircle,
  PackageCheck,
  PartyPopper,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  festaNaMesaImages,
  feedbackImages,
  inspireSeImages,
  logoImages,
  pegEMonteImages,
} from "@/assets/lhl";
import personalizadoHeroAsset from "@/assets/lhl/personalizado/personalizado-lenda.jpg";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));

const HERO_IMAGE =
  "https://drive.google.com/uc?export=view&id=1AtLMBa4oqSDJBX22NZofnl4yt3jI3bYl";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Quero solicitar um orçamento com a LHL Festas.",
)}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Decorações para momentos inesquecíveis" },
      {
        name: "description",
        content:
          "Festa na Mesa, Peg & Monte e decorações personalizadas. Conheça festas reais da LHL Festas e solicite seu orçamento.",
      },
      { property: "og:title", content: "LHL Festas — Sua festa merece ser inesquecível" },
      {
        property: "og:description",
        content:
          "Festa na Mesa, Peg & Monte e decorações personalizadas para transformar cada comemoração em um momento especial.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: HERO_IMAGE },
      { property: "og:url", content: "https://www.lhlfestas.com.br/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://www.lhlfestas.com.br/" },
      { rel: "preload", as: "image", href: HERO_IMAGE, fetchPriority: "high" } as never,
    ],
  }),
  component: HomePage,
});

function trackHomeEvent(event: string, extra: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...extra });
    w.gtag?.("event", event, extra);
  } catch {
    // analytics nunca deve interromper a experiência do cliente
  }
}

const NAV = [
  { label: "Decorações", href: "#decoracoes" },
  { label: "Modalidades", href: "#modalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Clientes", href: "#clientes" },
];

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" className="h-11 w-11 rounded-full object-cover" />
          <div className="leading-none">
            <div className="font-serif text-xl font-semibold text-foreground">LHL Festas</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Festas com afeto</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={() => trackHomeEvent("home_whatsapp_click", { location: "header" })}>
            <Button variant="ghost" size="sm">Falar com a LHL</Button>
          </a>
          <Link to="/orcamento" onClick={() => trackHomeEvent("home_budget_click", { location: "header" })}>
            <Button size="sm" className="gap-2 shadow-sm">
              Solicitar orçamento <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Abrir menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-muted">
                {item.label}
              </a>
            ))}
            <Link to="/orcamento" className="mt-3" onClick={() => setOpen(false)}>
              <Button className="w-full">Solicitar orçamento</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(215,163,164,0.14),transparent_36%),radial-gradient(circle_at_80%_85%,rgba(196,158,96,0.12),transparent_34%)]" />
      <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-5 py-10 md:px-8 md:py-16 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:py-20">
        <div className="order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-2 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Decorações pensadas para o seu momento
          </div>
          <h1 className="max-w-2xl font-serif text-5xl leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Sua festa merece ser <span className="italic text-primary">inesquecível.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Festa na Mesa, Peg &amp; Monte e decorações com montagem para transformar ideias em comemorações cheias de personalidade.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#decoracoes" onClick={() => trackHomeEvent("home_decorations_click", { location: "hero" })}>
              <Button size="lg" className="w-full gap-2 px-7 sm:w-auto">
                Ver decorações <ChevronRight className="h-4 w-4" />
              </Button>
            </a>
            <Link to="/orcamento" onClick={() => trackHomeEvent("home_budget_click", { location: "hero" })}>
              <Button size="lg" variant="outline" className="w-full gap-2 bg-background/60 px-7 sm:w-auto">
                <MessageCircle className="h-4 w-4" /> Solicitar orçamento
              </Button>
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Festa na Mesa', 'Peg & Monte', 'Montagem no local'].map((item) => (
              <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{item}</span>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative mx-auto max-w-[640px]">
            <div className="absolute -inset-4 -z-10 rotate-2 rounded-[2.5rem] bg-primary/12" />
            <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-card shadow-[0_28px_80px_-34px_rgba(94,58,51,0.38)]">
              <img src={HERO_IMAGE} alt="Decoração real da LHL Festas" className="aspect-[4/5] w-full object-cover object-center" fetchPriority="high" />
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-2xl border border-border/70 bg-background/95 px-5 py-4 shadow-xl backdrop-blur sm:left-5">
              <div className="font-serif text-xl text-foreground">Festas reais</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Projetadas e produzidas pela LHL</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Modalidades() {
  return (
    <section id="modalidades" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Escolha seu jeito de comemorar</div>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">Do prático ao completo, a festa continua sendo sua.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Você escolhe o formato que combina com a sua rotina e a LHL cuida dos detalhes para deixar tudo bonito e coerente.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="group relative min-h-[520px] overflow-hidden rounded-[2rem]">
            <img src={festaNaMesaImages[3] ?? festaNaMesaImages[0]} alt="Festa na Mesa LHL" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
              <div className="text-xs uppercase tracking-[0.22em] text-white/70">Praticidade com charme</div>
              <h3 className="mt-2 font-serif text-4xl">Festa na Mesa</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">Uma composição bonita e funcional para comemorações intimistas, sem abrir mão dos detalhes.</p>
              <Link to="/orcamento" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Quero essa modalidade <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </article>

          <article className="group relative min-h-[520px] overflow-hidden rounded-[2rem]">
            <img src={pegEMonteImages[0]} alt="Peg e Monte LHL" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
              <div className="text-xs uppercase tracking-[0.22em] text-white/70">Você monta do seu jeito</div>
              <h3 className="mt-2 font-serif text-4xl">Peg &amp; Monte</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">Retire seu kit, monte com facilidade e transforme o espaço com uma composição pronta para encantar.</p>
              <Link to="/orcamento" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Quero essa modalidade <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </article>
        </div>

        <div className="mt-5 grid overflow-hidden rounded-[2rem] border border-border/60 bg-card md:grid-cols-[0.9fr_1.1fr]">
          <img src={personalizadoHeroAsset} alt="Decoração personalizada LHL" className="h-72 w-full object-cover md:h-full" />
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Para sair do óbvio</div>
            <h3 className="mt-3 font-serif text-3xl sm:text-4xl">Quer algo totalmente personalizado?</h3>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">Conte sua ideia para a gente. Criamos uma proposta visual pensada para o tema, o espaço e o estilo da sua comemoração.</p>
            <Link to="/orcamento" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Solicitar projeto personalizado <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Decoracoes() {
  const photos = [
    festaNaMesaImages[0],
    pegEMonteImages[1] ?? pegEMonteImages[0],
    inspireSeImages[0],
    festaNaMesaImages[8] ?? festaNaMesaImages[2],
    inspireSeImages[2] ?? inspireSeImages[1],
    festaNaMesaImages[15] ?? festaNaMesaImages[4],
  ].filter(Boolean);

  return (
    <section id="decoracoes" className="bg-muted/35 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Decorações em destaque</div>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Festas que já saíram do papel.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">Inspire-se em composições reais criadas pela LHL para aniversários, mesversários e momentos especiais.</p>
        </div>

        <div className="mt-12 grid auto-rows-[210px] grid-cols-2 gap-3 md:auto-rows-[260px] md:grid-cols-4 md:gap-4">
          {photos.map((src, index) => (
            <div key={src} className={`group overflow-hidden rounded-[1.5rem] ${index === 0 || index === 5 ? 'row-span-2' : ''} ${index === 2 ? 'md:col-span-2' : ''}`}>
              <img src={src} alt={`Decoração LHL Festas ${index + 1}`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
          ))}
        </div>

        <div className="mt-9 text-center">
          <Link to="/orcamento" onClick={() => trackHomeEvent("home_budget_click", { location: "decorations" })}>
            <Button variant="outline" size="lg" className="gap-2 bg-background">Quero uma festa assim <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function EditorialMosaic() {
  const tiles = [
    { src: inspireSeImages[1] ?? festaNaMesaImages[5], label: "Delicada" },
    { src: festaNaMesaImages[10] ?? festaNaMesaImages[3], label: "Colorida" },
    { src: pegEMonteImages[3] ?? pegEMonteImages[0], label: "Divertida" },
    { src: inspireSeImages[3] ?? inspireSeImages[0], label: "Elegante" },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Uma decoração para cada momento</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">A personalidade da festa aparece nos detalhes.</h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">Cores, formas e peças escolhidas para criar uma composição que faça sentido para você — sem cara de festa genérica.</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary" onClick={() => trackHomeEvent("home_whatsapp_click", { location: "mosaic" })}>
              Conversar sobre minha ideia <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {tiles.map((tile, index) => (
              <div key={tile.label} className={`relative overflow-hidden rounded-[1.5rem] ${index % 2 === 0 ? 'translate-y-5' : ''}`}>
                <img src={tile.src} alt={`Decoração ${tile.label.toLowerCase()} LHL Festas`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 font-serif text-2xl text-white">{tile.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const steps = [
    { number: "01", title: "Conte sobre a festa", text: "Tema, data, local e o estilo que você imagina." },
    { number: "02", title: "Escolha a proposta", text: "A gente organiza a melhor composição para o seu momento." },
    { number: "03", title: "Alinhamos os detalhes", text: "Itens, horários e tudo que precisa estar combinado antes da festa." },
    { number: "04", title: "É hora de comemorar", text: "Você recebe seu kit ou a decoração pronta para aproveitar o dia." },
  ];

  return (
    <section id="como-funciona" className="bg-primary/[0.07] py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-12 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Como funciona</div>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Simples do começo ao parabéns.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="rounded-[1.5rem] border border-border/60 bg-background/80 p-6 shadow-sm">
              <div className="font-serif text-3xl text-primary/55">{step.number}</div>
              <h3 className="mt-5 font-serif text-2xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clientes() {
  return (
    <section id="clientes" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Quem já comemorou com a gente</div>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Festas reais. Momentos inesquecíveis.</h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feedbackImages.slice(0, 6).map((src, index) => (
            <div key={src} className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-card p-2 shadow-sm">
              <img src={src} alt={`Feedback de cliente LHL Festas ${index + 1}`} loading="lazy" className="h-full max-h-[420px] w-full rounded-[1.15rem] object-cover object-top" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 pb-20 pt-4 md:px-8 md:pb-28">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-foreground px-7 py-12 text-background sm:px-10 md:px-14 md:py-16">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-background/60"><PartyPopper className="h-4 w-4" /> Seu próximo momento começa aqui</div>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Vamos transformar sua ideia em uma festa linda?</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-background/70">Conte o que você está planejando. A gente organiza as possibilidades e monta uma proposta para você.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link to="/orcamento" onClick={() => trackHomeEvent("home_budget_click", { location: "final_cta" })}>
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">Solicitar orçamento <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={() => trackHomeEvent("home_whatsapp_click", { location: "final_cta" })}>
              <Button size="lg" variant="outline" className="w-full gap-2 border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background"><MessageCircle className="h-4 w-4" /> Falar no WhatsApp</Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <div className="font-serif text-lg">LHL Festas</div>
            <div className="text-xs text-muted-foreground">Prático, lindo e feito para você.</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><Instagram className="h-4 w-4" /> @lhl_festas</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4" /> ABC Paulista</span>
        </div>
      </div>
    </footer>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Modalidades />
        <Decoracoes />
        <EditorialMosaic />
        <ComoFunciona />
        <Clientes />
        <FinalCTA />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ConsultorFAB />
      </Suspense>
    </div>
  );
}
