import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Heart,
  Instagram,
  Menu,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  extrasImages,
  feedbackImages,
  festaNaMesaImages,
  heroImages,
  inspireSeImages,
  logoImages,
  pegEMonteImages,
} from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Quero solicitar um orçamento com a LHL Festas.",
)}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Festa na Mesa, Peg & Monte e Decorações com Montagem" },
      {
        name: "description",
        content:
          "Decorações para festas no ABC: Festa na Mesa, Peg & Monte e projetos com montagem e desmontagem. Escolha uma inspiração e solicite seu orçamento.",
      },
      { property: "og:title", content: "LHL Festas — Sua festa merece ser inesquecível" },
      {
        property: "og:description",
        content: "Festa na Mesa, Peg & Monte e decorações com montagem para celebrar do seu jeito.",
      },
      { property: "og:image", content: "https://www.lhlfestas.com.br/hero-principal.jpg" },
      { property: "og:url", content: "https://www.lhlfestas.com.br/" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/" }],
  }),
  component: HomePage,
});

function track(event: string, extra: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...extra });
    w.gtag?.("event", event, extra);
  } catch {
    /* analytics nunca deve bloquear a navegação */
  }
}

const NAV = [
  { label: "Decorações", href: "/catalogo" },
  { label: "Modalidades", href: "#modalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Clientes", href: "#clientes" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#4b0c16]/96 text-white shadow-lg backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="LHL Festas — início">
          <img
            src={logoImages[0]}
            alt="LHL Festas"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border border-[#d8b06c]/60 object-cover"
          />
          <div>
            <div className="font-serif text-xl leading-none text-[#f2d091]">LHL Festas</div>
            <div className="mt-1 text-[9px] uppercase tracking-[.22em] text-white/55">Decorações para celebrar</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm lg:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} className="text-white/78 transition hover:text-[#f2d091]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={() => track("home_whatsapp_click", { location: "header" })}>
            <Button className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15">
              <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
            </Button>
          </a>
          <Button asChild className="rounded-full border-0 bg-[#d87982] text-[#4d0d16] hover:bg-[#e18b92]">
            <Link to="/orcamento">Solicitar orçamento</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#58101b] px-4 pb-5 pt-3 lg:hidden">
          <nav className="mx-auto max-w-7xl space-y-1" aria-label="Navegação mobile">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm text-white/86 hover:bg-white/10"
              >
                {item.label}
              </a>
            ))}
            <div className="grid gap-2 pt-3 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-11 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
              </Button>
              <Button asChild className="h-11 bg-[#d87982] text-[#4d0d16] hover:bg-[#e18b92]">
                <Link to="/orcamento" onClick={() => setOpen(false)}>Solicitar orçamento</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#651421] text-white">
      <div className="mx-auto grid max-w-7xl lg:min-h-[650px] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(216,121,130,.28),transparent_42%)]" />
          <div className="relative">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f0c984]">
              <Sparkles className="h-4 w-4" /> Decorações para momentos especiais
            </p>
            <h1 className="max-w-xl font-serif text-[clamp(3.1rem,7vw,5.6rem)] leading-[.92] tracking-[-.025em]">
              Sua festa merece ser <span className="italic text-[#efb6b5]">inesquecível.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Festa na Mesa, Peg &amp; Monte e decorações com montagem. Você escolhe a inspiração e a LHL cuida do caminho até a sua comemoração.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 rounded-full bg-[#d87982] px-7 font-semibold text-[#4d0d16] hover:bg-[#e18b92]">
                <Link to="/catalogo" onClick={() => track("home_catalog_click", { location: "hero" })}>
                  Ver decorações <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/25 bg-white/8 px-7 text-white hover:bg-white/15 hover:text-white">
                <Link to="/orcamento" onClick={() => track("home_budget_click", { location: "hero" })}>
                  Solicitar orçamento
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/68">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#efb6b5]" /> Atendimento personalizado</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#efb6b5]" /> Opções para diferentes tamanhos de festa</span>
            </div>
          </div>
        </div>

        <div className="relative min-h-[440px] sm:min-h-[520px] lg:min-h-full">
          <img
            src={heroImages[0]}
            alt="Decoração de festa produzida pela LHL Festas"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#651421] via-[#651421]/12 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-black/20 p-4 backdrop-blur-sm sm:left-auto sm:max-w-xs">
            <p className="font-serif text-xl text-white">Seu estilo, seu momento.</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">Escolha uma referência do catálogo ou conte para a gente o que você imaginou.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

type ServiceCardProps = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  href: string;
  bullets: string[];
};

