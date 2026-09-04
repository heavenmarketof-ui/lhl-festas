import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Gem,
  Heart,
  Home,
  Instagram,
  Menu,
  MessageCircle,
  PackageCheck,
  Settings2,
  ShieldCheck,
  Star,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { feedbackImages, logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;

const HERO_IMAGE = driveImage("1FTVXnS_eFo_gZHo1EGhQgq1nauyGq5pc");
const FESTA_NA_MESA_IMAGE = driveImage("1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov");
const PERSONALIZADO_IMAGE = driveImage("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi");
const PEG_MONTE_IMAGE = driveImage("1d5xpnRNkiSECrh5FlkSC8DnISWWDBMh9");

const INSPIRACOES = [
  driveImage("1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu"),
  driveImage("1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V"),
  driveImage("15zwnq9Ejv-JYvqGfE3K69Rn7DgXthDCq"),
  driveImage("1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf"),
  HERO_IMAGE,
  driveImage("133QbMl8xmGoa3XJD4sFGpjY51aDXmtpb"),
];

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Quero solicitar um orçamento com a LHL Festas.",
)}`;

const vinho = "#651421";
const vinhoEscuro = "#470b15";
const rosa = "#d87982";
const rosaClaro = "#f6dbd7";
const marfim = "#fff8f0";
const dourado = "#c89b58";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Transformamos momentos em memórias especiais" },
      {
        name: "description",
        content:
          "Festa na Mesa, Peg & Monte e temas personalizados para celebrações inesquecíveis no ABC.",
      },
      { property: "og:title", content: "LHL Festas — Momentos inesquecíveis" },
      { property: "og:image", content: HERO_IMAGE },
      { property: "og:url", content: "https://www.lhlfestas.com.br/" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/" }],
  }),
  component: HomePage,
});

function trackHomeEvent(event: string, extra: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...extra });
    w.gtag?.("event", event, extra);
  } catch {}
}

const NAV = [
  { label: "Início", href: "#inicio" },
  { label: "Festa na Mesa", href: "#modalidades" },
  { label: "Peg & Monte", href: "#modalidades" },
  { label: "Tema Personalizado", href: "#personalizado" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Depoimentos", href: "#clientes" },
];

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 text-white shadow-lg" style={{ background: `linear-gradient(90deg, ${vinhoEscuro}, ${vinho})` }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" className="h-14 w-14 rounded-full border border-[#d8b06c]/60 object-cover shadow-md" />
          <div className="hidden sm:block">
            <div className="font-serif text-xl text-[#f4d49b]">LHL Festas</div>
            <div className="text-[9px] uppercase tracking-[.24em] text-white/65">Peg & Monte</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-[13px] lg:flex">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} className="border-b border-transparent py-2 transition hover:border-[#d8b06c] hover:text-[#f4d49b]">
              {item.label}
            </a>
          ))}
        </nav>

        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hidden lg:block" onClick={() => trackHomeEvent("home_whatsapp_click", { location: "header" })}>
          <Button className="rounded-full border-0 px-6 font-semibold text-[#54101a] shadow-lg hover:opacity-90" style={{ background: rosa }}>
            <MessageCircle className="mr-2 h-4 w-4" /> Fale com a gente <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </a>

        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-5 py-4 lg:hidden">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-white/10">
              {item.label}
            </a>
          ))}
          <Link to="/orcamento">
            <Button className="mt-3 w-full" style={{ background: rosa }}>Solicitar orçamento</Button>
          </Link>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden text-white" style={{ background: vinho }}>
      <div className="mx-auto grid max-w-7xl lg:min-h-[650px] lg:grid-cols-[.85fr_1.15fr]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-14 md:px-12 lg:py-20">
          <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 20% 30%, ${rosa}, transparent 48%)` }} />
          <div className="relative">
            <h1 className="max-w-xl font-serif text-5xl leading-[.95] sm:text-6xl lg:text-7xl">
              Transformamos<br />momentos em<br />
              <span className="italic text-[#efb6b5]">memórias especiais!</span>
            </h1>
            <div className="my-7 flex items-center gap-4 text-[#efb6b5]"><span className="h-px w-24 bg-current" /><Heart className="h-5 w-5 fill-current" /><span className="h-px w-24 bg-current" /></div>
            <p className="max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
              Decorações completas, práticas e cheias de encanto para tornar a sua celebração inesquecível.
            </p>
            <Link to="/orcamento" onClick={() => trackHomeEvent("home_budget_click", { location: "hero" })}>
              <Button size="lg" className="mt-8 rounded-full border-0 px-7 font-semibold shadow-xl" style={{ background: rosa }}>
                <MessageCircle className="mr-2 h-5 w-5" /> Quero fazer um orçamento <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-10 grid max-w-md grid-cols-4 gap-4 text-center text-xs text-white/90">
              {[['Locou', CalendarDays], ['Retirou', PackageCheck], ['Montou', Settings2], ['Devolveu', Truck]].map(([label, Icon]) => {
                const C = Icon as typeof CalendarDays;
                return <div key={label as string}><C className="mx-auto mb-2 h-6 w-6 text-[#efb6b5]" /><span>{label as string}</span></div>;
              })}
            </div>
          </div>
        </div>

        <div className="relative min-h-[500px] lg:min-h-full">
          <img src={HERO_IMAGE} alt="Decoração Moranguinho da LHL Festas" className="absolute inset-0 h-full w-full object-cover object-center" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#651421] via-[#651421]/15 to-transparent" />
          <div className="absolute right-5 top-10 max-w-[180px] rounded-2xl bg-[#f6d9d3]/95 p-4 text-center text-xs leading-relaxed text-[#5d1720] shadow-xl">
            <Heart className="mx-auto mb-2 h-4 w-4 fill-current" />
            <strong className="block font-serif text-lg">Decorações que encantam de verdade!</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function Modalidades() {
  const cards = [
    {
      title: "Festa na Mesa",
      image: FESTA_NA_MESA_IMAGE,
      text: "Decorações completas e encantadoras para celebrações intimistas.",
      cta: "Ver temas",
    },
    {
      title: "Peg & Monte",
      image: PEG_MONTE_IMAGE,
      text: "Decorações práticas para você montar do seu jeito.",
      cta: "Ver temas",
      dark: true,
    },
    {
      title: "Tema Personalizado",
      image: PERSONALIZADO_IMAGE,
      text: "Não encontrou o tema ideal? Criamos uma proposta especial para você.",
      cta: "Solicitar orçamento",
    },
  ];

  return (
    <section id="modalidades" className="py-5" style={{ background: marfim }}>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-3">
        {cards.map((card, i) => (
          <article id={i === 2 ? "personalizado" : undefined} key={card.title} className="grid min-h-[265px] grid-cols-[.95fr_1.05fr] items-center overflow-hidden rounded-2xl p-5 shadow-md" style={{ background: card.dark ? vinho : rosaClaro, color: card.dark ? "white" : vinho }}>
            <img src={card.image} alt={card.title} className="aspect-square w-full rounded-full border-4 border-white/30 object-cover object-center shadow-lg" />
            <div className="pl-5">
              <h2 className="font-serif text-3xl italic">{card.title}</h2>
              <p className={`mt-3 text-sm leading-relaxed ${card.dark ? 'text-white/80' : ''}`}>{card.text}</p>
              <Link to="/orcamento">
                <Button className="mt-5 rounded-full border-0 text-xs" style={{ background: card.dark ? marfim : rosa, color: vinho }}>
                  {card.cta}<ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ComoFunciona() {
  const steps = [
    ["Escolha o tema", "Navegue pelas inspirações e escolha o seu preferido.", CalendarDays],
    ["Reserve", "Fale com a gente e garanta a sua data.", PackageCheck],
    ["Retire e monte", "Você retira, monta e aproveita a festa!", Settings2],
    ["Devolva", "Após o evento, é só devolver.", Truck],
  ] as const;

  return (
    <section id="como-funciona" className="py-16" style={{ background: "#fffaf4" }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.75fr_2.25fr]">
        <div>
          <h2 className="font-serif text-5xl italic leading-none" style={{ color: vinho }}>Como<br /><span style={{ color: rosa }}>funciona?</span></h2>
          <p className="mt-4 text-sm text-[#5e4543]">Simples, prático e sem complicação!</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text, Icon], i) => (
            <div key={title} className="border-l border-[#d8b7ad] pl-6">
              <div className="mb-4 flex items-center gap-3"><span className="font-serif text-3xl" style={{ color: vinho }}>{i + 1}</span><span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: rosaClaro }}><Icon className="h-6 w-6" style={{ color: vinho }} /></span></div>
              <h3 className="font-serif text-xl font-semibold" style={{ color: vinho }}>{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#624d49]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inspiracoes() {
  return (
    <section id="decoracoes" className="py-16 text-white" style={{ background: `linear-gradient(120deg, ${vinhoEscuro}, ${vinho})` }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.65fr_2.35fr]">
        <div className="flex flex-col justify-center">
          <h2 className="font-serif text-5xl leading-none">Festas<br /><span className="italic text-[#efb6b5]">que inspiram</span></h2>
          <div className="my-6 flex items-center gap-3 text-[#efb6b5]"><span className="h-px w-20 bg-current" /><Heart className="h-4 w-4 fill-current" /></div>
          <p className="max-w-xs text-sm leading-relaxed text-white/75">Cada decoração é única, assim como cada história. Aqui estão algumas das festas reais da LHL que mais representam o nosso trabalho.</p>
          <a href="#modalidades" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold" style={{ background: rosa }}>Ver mais decorações <ArrowRight className="h-4 w-4" /></a>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {INSPIRACOES.map((src, i) => (
            <img key={i} src={src} alt="Festa real da LHL Festas" className="aspect-[3/4] w-full rounded-xl object-cover object-center shadow-xl" loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Diferenciais() {
  const itens = [
    [Gem, "Decorações de qualidade"],
    [Heart, "Temas atualizados"],
    [MessageCircle, "Atendimento personalizado"],
    [Home, "Atendemos em toda a região do ABC"],
    [Star, "Seu momento, nossa prioridade!"],
  ] as const;

  return (
    <section className="py-12" style={{ background: rosaClaro }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.7fr_2.3fr]">
        <div>
          <h2 className="font-serif text-4xl italic leading-none" style={{ color: vinho }}>O diferencial<br />da LHL</h2>
          <div className="my-5 flex items-center gap-3" style={{ color: rosa }}><span className="h-px w-16 bg-current" /><Heart className="h-4 w-4 fill-current" /></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {itens.map(([Icon, label]) => (
            <div key={label} className="text-center">
              <Icon className="mx-auto h-8 w-8" style={{ color: rosa }} />
              <p className="mt-3 text-sm leading-snug" style={{ color: vinho }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clientes() {
  const textos = [
    "Tudo lindo, organizado e de ótima qualidade! A decoração fez toda a diferença na nossa festa.",
    "Atendimento impecável, peças lindas e muito práticas. Foi tudo perfeito!",
    "Amei a experiência! A decoração é ainda mais linda pessoalmente.",
  ];

  return (
    <section id="clientes" className="py-16" style={{ background: "#fff4ec" }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[.7fr_2.3fr]">
        <div>
          <h2 className="font-serif text-5xl italic leading-none" style={{ color: vinho }}>O que nossos<br />clientes dizem</h2>
          <div className="my-5 flex items-center gap-3 text-[#cf8587]"><span className="h-px w-16 bg-current" /><Heart className="h-4 w-4 fill-current" /><span className="h-px w-16 bg-current" /></div>
          <p className="text-sm" style={{ color: vinho }}>Mais que decorações,<br />entregamos sorrisos!</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {feedbackImages.slice(0, 3).map((img, i) => (
            <article key={i} className="rounded-2xl bg-white p-5 shadow-md">
              <div className="font-serif text-5xl leading-none text-[#d99496]">“</div>
              <p className="min-h-16 text-sm leading-relaxed text-[#503a38]">{textos[i]}</p>
              <div className="mt-4 flex items-center gap-3">
                <img src={img} alt="Feedback de cliente" className="h-10 w-10 rounded-full object-cover" />
                <div><div className="text-xs font-bold" style={{ color: vinho }}>Cliente LHL</div><div className="text-sm text-[#d29b45]">★★★★★</div></div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-14 text-white" style={{ background: `linear-gradient(100deg, ${vinhoEscuro}, ${vinho})` }}>
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-[1.7fr_.7fr]">
        <div className="text-center lg:text-left">
          <h2 className="font-serif text-4xl sm:text-5xl">Vamos tornar a sua festa <span className="italic text-[#efb6b5]">inesquecível?</span></h2>
          <p className="mt-3 text-sm text-white/70">Fale agora com nossa equipe e receba um orçamento personalizado.</p>
          <Link to="/orcamento">
            <Button size="lg" className="mt-6 rounded-full border-0 px-8 font-semibold" style={{ background: rosa }}>
              <MessageCircle className="mr-2 h-5 w-5" /> Quero um orçamento agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="space-y-4 border-l border-white/20 pl-8 text-sm text-white/80">
          <div className="flex gap-3"><CalendarDays className="text-[#efb6b5]" />Atendemos em toda a região do ABC</div>
          <div className="flex gap-3"><ShieldCheck className="text-[#efb6b5]" />Decorações de qualidade e muito bem cuidadas</div>
          <div className="flex gap-3"><Heart className="text-[#efb6b5]" />Seu momento, nossa prioridade!</div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#d8b06c]/20 py-9 text-white" style={{ background: "#390b12" }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 md:flex-row">
        <div className="flex items-center gap-3">
          <img src={logoImages[0]} className="h-12 w-12 rounded-full" alt="LHL Festas" />
          <div><div className="font-serif text-xl text-[#f0cf91]">LHL Festas</div><div className="text-xs text-white/50">Transformamos momentos em memórias especiais.</div></div>
        </div>
        <a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><Instagram className="h-4 w-4" />@lhl_festas</a>
      </div>
    </footer>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: marfim }}>
      <Header />
      <main>
        <Hero />
        <Modalidades />
        <ComoFunciona />
        <Inspiracoes />
        <Diferenciais />
        <Clientes />
        <FinalCTA />
      </main>
      <Footer />
      <Suspense fallback={null}><ConsultorFAB /></Suspense>
    </div>
  );
}
