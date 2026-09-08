import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ArrowRight, CalendarDays, Heart, Instagram, Menu, MessageCircle, Sparkles, Truck, X } from "lucide-react";
import { extrasImages, festaNaMesaImages, inspireSeImages, logoImages, pegEMonteImages, personalizadoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero solicitar um orçamento com a LHL Festas.")}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Festa na Mesa, Peg & Monte, Festas com Montagem e Personalizadas" },
      { name: "description", content: "Decorações para festas no ABC: Festa na Mesa, Peg & Monte, Festas com Montagem e projetos personalizados. Escolha sua experiência e solicite um orçamento." },
      { property: "og:title", content: "LHL Festas — Criamos cenários para grandes histórias" },
      { property: "og:description", content: "Quatro formas de celebrar do seu jeito: Festa na Mesa, Peg & Monte, Festas com Montagem e Festas Personalizadas." },
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
  } catch { /* analytics não bloqueia navegação */ }
}

const NAV = [
  { label: "Início", href: "#inicio" }, { label: "Nossas festas", href: "#modalidades" },
  { label: "Inspire-se", href: "#inspiracao" }, { label: "Como funciona", href: "#como-funciona" }, { label: "Contato", href: "#contato" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-[#eadbd4] bg-[#fffaf6]/95 text-[#4a2026] backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link to="/" aria-label="LHL Festas — início"><img src={logoImages[0]} alt="LHL Festas" className="h-14 w-auto object-contain" /></Link>
      <nav className="hidden items-center gap-7 text-[13px] font-medium lg:flex">{NAV.map(i => <a key={i.label} href={i.href} className="transition hover:text-[#cf6675]">{i.label}</a>)}</nav>
      <Link to="/orcamento" onClick={() => track("home_budget_click", { location: "header" })} className="hidden h-11 items-center gap-2 rounded-full bg-[#cf6675] px-6 text-sm font-semibold text-white transition hover:bg-[#bd5868] lg:inline-flex"><MessageCircle className="h-4 w-4" /> Fazer orçamento <ArrowRight className="h-4 w-4" /></Link>
      <button onClick={() => setOpen(v => !v)} className="grid h-11 w-11 place-items-center rounded-full border border-[#eadbd4] bg-white lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
    </div>
    {open && <div className="border-t border-[#eadbd4] bg-[#fffaf6] px-4 pb-5 pt-3 lg:hidden"><nav className="space-y-1">{NAV.map(i => <a key={i.label} href={i.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm">{i.label}</a>)}<Link to="/orcamento" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-[#cf6675] text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Fazer orçamento</Link></nav></div>}
  </header>;
}

function Hero() {
  return <section id="inicio" className="overflow-hidden bg-[#fff8f3]">
    <div className="mx-auto grid max-w-[1440px] lg:min-h-[650px] lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative flex flex-col justify-center px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_20%,rgba(222,141,151,.18),transparent_43%)]" />
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Mais que decorações</p>
          <h1 className="font-serif text-[clamp(3.15rem,6vw,5.6rem)] leading-[.91] tracking-[-.035em] text-[#3d171d]">Criamos cenários para <span className="text-[#c86170]">grandes histórias.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#745b5f] sm:text-lg">Festa na Mesa, Peg &amp; Monte, Festas com Montagem e projetos Personalizados para todos os momentos da sua vida.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/orcamento" onClick={() => track("home_budget_click", { location: "hero" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#cf6675] px-7 text-sm font-semibold text-white transition hover:bg-[#bd5868]"><MessageCircle className="h-4 w-4" /> Quero meu orçamento <ArrowRight className="h-4 w-4" /></Link><Link to="/catalogo" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#dfc6c0] bg-white/70 px-7 text-sm font-semibold text-[#642b35]">Ver nossas festas <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-5 border-t border-[#eadbd4] pt-7 sm:grid-cols-4">
          {[[Sparkles,"Decorações incríveis"],[CalendarDays,"Todos os temas"],[Truck,"Retire, monte ou deixe com a gente"],[Heart,"Mais de 300 festas realizadas"]].map(([I,t]) => { const Icon=I as typeof Sparkles; return <div key={t as string} className="flex gap-2.5 text-[#714d54]"><Icon className="h-5 w-5 shrink-0 text-[#c86170]"/><span className="text-xs">{t as string}</span></div>; })}
        </div>
      </div>
      <div className="relative min-h-[440px] sm:min-h-[560px] lg:min-h-full"><img src="/hero-principal.jpg" alt="Festa Moranguinho de 1 ano produzida pela LHL Festas" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-center"/><div className="absolute inset-0 bg-gradient-to-r from-[#fff8f3]/35 via-transparent to-transparent"/><div className="absolute right-6 top-7 rounded-full border border-white/70 bg-[#fffaf6]/90 px-5 py-4 text-center shadow-xl backdrop-blur"><Heart className="mx-auto mb-1 h-4 w-4 fill-[#c86170] text-[#c86170]"/><p className="font-serif text-lg leading-[1.05] text-[#4f252c]">Sonhe<br/>Comemore<br/>Viva</p></div></div>
    </div>
  </section>;
}

type Service = { title:string; description:string; image:string; href:string };
function ServiceCard({ title, description, image, href }: Service) { return <article className="group relative overflow-hidden rounded-[38px_38px_18px_18px] bg-[#f7ebe7]"><div className="aspect-[4/4.6] overflow-hidden"><img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"/></div><div className="relative -mt-20 mx-3 rounded-[22px] border border-white/70 bg-[#fffaf7]/95 p-5 shadow-[0_18px_35px_-28px_rgba(72,24,31,.55)] backdrop-blur"><h2 className="font-serif text-3xl text-[#3f1c22]">{title}</h2><p className="mt-2 min-h-[64px] text-sm leading-relaxed text-[#715b5f]">{description}</p><a href={href} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#cf6675] px-5 py-2.5 text-xs font-semibold text-white">Ver opções <ArrowRight className="h-3.5 w-3.5"/></a></div></article>; }

function Modalidades() {
  const services: Service[] = [
    { title:"Festa na Mesa", description:"Pequenos detalhes, grandes lembranças. Uma solução compacta e encantadora.", image:festaNaMesaImages[0], href:"/festa-na-mesa" },
    { title:"Peg & Monte", description:"Você escolhe, retira, monta e comemora com praticidade e autonomia.", image:pegEMonteImages[0], href:"/peg-e-monte" },
    { title:"Festas com Montagem", description:"A LHL leva, monta e desmonta o cenário para você aproveitar cada momento.", image:extrasImages[0] || inspireSeImages[0], href:"/decoracao-com-montagem" },
    { title:"Festas Personalizadas", description:"Projeto criado sob medida, com composição, identidade e detalhes pensados para a sua celebração.", image:personalizadoImages[0], href:"/orcamento" },
  ];
  return <section id="modalidades" className="bg-[#fffaf6] py-16 sm:py-20 lg:py-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-10 grid items-end gap-6 lg:grid-cols-[.8fr_1.2fr]"><p className="font-serif text-4xl italic leading-none text-[#d06a79] sm:text-5xl">Qual é<br/>a sua festa?</p><p className="max-w-2xl text-base leading-relaxed text-[#60494e] sm:text-lg">Quatro maneiras de celebrar, cada uma pensada para uma necessidade diferente. Escolha a experiência que combina com você.</p></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{services.map(s => <ServiceCard key={s.title} {...s}/>)}</div></div></section>;
}

function Inspiration() {
  const gallery=[inspireSeImages[2]||festaNaMesaImages[6], inspireSeImages[1]||festaNaMesaImages[9], festaNaMesaImages[9], festaNaMesaImages[0], inspireSeImages[3]||pegEMonteImages[2], extrasImages[1]||festaNaMesaImages[14]];
  return <section id="inspiracao" className="bg-[#f7e7e3] py-16 sm:py-20 lg:py-24"><div className="mx-auto grid max-w-7xl gap-9 px-4 sm:px-6 lg:grid-cols-[.72fr_1.28fr] lg:px-8"><div className="flex flex-col justify-center"><p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Inspiração que vira realidade</p><h2 className="mt-4 font-serif text-5xl leading-[.94] text-[#3f1c22] sm:text-6xl">Festas que emocionam.</h2><p className="mt-5 max-w-sm leading-relaxed text-[#6e555a]">Mais de 300 festas realizadas e muitas histórias para contar. Veja alguns dos nossos trabalhos e encontre a inspiração para a sua.</p><Link to="/catalogo" className="mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-[#cf6675] px-6 text-sm font-semibold text-white">Ver mais festas <ArrowRight className="h-4 w-4"/></Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">{gallery.map((image,index)=><div key={index} className={`overflow-hidden rounded-xl bg-white ${index===0||index===4?"sm:row-span-2":""}`}><img src={image} alt={`Festa LHL — inspiração ${index+1}`} loading="lazy" className={`h-full w-full object-cover transition duration-500 hover:scale-[1.02] ${index===0||index===4?"min-h-[250px] sm:min-h-[330px]":"aspect-[4/3]"}`}/></div>)}</div></div></section>;
}

function ComoFunciona() { const steps=[[Sparkles,"1. Escolha","Encontre o tema e a modalidade ideal."],[MessageCircle,"2. Orçamento","Solicite pelo site ou WhatsApp."],[CalendarDays,"3. Alinhamento","Confirmamos todos os detalhes com você."],[Heart,"4. Festa!","É só comemorar. A LHL está com você!"]] as const; return <section id="como-funciona" className="bg-[#fffaf6] py-16 sm:py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.65fr_1.35fr] lg:items-center lg:px-8"><div><p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Como funciona</p><h2 className="mt-3 font-serif text-5xl leading-[.96] text-[#3f1c22]">Do seu jeito,<br/>sem complicação.</h2></div><div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">{steps.map(([I,t,x])=>{const Icon=I;return <div key={t}><div className="grid h-12 w-12 place-items-center rounded-full bg-[#f4dedb] text-[#b85363]"><Icon className="h-5 w-5"/></div><h3 className="mt-4 font-semibold text-[#422329]">{t}</h3><p className="mt-1.5 text-xs leading-relaxed text-[#745f63]">{x}</p></div>})}</div></div></section>; }

function StoryCta(){return <section className="bg-[#ead7d0] py-12"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8"><div><h2 className="font-serif text-3xl text-[#402027] sm:text-4xl">Cada festa tem um significado.<br/>Deixe a LHL fazer parte do seu.</h2><p className="mt-3 text-sm text-[#735c60]">Conte sua ideia para a gente e comece a planejar um momento inesquecível.</p></div><Link to="/orcamento" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#cf6675] px-7 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/> Fazer meu orçamento <ArrowRight className="h-4 w-4"/></Link></div></section>}

function Footer(){return <footer id="contato" className="border-t border-[#eadbd4] bg-[#fffaf6] py-10"><div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[.75fr_1.4fr_.65fr] lg:px-8"><div className="flex items-center gap-4"><img src={logoImages[0]} alt="LHL Festas" className="h-14 w-auto"/><p className="text-xs text-[#796368]">Decorações que celebram a vida.</p></div><nav className="flex flex-wrap gap-5 text-xs text-[#5f484d] lg:justify-center"><a href="#inicio">Início</a><a href="#modalidades">Nossas festas</a><a href="#como-funciona">Como funciona</a><Link to="/catalogo">Catálogo</Link><Link to="/privacidade">Privacidade</Link><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Contato</a></nav><div className="flex items-center gap-3 lg:justify-end"><a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-[#dec9c3]"><Instagram className="h-4 w-4"/></a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full border border-[#dec9c3]"><MessageCircle className="h-4 w-4"/></a></div></div></footer>}

function HomePage(){return <main className="min-h-screen bg-[#fffaf6] text-[#3f1c22]"><Header/><Hero/><Modalidades/><Inspiration/><ComoFunciona/><StoryCta/><Footer/><Suspense fallback={null}><ConsultorFAB/></Suspense></main>}