function ServiceCard({ title, eyebrow, description, image, href, bullets }: ServiceCardProps) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-[#eadbd4] bg-white shadow-[0_20px_55px_-36px_rgba(82,20,33,.45)]">
      <div className="aspect-[4/3] overflow-hidden bg-[#f5ebe5]">
        <img src={image} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
      </div>
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b27b4e]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-[#651421]">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#715b5f]">{description}</p>
        <ul className="mt-4 space-y-2 text-sm text-[#5d494c]">
          {bullets.map((item) => <li key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c18d55]" /> {item}</li>)}
        </ul>
        <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-full border-[#dcc7bf] text-[#651421] hover:bg-[#fff3ed]">
          <a href={href}>Conhecer esta opção <ChevronRight className="ml-1 h-4 w-4" /></a>
        </Button>
      </div>
    </article>
  );
}

function Modalidades() {
  return (
    <section id="modalidades" className="bg-[#fff8f0] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b27b4e]">Escolha como quer celebrar</p>
          <h2 className="mt-3 font-serif text-4xl text-[#651421] sm:text-5xl">Três formas de montar uma festa linda</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#735d61] sm:text-base">Cada modalidade resolve uma necessidade diferente. Você não precisa entender tudo antes de falar com a gente — o orçamento ajuda a encontrar a melhor composição.</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <ServiceCard
            title="Festa na Mesa"
            eyebrow="Compacta e charmosa"
            description="Uma composição prática para comemorações menores, com visual organizado e itens selecionados para a mesa principal."
            image={festaNaMesaImages[0]}
            href="/festa-na-mesa"
            bullets={["Ideal para espaços menores", "Kits com diferentes composições", "Orçamento sem preço automático"]}
          />
          <ServiceCard
            title="Peg & Monte"
            eyebrow="Você monta"
            description="Você retira os itens, monta no local da festa e devolve depois. Uma opção flexível para quem quer uma decoração maior com autonomia."
            image={pegEMonteImages[0]}
            href="/peg-e-monte"
            bullets={["Painéis, cilindros e acessórios", "Retirada e devolução combinadas", "Tema e kit seguem para o orçamento"]}
          />
          <ServiceCard
            title="Decoração com montagem"
            eyebrow="A LHL monta para você"
            description="Projeto pensado para o seu evento com montagem e desmontagem no local, incluindo a composição alinhada no orçamento."
            image={extrasImages[0] || inspireSeImages[0]}
            href="/orcamento?tipoSolicitacao=festa-com-montagem"
            bullets={["Montagem e desmontagem no local", "Composição personalizada", "Atendimento para alinhar cada detalhe"]}
          />
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const steps = [
    { title: "Escolha uma inspiração", text: "Veja o catálogo ou conte qual tema e estilo você procura.", icon: Heart },
    { title: "Solicite o orçamento", text: "As escolhas que você já fez acompanham o pedido, sem precisar repetir tudo.", icon: MessageCircle },
    { title: "Alinhamos os detalhes", text: "Confirmamos disponibilidade, composição, valores, datas e logística.", icon: CalendarDays },
    { title: "Sua festa acontece", text: "Conforme a modalidade, você retira o kit ou a LHL realiza a montagem e desmontagem.", icon: Sparkles },
  ];

  return (
    <section id="como-funciona" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b27b4e]">Da inspiração à festa</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-[#651421] sm:text-5xl">Um processo simples, sem caminhos confusos</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#735d61]">A LHL organiza o atendimento de acordo com a modalidade escolhida. O cliente informa uma vez e a equipe reaproveita esses dados no atendimento.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-2xl border border-[#eadbd4] bg-[#fffaf6] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f6dbd7] font-serif text-xl text-[#651421]">{index + 1}</span>
                    <Icon className="h-5 w-5 text-[#b27b4e]" />
                  </div>
                  <h3 className="mt-4 font-serif text-2xl text-[#651421]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#735d61]">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Inspiracoes() {
  const images = [inspireSeImages[0], festaNaMesaImages[3], pegEMonteImages[2], heroImages[2]].filter(Boolean);
  return (
    <section className="bg-[#4b0c16] py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#f0c984]">Inspire-se</p>
            <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Algumas festas que inspiram novas ideias</h2>
          </div>
          <Button asChild variant="outline" className="w-fit rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link to="/catalogo">Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
              <img src={image} alt={`Inspiração de decoração LHL ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Confianca() {
  const points = [
    { icon: ShieldCheck, title: "Tudo alinhado antes do evento", text: "Datas, modalidade, composição e condições ficam registradas no atendimento e no contrato." },
    { icon: PackageCheck, title: "Operação organizada", text: "A equipe acompanha preparação, retirada ou montagem e as etapas de retorno." },
    { icon: Truck, title: "Logística conforme a modalidade", text: "Peg & Monte tem retirada/devolução; festas montadas seguem fluxo de montagem/desmontagem." },
  ];
  return (
    <section className="bg-[#fff8f0] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[#eadbd4] bg-white p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f6dbd7]"><Icon className="h-5 w-5 text-[#651421]" /></span>
              <h3 className="mt-4 font-serif text-2xl text-[#651421]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#735d61]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clientes() {
  return (
    <section id="clientes" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b27b4e]">Clientes LHL</p>
          <h2 className="mt-3 font-serif text-4xl text-[#651421] sm:text-5xl">Carinho que volta em forma de mensagem</h2>
          <div className="mt-4 flex justify-center gap-1 text-[#c69a58]" aria-label="5 estrelas">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {feedbackImages.slice(0, 3).map((image, index) => (
            <div key={image} className="overflow-hidden rounded-2xl border border-[#eadbd4] bg-[#fffaf6] p-2">
              <img src={image} alt={`Feedback de cliente LHL ${index + 1}`} loading="lazy" decoding="async" className="h-auto w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[#f6dbd7] py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Heart className="mx-auto h-7 w-7 fill-[#651421] text-[#651421]" />
        <h2 className="mt-4 font-serif text-4xl text-[#651421] sm:text-5xl">Vamos transformar sua ideia em uma festa especial?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#73545a] sm:text-base">Comece pelo catálogo ou envie seu pedido de orçamento. Você não precisa decidir todos os detalhes antes de falar com a LHL.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-full bg-[#651421] px-7 text-white hover:bg-[#52101b]">
            <Link to="/orcamento">Solicitar orçamento <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#c9aaa6] bg-white/55 px-7 text-[#651421] hover:bg-white">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#3d0912] py-10 text-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <img src={logoImages[0]} alt="LHL Festas" loading="lazy" width={48} height={48} className="h-12 w-12 rounded-full" />
          <div><p className="font-serif text-xl text-[#f2d091]">LHL Festas</p><p className="text-xs">Festa na Mesa · Peg &amp; Monte · Decorações com montagem</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <a href="https://www.instagram.com/lhl_festas" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Instagram className="h-4 w-4" /> @lhl_festas</a>
          <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
          <Link to="/catalogo" className="hover:text-white">Catálogo</Link>
          <Link to="/orcamento" className="hover:text-white">Orçamento</Link>
        </div>
      </div>
      <div className="mx-auto mt-7 max-w-7xl border-t border-white/10 px-4 pt-5 text-xs text-white/40 sm:px-6 lg:px-8">© 2026 LHL Festas. Todos os direitos reservados.</div>
    </footer>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-[#fff8f0]">
      <Header />
      <main>
        <Hero />
        <Modalidades />
        <ComoFunciona />
        <Inspiracoes />
        <Confianca />
        <Clientes />
        <FinalCTA />
      </main>
      <Footer />
      <Suspense fallback={null}><ConsultorFAB /></Suspense>
    </div>
  );
}
