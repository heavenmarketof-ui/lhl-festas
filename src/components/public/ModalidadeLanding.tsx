import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  Instagram,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const vinho = "#651421";
const vinhoEscuro = "#470b15";
const rosa = "#d87982";
const rosaClaro = "#f6dbd7";
const marfim = "#fff8f0";
const dourado = "#c89b58";

export type ModalidadeLandingProps = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  catalogHref: string;
  budgetHref: string;
  bullets: string[];
  steps: Array<{ title: string; text: string }>;
  gallery: string[];
  closingTitle: string;
  closingText: string;
};

export default function ModalidadeLanding(props: ModalidadeLandingProps) {
  return (
    <div className="min-h-screen" style={{ background: marfim, color: vinho }}>
      <header
        className="sticky top-0 z-40 border-b border-white/10 text-white shadow-lg"
        style={{ background: `linear-gradient(90deg, ${vinhoEscuro}, ${vinho})` }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/" className="font-serif text-xl text-[#f4d49b]">LHL Festas</Link>
          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <Link to="/">Início</Link>
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/orcamento">Orçamento</Link>
          </nav>
          <Link
            to="/orcamento"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-[#4a0d18] shadow"
            style={{ background: rosa }}
          >
            Fale com a gente <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="overflow-hidden text-white" style={{ background: vinho }}>
          <div className="mx-auto grid w-full max-w-[1600px] lg:min-h-[650px] lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative flex items-center px-6 py-14 md:px-12 lg:py-20">
              <div
                className="absolute inset-0 opacity-25"
                style={{ background: `radial-gradient(circle at 20% 30%, ${rosa}, transparent 48%)` }}
              />
              <div className="relative max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[.22em] text-[#f4d49b]">{props.eyebrow}</div>
                <h1 className="mt-4 font-serif text-5xl leading-[.95] sm:text-6xl lg:text-7xl">
                  {props.title} <span className="italic text-[#efb6b5]">{props.highlight}</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{props.description}</p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={props.catalogHref}
                    className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Ver temas <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                  <a
                    href={props.budgetHref}
                    className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-[#4a0d18] shadow-lg"
                    style={{ background: rosa }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Solicitar orçamento
                  </a>
                </div>
              </div>
            </div>

            <div className="relative min-h-[480px] lg:min-h-full">
              <img src={props.heroImage} alt={props.heroAlt} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#651421] via-[#651421]/15 to-transparent" />
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16" style={{ background: rosaClaro }}>
          <div className="mx-auto w-full max-w-[1500px] px-5 md:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {props.bullets.map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 p-5 shadow-sm">
                  <Check className="h-5 w-5" style={{ color: rosa }} />
                  <p className="mt-3 text-sm font-medium leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto w-full max-w-[1500px] px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[.65fr_2.35fr]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.22em]" style={{ color: dourado }}>Como funciona</div>
                <h2 className="mt-3 font-serif text-5xl italic leading-none">Simples do começo ao fim.</h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#765d58]">
                  A equipe da LHL acompanha você desde a escolha do tema até a confirmação do pedido.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {props.steps.map((step, index) => (
                  <article key={step.title} className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "#ead4cb" }}>
                    <div className="font-serif text-3xl" style={{ color: rosa }}>{String(index + 1).padStart(2, "0")}</div>
                    <h3 className="mt-4 font-serif text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#765d58]">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 text-white" style={{ background: `linear-gradient(120deg, ${vinhoEscuro}, ${vinho})` }}>
          <div className="mx-auto w-full max-w-[1500px] px-5 md:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#efb6b5]"><Sparkles className="h-4 w-4" /> Inspirações LHL</div>
                <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Festas que encantam de verdade.</h2>
              </div>
              <Link to="/catalogo" className="inline-flex items-center text-sm font-semibold text-white/80 hover:text-white">
                Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {props.gallery.map((src, index) => (
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt="Decoração da LHL Festas"
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-2xl object-cover shadow-xl"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20" style={{ background: "#fff4ec" }}>
          <div className="mx-auto grid w-full max-w-[1500px] items-center gap-8 px-5 md:px-8 lg:grid-cols-[1.7fr_.7fr]">
            <div>
              <div className="flex items-center gap-2" style={{ color: rosa }}><Heart className="h-5 w-5 fill-current" /> LHL Festas</div>
              <h2 className="mt-3 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{props.closingTitle}</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#765d58]">{props.closingText}</p>
            </div>
            <div className="lg:text-right">
              <a
                href={props.budgetHref}
                className="inline-flex items-center rounded-full px-7 py-4 text-sm font-semibold text-white shadow-lg"
                style={{ background: vinho }}
              >
                Quero meu orçamento <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-white" style={{ background: "#390b12" }}>
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <div className="font-serif text-xl text-[#f0cf91]">LHL Festas</div>
            <div className="mt-1 text-xs text-white/50">Transformamos momentos em memórias especiais.</div>
          </div>
          <div className="flex items-center gap-5 text-sm text-white/70">
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/orcamento">Orçamento</Link>
            <a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2"><Instagram className="h-4 w-4" /> @lhl_festas</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
