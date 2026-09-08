import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ArrowRight, CalendarDays, Heart, Instagram, Menu, MessageCircle, Sparkles, Truck, X } from "lucide-react";
import { logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero solicitar um orçamento com a LHL Festas.")}`;
const driveImage = (id: string, size = 1800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;

const PHOTO = {
  hero: driveImage("1AtLMBa4oqSDJBX22NZofnl4yt3jI3bYl", 2200),
  mesa: driveImage("1oe1H1YUXprHITr2hQbuqmDnvu_4Rf2SQ", 1600),
  pegueMonte: driveImage("13MMyb2SQfmKrkdjdccjtjZ3f49CovFTD", 1600),
  montagem: driveImage("1RhHiAwt-AMy_SYeYb3DeR5oAP9AInWQ6", 1600),
  personalizado: driveImage("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi", 1600),
  gallery: [
    "1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu",
    "1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V",
    "1kIqfmp5q5A-fcKaUMpDAWpFSb2-fpQeq",
    "1wPCvNPqsR0aPtZbtml90smyvfk6S8tcU",
    "13qRfGHhpdacn1nvJDifyo-UZYCzkN0BD",
    "1caYSy4-tGC1jvCnPb5qLc5MPhlYRnQeg",
    "1tVE_Xt1-nEr0H1vfCCyb93fIW1MdEAq7",
    "1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov",
  ].map((id) => driveImage(id, 1400)),
} as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Festa na Mesa, Peg & Monte, Festas com Montagem e Personalizadas" },
      { name: "description", content: "Decorações para festas no ABC: Festa na Mesa, Peg & Monte, Festas com Montagem e projetos personalizados. Escolha sua experiência e solicite um orçamento." },
      { property: "og:title", content: "LHL Festas — Criamos cenários para grandes histórias" },
      { property: "og:description", content: "Quatro formas de celebrar do seu jeito: Festa na Mesa, Peg & Monte, Festas com Montagem e Festas Personalizadas." },
      { property: "og:image", content: PHOTO.hero },
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

function SafeImage({ src, fallback = PHOTO.hero, alt, className, eager = false }: { src: string; fallback?: string; alt: string; className: string; eager?: boolean }) {
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className={className} onError={(e) => { const node = e.currentTarget; if (node.src !== fallback) node.src = fallback; }} />;
}

const NAV = [
  { label: "Início", href: "#inicio" },
  { label: "Nossas festas", href: "#modalidades" },
  { label: "Inspire-se", href: "#inspiracao" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Contato", href: "#contato" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-[#eadbd4] bg-[#fffaf6]/95 text-[#4a2026] backdrop-blur-xl">
    <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-[clamp(1rem,3vw,3rem)] sm:h-[74px] lg:h-[78px]">
      <Link to="/" aria-label="LHL Festas — início"><img src={logoImages[0]} alt="LHL Festas" className="h-[clamp(2.8rem,4vw,3.6rem)] w-auto object-contain" /></Link>
      <nav className="hidden items-center gap-[clamp(1.2rem,2vw,2rem)] text-[clamp(.76rem,.85vw,.88rem)] font-medium lg:flex">{NAV.map(i => <a key={i.label} href={i.href} className="transition hover:text-[#cf6675]">{i.label}</a>)}</nav>
      <Link to="/orcamento" onClick={() => track("home_budget_click", { location: "header" })} className="hidden h-11 items-center gap-2 rounded-full bg-[#cf6675] px-6 text-sm font-semibold text-white transition hover:bg-[#bd5868] lg:inline-flex"><MessageCircle className="h-4 w-4" /> Fazer orçamento <ArrowRight className="h-4 w-4" /></Link>
      <button onClick={() => setOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-full border border-[#eadbd4] bg-white lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
    </div>
    {open && <div className="border-t border-[#eadbd4] bg-[#fffaf6] px-4 pb-5 pt-3 lg:hidden"><nav className="space-y-1">{NAV.map(i => <a key={i.label} href={i.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm">{i.label}</a>)}<Link to="/orcamento" onClick={() => setOpen(false)} className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-[#cf6675] text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Fazer orçamento</Link></nav></div>}
  </header>;
}

function Hero() {
  return <section id="inicio" className="overflow-hidden bg-[#fff8f3]">
    <div className="mx-auto grid max-w-[1440px] lg:min-h-[min(760px,calc(100vh-78px))] lg:grid-cols-[.88fr_1.12fr]">
      <div className="relative order-2 flex flex-col justify-center px-[clamp(1.2rem,4vw,4rem)] py-[clamp(2.8rem,6vw,5.5rem)] lg:order-1">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_20%,rgba(222,141,151,.18),transparent_43%)]" />
        <div className="relative z-10 mx-auto w-full max-w-[640px] lg:mx-0">
          <p className="mb-[clamp(.8rem,1.3vw,1.3rem)] text-[clamp(.66rem,.8vw,.78rem)] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Mais que decorações</p>
          <h1 className="max-w-[12ch] font-serif text-[clamp(2.75rem,5.8vw,5.8rem)] leading-[.92] tracking-[-.038em] text-[#3d171d]">Criamos cenários para <span className="text-[#c86170]">grandes histórias.</span></h1>
          <p className="mt-[clamp(1rem,2vw,1.6rem)] max-w-[54ch] text-[clamp(.98rem,1.25vw,1.16rem)] leading-relaxed text-[#745b5f]">Festa na Mesa, Peg &amp; Monte, Festas com Montagem e projetos Personalizados para todos os momentos da sua vida.</p>
          <div className="mt-[clamp(1.3rem,2.4vw,2rem)] flex flex-col gap-3 sm:flex-row"><Link to="/orcamento" onClick={() => track("home_budget_click", { location: "hero" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#cf6675] px-[clamp(1.3rem,2vw,1.8rem)] text-[clamp(.82rem,1vw,.92rem)] font-semibold text-white transition hover:bg-[#bd5868]"><MessageCircle className="h-4 w-4" /> Quero meu orçamento <ArrowRight className="h-4 w-4" /></Link><Link to="/catalogo" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#dfc6c0] bg-white/75 px-[clamp(1.3rem,2vw,1.8rem)] text-[clamp(.82rem,1vw,.92rem)] font-semibold text-[#642b35]">Ver nossas festas <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
        <div className="relative z-10 mx-auto mt-[clamp(2rem,4vw,3.4rem)] grid w-full max-w-[640px] grid-cols-2 gap-x-5 gap-y-5 border-t border-[#eadbd4] pt-[clamp(1.2rem,2vw,1.8rem)] sm:grid-cols-4 lg:mx-0 lg:grid-cols-2 xl:grid-cols-4">
          {[[Sparkles,"Decorações incríveis"],[CalendarDays,"Todos os temas"],[Truck,"Retire, monte ou deixe com a gente"],[Heart,"Mais de 300 festas realizadas"]].map(([I,t]) => { const Icon=I as typeof Sparkles; return <div key={t as string} className="flex gap-2.5 text-[#714d54]"><Icon className="h-5 w-5 shrink-0 text-[#c86170]"/><span className="text-[clamp(.7rem,.85vw,.8rem)] leading-snug">{t as string}</span></div>; })}
        </div>
      </div>
      <div className="relative order-1 min-h-[58svh] overflow-hidden sm:min-h-[66svh] lg:order-2 lg:min-h-full">
        <SafeImage src={PHOTO.hero} alt="Festa Moranguinho de 1 ano produzida pela LHL Festas" eager className="absolute inset-0 h-full w-full scale-[1.03] object-cover object-[52%_52%] sm:scale-100 sm:object-[50%_50%] lg:object-[57%_50%] xl:object-[54%_50%]"/>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fff8f3]/20 lg:bg-gradient-to-r lg:from-[#fff8f3]/22 lg:via-transparent lg:to-transparent"/>
        <div className="absolute right-[clamp(1rem,3vw,2rem)] top-[clamp(1rem,3vw,2rem)] rounded-full border border-white/70 bg-[#fffaf6]/90 px-[clamp(.85rem,1.5vw,1.2rem)] py-[clamp(.75rem,1.3vw,1rem)] text-center shadow-xl backdrop-blur"><Heart className="mx-auto mb-1 h-4 w-4 fill-[#c86170] text-[#c86170]"/><p className="font-serif text-[clamp(.95rem,1.3vw,1.2rem)] leading-[1.05] text-[#4f252c]">Sonhe<br/>Comemore<br/>Viva</p></div>
      </div>
    </div>
  </section>;
}

type Service = { title:string; description:string; image:string; href:string; position:string };
function ServiceCard({ title, description, image, href, position }: Service) {
  return <article className="group flex h-full flex-col overflow-hidden rounded-[30px_30px_18px_18px] bg-[#f7ebe7]"><div className="relative aspect-[4/4.35] overflow-hidden sm:aspect-[4/4.15] xl:aspect-[4/4.55]"><SafeImage src={image} alt={title} className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.025] ${position}`} /></div><div className="flex flex-1 flex-col p-[clamp(1rem,1.6vw,1.35rem)]"><h2 className="font-serif text-[clamp(1.8rem,2.5vw,2.4rem)] leading-none text-[#3f1c22]">{title}</h2><p className="mt-3 min-h-[4.8em] text-[clamp(.82rem,1vw,.93rem)] leading-relaxed text-[#715b5f]">{description}</p><a href={href} className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#cf6675] px-5 py-2.5 text-xs font-semibold text-white">Ver opções <ArrowRight className="h-3.5 w-3.5"/></a></div></article>;
}

function Modalidades() {
  const services: Service[] = [
    { title:"Festa na Mesa", description:"Pequenos detalhes, grandes lembranças. Uma solução compacta, prática e encantadora.", image:PHOTO.mesa, href:"/festa-na-mesa", position:"object-[50%_48%]" },
    { title:"Peg & Monte", description:"Você escolhe, retira, monta e comemora com liberdade, praticidade e autonomia.", image:PHOTO.pegueMonte, href:"/peg-e-monte", position:"object-[50%_50%]" },
    { title:"Festas com Montagem", description:"A LHL leva, monta e desmonta o cenário para você aproveitar cada momento sem preocupação.", image:PHOTO.montagem, href:"/decoracao-com-montagem", position:"object-[50%_48%]" },
    { title:"Festas Personalizadas", description:"Um projeto criado sob medida, com identidade, composição e detalhes pensados especialmente para sua celebração.", image:PHOTO.personalizado, href:"/tema-personalizado", position:"object-[50%_50%]" },
  ];
  return <section id="modalidades" className="bg-[#fffaf6] py-[clamp(3.5rem,7vw,6.5rem)]"><div className="mx-auto max-w-[1360px] px-[clamp(1rem,3.2vw,3rem)]"><div className="mb-[clamp(2rem,4vw,3.4rem)] grid items-end gap-6 lg:grid-cols-[.72fr_1.28fr]"><p className="font-serif text-[clamp(2.7rem,5vw,5rem)] italic leading-[.92] text-[#d06a79]">Qual é<br/>a sua festa?</p><p className="max-w-[62ch] text-[clamp(.98rem,1.25vw,1.18rem)] leading-relaxed text-[#60494e]">Quatro maneiras de celebrar, cada uma pensada para uma necessidade diferente. Escolha a experiência que combina com você.</p></div><div className="grid auto-rows-fr gap-[clamp(1rem,2vw,1.5rem)] sm:grid-cols-2 xl:grid-cols-4">{services.map(s => <ServiceCard key={s.title} {...s}/>)}</div></div></section>;
}

function Inspiration() {
  return <section id="inspiracao" className="bg-[#f7e7e3] py-[clamp(3.8rem,7vw,6.8rem)]"><div className="mx-auto grid max-w-[1360px] gap-[clamp(2rem,5vw,4rem)] px-[clamp(1rem,3.2vw,3rem)] lg:grid-cols-[.72fr_1.28fr] lg:items-center"><div><p className="text-[clamp(.68rem,.8vw,.78rem)] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Inspiração que vira realidade</p><h2 className="mt-4 max-w-[9ch] font-serif text-[clamp(3rem,5.6vw,5.7rem)] leading-[.92] text-[#3f1c22]">Festas que emocionam.</h2><p className="mt-5 max-w-[38ch] text-[clamp(.9rem,1vw,1rem)] leading-relaxed text-[#6e555a]">Mais de 300 festas realizadas e muitas histórias para contar. Veja alguns dos nossos trabalhos e encontre a inspiração para a sua.</p><Link to="/catalogo" className="mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-[#cf6675] px-6 text-sm font-semibold text-white">Ver mais festas <ArrowRight className="h-4 w-4"/></Link></div><div className="grid grid-cols-2 auto-rows-[clamp(150px,23vw,300px)] gap-[clamp(.5rem,1vw,.8rem)] sm:grid-cols-3">{PHOTO.gallery.map((image,index)=><div key={image} className={`overflow-hidden rounded-[clamp(.65rem,1.2vw,1rem)] bg-white ${index===0||index===5?"sm:row-span-2":""} ${index===3?"sm:col-span-2":""}`}><SafeImage src={image} alt={`Festa LHL — inspiração ${index+1}`} className={`h-full w-full object-cover transition duration-500 hover:scale-[1.02] ${index===0?"object-[50%_44%]":index===5?"object-[50%_48%]":"object-center"}`} /></div>)}</div></div></section>;
}

function ComoFunciona() {
  const steps=[[Sparkles,"1. Escolha","Encontre o tema e a modalidade ideal."],[MessageCircle,"2. Orçamento","Solicite pelo site ou WhatsApp."],[CalendarDays,"3. Alinhamento","Confirmamos todos os detalhes com você."],[Heart,"4. Festa!","É só comemorar. A LHL está com você!"]] as const;
  return <section id="como-funciona" className="bg-[#fffaf6] py-[clamp(3.6rem,6vw,5.5rem)]"><div className="mx-auto grid max-w-[1360px] gap-[clamp(2.2rem,5vw,4rem)] px-[clamp(1rem,3.2vw,3rem)] lg:grid-cols-[.62fr_1.38fr] lg:items-center"><div><p className="text-[clamp(.68rem,.8vw,.78rem)] font-semibold uppercase tracking-[.24em] text-[#b95b6a]">Como funciona</p><h2 className="mt-3 font-serif text-[clamp(2.8rem,5vw,5rem)] leading-[.94] text-[#3f1c22]">Do seu jeito,<br/>sem complicação.</h2></div><div className="grid gap-[clamp(1.6rem,3vw,2.5rem)] sm:grid-cols-2 xl:grid-cols-4">{steps.map(([I,t,x])=>{const Icon=I;return <div key={t} className="min-h-[150px]"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#f4dedb] text-[#b85363]"><Icon className="h-5 w-5"/></div><h3 className="mt-4 text-[clamp(.9rem,1vw,1rem)] font-semibold text-[#422329]">{t}</h3><p className="mt-1.5 text-[clamp(.76rem,.9vw,.86rem)] leading-relaxed text-[#745f63]">{x}</p></div>})}</div></div></section>;
}

function StoryCta(){return <section className="bg-[#ead7d0] py-[clamp(2.5rem,4vw,4rem)]"><div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-7 px-[clamp(1rem,3.2vw,3rem)] lg:flex-row lg:items-center"><div><h2 className="max-w-[24ch] font-serif text-[clamp(2rem,3.7vw,3.9rem)] leading-[.96] text-[#402027]">Cada festa tem um significado. Deixe a LHL fazer parte do seu.</h2><p className="mt-3 max-w-[56ch] text-[clamp(.85rem,1vw,.98rem)] text-[#735c60]">Conte sua ideia para a gente e comece a planejar um momento inesquecível.</p></div><Link to="/orcamento" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#cf6675] px-7 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/> Fazer meu orçamento <ArrowRight className="h-4 w-4"/></Link></div></section>}

function Footer(){return <footer id="contato" className="border-t border-[#eadbd4] bg-[#fffaf6] py-10"><div className="mx-auto grid max-w-[1360px] items-center gap-8 px-[clamp(1rem,3.2vw,3rem)] lg:grid-cols-[.75fr_1.4fr_.65fr]"><div className="flex items-center gap-4"><img src={logoImages[0]} alt="LHL Festas" className="h-14 w-auto"/><p className="text-xs text-[#796368]">Decorações que celebram a vida.</p></div><nav className="flex flex-wrap gap-5 text-xs text-[#5f484d] lg:justify-center"><a href="#inicio">Início</a><a href="#modalidades">Nossas festas</a><a href="#como-funciona">Como funciona</a><Link to="/catalogo">Catálogo</Link><Link to="/privacidade">Privacidade</Link><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Contato</a></nav><div className="flex items-center gap-3 lg:justify-end"><a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-[#dec9c3]"><Instagram className="h-4 w-4"/></a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full border border-[#dec9c3]"><MessageCircle className="h-4 w-4"/></a></div></div></footer>}

function HomePage(){return <main className="min-h-screen overflow-x-hidden bg-[#fffaf6] text-[#3f1c22]"><Header/><Hero/><Modalidades/><Inspiration/><ComoFunciona/><StoryCta/><Footer/><Suspense fallback={null}><ConsultorFAB/></Suspense></main>}
