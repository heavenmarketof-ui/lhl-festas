import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Instagram,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { logoImages } from "@/assets/lhl";

const rosa = "#d76578";
const rosaEscuro = "#b95063";
const marfim = "#fffaf6";
const rosaClaro = "#fae9e5";
const vinho = "#651421";
const texto = "#2b2022";
const textoSuave = "#665357";

export type ModalidadeOption = {
  title: string;
  description: string;
  items: string[];
  badge?: string;
};

export type ModalidadeLandingProps = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  catalogHref: string;
  budgetHref: string;
  facts: Array<{ title: string; text: string }>;
  introTitle: string;
  introText: string;
  idealFor: string[];
  optionsTitle: string;
  optionsIntro: string;
  options: ModalidadeOption[];
  includesTitle: string;
  includes: string[];
  includesNote?: string;
  steps: Array<{ title: string; text: string }>;
  gallery: string[];
  galleryTitle?: string;
  faqs: Array<{ question: string; answer: string }>;
  closingTitle: string;
  closingText: string;
};

function PillButton({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <a
      href={href}
      className={light
        ? "inline-flex items-center justify-center gap-2 rounded-full border border-[#d76578]/35 bg-white px-6 py-3 text-sm font-semibold text-[#b95063] transition hover:border-[#d76578] hover:bg-[#fff4f3]"
        : "inline-flex items-center justify-center gap-2 rounded-full bg-[#d76578] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(215,101,120,.2)] transition hover:bg-[#c9586c]"}
    >
      {children}
    </a>
  );
}

export default function ModalidadeLanding(props: ModalidadeLandingProps) {
  const gallery = props.gallery.filter(Boolean).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#fffaf6]" style={{ color: texto }}>
      <header className="sticky top-0 z-40 border-b border-[#eadbd5]/80 bg-[#fffaf6]/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] w-full max-w-[1500px] items-center justify-between px-5 md:px-8 lg:h-[82px]">
          <Link to="/" aria-label="LHL Festas">
            <img src={logoImages[0]} alt="LHL Festas" className="h-[50px] w-auto object-contain lg:h-[58px]" />
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#4f4144] lg:flex">
            <Link to="/">Início</Link>
            <a href="#opcoes">Opções</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#inspiracoes">Inspirações</a>
            <Link to="/catalogo">Catálogo</Link>
          </nav>
          <a
            href={props.budgetHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#d76578] px-4 py-2.5 text-xs font-semibold text-white sm:px-5 sm:text-sm"
          >
            Fale conosco <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[#f8ebe6]">
          <div className="mx-auto grid max-w-[1500px] items-stretch lg:min-h-[650px] lg:grid-cols-[.9fr_1.1fr]">
            <div className="flex items-center px-6 py-14 md:px-10 lg:px-[clamp(46px,5vw,78px)] lg:py-20">
              <div className="max-w-[650px]">
                <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-[#c95e70]">{props.eyebrow}</p>
                <h1 className="mt-4 font-serif text-[clamp(3.4rem,5.4vw,6.2rem)] leading-[.86] tracking-[-.045em] text-[#1f191a]">
                  {props.title} <span className="text-[#cf6675]">{props.highlight}</span>
                </h1>
                <p className="mt-6 max-w-[570px] text-[15px] leading-[1.75] text-[#594b4e] sm:text-base">{props.description}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <PillButton href={props.budgetHref}><MessageCircle className="h-4 w-4" /> Solicitar orçamento</PillButton>
                  <PillButton href={props.catalogHref} light>Ver inspirações <ArrowRight className="h-4 w-4" /></PillButton>
                </div>
                <p className="mt-5 max-w-[520px] text-xs leading-relaxed text-[#8a7478]">Valores, disponibilidade e composição final são confirmados no atendimento. O site não define preço automaticamente.</p>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden lg:min-h-full">
              <img src={props.heroImage} alt={props.heroAlt} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[#6a4850] shadow backdrop-blur">Foto real LHL Festas</div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#eadbd5] bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-px bg-[#eadbd5] sm:grid-cols-3">
            {props.facts.map((fact) => (
              <div key={fact.title} className="bg-white px-7 py-7 text-center">
                <div className="font-serif text-2xl text-[#302326]">{fact.title}</div>
                <p className="mx-auto mt-2 max-w-[30ch] text-xs leading-relaxed text-[#746266]">{fact.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-[clamp(58px,7vw,100px)]">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="grid grid-cols-2 gap-3">
              {(gallery.length ? gallery.slice(0, 3) : [props.heroImage]).map((src, index) => (
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={`${props.eyebrow} LHL Festas`}
                  loading="lazy"
                  className={index === 0
                    ? "col-span-2 aspect-[16/9] w-full rounded-[28px] object-cover"
                    : "aspect-[4/5] w-full rounded-[24px] object-cover"}
                />
              ))}
            </div>
            <div className="lg:pl-8">
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Entenda a modalidade</p>
              <h2 className="mt-3 max-w-[12ch] font-serif text-[clamp(2.8rem,4vw,4.7rem)] leading-[.92] text-[#241b1c]">{props.introTitle}</h2>
              <p className="mt-5 max-w-[620px] text-[15px] leading-[1.8] text-[#625155]">{props.introText}</p>
              <div className="mt-7">
                <div className="text-xs font-bold uppercase tracking-[.18em] text-[#9a7078]">É uma boa escolha para quem quer</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {props.idealFor.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#fff3ef] p-4 text-sm leading-relaxed text-[#55464a]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d76578]" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="opcoes" className="bg-[#fae9e5] py-[clamp(58px,7vw,96px)]">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="mx-auto mb-10 max-w-[760px] text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Opções da LHL</p>
              <h2 className="mt-3 font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[.92] text-[#241b1c]">{props.optionsTitle}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#68575a] sm:text-base">{props.optionsIntro}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {props.options.map((option) => (
                <article key={option.title} className="flex h-full flex-col rounded-[28px] border border-[#ead4cb] bg-white p-6 shadow-[0_10px_30px_rgba(82,42,49,.06)] sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {option.badge ? <span className="rounded-full bg-[#f8d9d7] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#a44c5b]">{option.badge}</span> : null}
                      <h3 className="mt-3 font-serif text-3xl leading-none text-[#302326]">{option.title}</h3>
                    </div>
                    <Heart className="h-5 w-5 shrink-0 text-[#d76578]" />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[#6b595d]">{option.description}</p>
                  {option.items.length ? (
                    <div className="mt-5 border-t border-[#f0e0da] pt-5">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#a07880]">Composição</div>
                      <div className="space-y-2.5">
                        {option.items.map((item) => (
                          <div key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#56484b]">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d76578]" /> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-[clamp(56px,6vw,88px)]">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 md:px-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">O que pode fazer parte</p>
              <h2 className="mt-3 font-serif text-[clamp(2.7rem,3.8vw,4.4rem)] leading-[.92] text-[#241b1c]">{props.includesTitle}</h2>
              {props.includesNote ? <p className="mt-4 max-w-[430px] text-sm leading-relaxed text-[#705e62]">{props.includesNote}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {props.includes.map((item) => (
                <div key={item} className="flex min-h-[78px] items-center gap-3 rounded-2xl border border-[#eadbd5] bg-white px-5 py-4 text-sm font-medium leading-relaxed text-[#4e4144]">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#c89b58]" /> {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#fff3ef] py-[clamp(58px,7vw,96px)]">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[.55fr_1.45fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Como funciona</p>
                <h2 className="mt-3 max-w-[9ch] font-serif text-[clamp(2.8rem,4vw,4.7rem)] italic leading-[.92] text-[#241b1c]">Do primeiro contato à festa.</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {props.steps.map((step, index) => (
                  <article key={step.title} className="rounded-[24px] border border-[#eadbd5] bg-white p-5">
                    <div className="font-serif text-4xl text-[#d76578]">{String(index + 1).padStart(2, "0")}</div>
                    <h3 className="mt-5 font-serif text-2xl leading-none text-[#302326]">{step.title}</h3>
                    <p className="mt-3 text-xs leading-relaxed text-[#6f5d61]">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="inspiracoes" className="bg-[#54101b] py-[clamp(58px,7vw,96px)] text-white">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.25em] text-[#efb6b5]"><Sparkles className="h-4 w-4" /> Trabalhos LHL</p>
                <h2 className="mt-3 max-w-[13ch] font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[.9]">{props.galleryTitle || "Inspirações reais para sua festa."}</h2>
              </div>
              <a href={props.catalogHref} className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">Ver mais inspirações <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((src, index) => (
                <img
                  key={`${src}-gallery-${index}`}
                  src={src}
                  alt={`${props.eyebrow} — trabalho real LHL Festas`}
                  loading="lazy"
                  className={`w-full rounded-[18px] object-cover ${index === 0 || index === 5 ? "aspect-[4/5] md:row-span-2 md:h-full" : "aspect-[4/3]"}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="py-[clamp(58px,7vw,94px)]">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:px-8 lg:grid-cols-[.62fr_1.38fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Dúvidas frequentes</p>
              <h2 className="mt-3 font-serif text-[clamp(2.8rem,4vw,4.6rem)] leading-[.9] text-[#241b1c]">Antes de escolher, vale saber.</h2>
            </div>
            <div className="divide-y divide-[#eadbd5] border-y border-[#eadbd5]">
              {props.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl text-[#302326] sm:text-2xl">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[#d76578] transition group-open:rotate-180" />
                  </summary>
                  <p className="max-w-[760px] pt-3 text-sm leading-[1.8] text-[#6c5a5e]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f1dfd8] py-12">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-7 px-5 md:px-8 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#c95e70]"><Heart className="h-5 w-5 fill-current" /> LHL Festas</div>
              <h2 className="mt-3 max-w-[850px] font-serif text-[clamp(2.5rem,3.8vw,4.5rem)] leading-[.9] text-[#302326]">{props.closingTitle}</h2>
              <p className="mt-4 max-w-[720px] text-sm leading-relaxed text-[#68565a] sm:text-base">{props.closingText}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <PillButton href={props.budgetHref}>Quero meu orçamento <ArrowRight className="h-4 w-4" /></PillButton>
              <PillButton href={props.catalogHref} light>Ver catálogo</PillButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#2f0b11] px-5 py-9 text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-5 md:flex-row">
          <Link to="/"><img src={logoImages[0]} alt="LHL Festas" className="h-14 w-auto rounded bg-[#fffaf6] px-2 py-1 object-contain" /></Link>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/70 sm:text-sm">
            <Link to="/">Início</Link>
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/orcamento">Orçamento</Link>
            <a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2"><Instagram className="h-4 w-4" /> @lhl_festas</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
