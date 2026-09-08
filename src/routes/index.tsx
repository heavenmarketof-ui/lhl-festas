import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ArrowRight, Heart, Instagram, Menu, MessageCircle, X } from "lucide-react";
import { logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const ConsultorFAB = lazy(() => import("@/components/consultor/ConsultorFAB"));
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero solicitar um orçamento com a LHL Festas.")}`;
const driveImage = (id: string, size = 1800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;

const PHOTO = {
  hero: driveImage("1AtLMBa4oqSDJBX22NZofnl4yt3jI3bYl", 2400),
  mesa: driveImage("1oe1H1YUXprHITr2hQbuqmDnvu_4Rf2SQ", 1600),
  pegueMonte: driveImage("13MMyb2SQfmKrkdjdccjtjZ3f49CovFTD", 1600),
  montagem: driveImage("1RhHiAwt-AMy_SYeYb3DeR5oAP9AInWQ6", 1600),
  personalizado: driveImage("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi", 1600),
  gallery: [
    "1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu",
    "1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V",
    "1kIqfmp5q5A-fcKaUMpDAWpFSb2-fpQeq",
    "1wPCvNPqsR0aPtZbtml90smyvfk6S8tcU",
  ].map((id) => driveImage(id, 1400)),
} as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LHL Festas — Decorações para grandes histórias" },
      { name: "description", content: "Festa na Mesa, Peg & Monte, Festas com Montagem e projetos personalizados no ABC." },
      { property: "og:title", content: "LHL Festas — Criamos cenários para grandes histórias" },
      { property: "og:image", content: PHOTO.hero },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/" }],
  }),
  component: HomePage,
});

function SafeImage({ src, alt, className, eager = false }: { src:string; alt:string; className:string; eager?:boolean }) {
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className={className} />;
}

const nav = [
  ["Início", "#inicio"], ["Nossas Festas", "#modalidades"], ["Inspire-se", "#inspiracao"], ["Sobre Nós", "#sobre"], ["Contato", "#contato"],
] as const;

function Header() {
  const [open,setOpen] = useState(false);
  return <header className="absolute inset-x-0 top-0 z-40 text-white">
    <div className="mx-auto flex h-[clamp(64px,6vw,82px)] max-w-[1500px] items-center justify-between px-[clamp(1rem,4vw,4rem)]">
      <Link to="/" className="rounded-sm bg-[#fffaf6]/95 px-3 py-1.5 shadow-sm"><img src={logoImages[0]} alt="LHL Festas" className="h-[clamp(34px,3.5vw,48px)] w-auto" /></Link>
      <nav className="hidden items-center gap-[clamp(1rem,2vw,2rem)] text-[clamp(.68rem,.78vw,.82rem)] font-medium lg:flex">{nav.map(([label,href])=><a key={label} href={href} className="drop-shadow-sm transition hover:text-[#f7cbd2]">{label}</a>)}</nav>
      <div className="flex items-center gap-2"><Link to="/orcamento" className="hidden h-10 items-center gap-2 rounded-full bg-[#d66a7a] px-5 text-xs font-semibold text-white shadow-lg sm:inline-flex"><MessageCircle className="h-4 w-4"/> Fazer Orçamento</Link><button onClick={()=>setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full bg-black/25 backdrop-blur lg:hidden" aria-label="Menu">{open?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button></div>
    </div>
    {open && <nav className="mx-4 rounded-2xl bg-[#fffaf6] p-3 text-[#4b242a] shadow-xl lg:hidden">{nav.map(([label,href])=><a key={label} href={href} onClick={()=>setOpen(false)} className="block rounded-xl px-4 py-3 text-sm">{label}</a>)}<Link to="/orcamento" className="mt-2 flex h-11 items-center justify-center rounded-full bg-[#d66a7a] text-sm font-semibold text-white">Fazer Orçamento</Link></nav>}
  </header>;
}

function Hero(){return <section id="inicio" className="relative min-h-[690px] overflow-hidden bg-[#2c251e] sm:min-h-[760px] lg:min-h-[min(860px,100svh)]">
  <SafeImage src={PHOTO.hero} alt="Decoração LHL Festas" eager className="absolute inset-0 h-full w-full scale-[1.06] object-cover object-[58%_50%] sm:scale-[1.03] sm:object-[56%_50%] lg:scale-100 lg:object-[54%_50%]"/>
  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,19,13,.88)_0%,rgba(20,20,15,.67)_31%,rgba(20,20,15,.20)_57%,rgba(20,20,15,.03)_100%)] sm:bg-[linear-gradient(90deg,rgba(16,19,13,.86)_0%,rgba(20,20,15,.62)_34%,rgba(20,20,15,.12)_65%,transparent_100%)]"/>
  <div className="relative z-10 mx-auto flex min-h-[690px] max-w-[1500px] items-end px-[clamp(1.2rem,5vw,5rem)] pb-[clamp(3.2rem,8vw,7rem)] pt-28 sm:min-h-[760px] sm:items-center sm:pb-8 lg:min-h-[min(860px,100svh)]">
    <div className="max-w-[620px] text-white">
      <p className="mb-4 text-[clamp(.62rem,.75vw,.78rem)] font-semibold uppercase tracking-[.32em] text-[#f3e4d8]">Mais que decorações</p>
      <h1 className="max-w-[10ch] font-serif text-[clamp(3.35rem,6.3vw,6.4rem)] leading-[.82] tracking-[-.045em] drop-shadow-md">Criamos cenários para grandes histórias.</h1>
      <p className="mt-5 max-w-[44ch] text-[clamp(.85rem,1.05vw,1rem)] leading-relaxed text-white/90">Festa na Mesa, Peg &amp; Monte e Decorações com Montagem para todos os momentos da sua vida.</p>
      <Link to="/orcamento" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#d66a7a] px-5 text-xs font-semibold text-white shadow-lg transition hover:bg-[#c65d6d]"><MessageCircle className="h-4 w-4"/> Quero meu orçamento <ArrowRight className="h-4 w-4"/></Link>
    </div>
  </div>
  <div className="absolute bottom-[clamp(1.2rem,3vw,2rem)] right-[clamp(1rem,4vw,4rem)] hidden h-[clamp(105px,10vw,145px)] w-[clamp(105px,10vw,145px)] place-items-center rounded-full bg-[#fffaf6]/95 text-center text-[#4b242a] shadow-xl sm:grid"><div><Heart className="mx-auto mb-1 h-4 w-4 fill-[#d66a7a] text-[#d66a7a]"/><p className="font-serif text-[clamp(1rem,1.25vw,1.3rem)] leading-[1.05]">Sonhe<br/>Comemore<br/>Viva</p></div></div>
</section>}

type Service={title:string;desc:string;image:string;href:string;position:string};
const services:Service[]=[
  {title:"Festa na Mesa",desc:"Pequenos detalhes, grandes lembranças.",image:PHOTO.mesa,href:"/festa-na-mesa",position:"object-[50%_48%]"},
  {title:"Peg & Monte",desc:"Você escolhe, retira, monta e comemora.",image:PHOTO.pegueMonte,href:"/peg-e-monte",position:"object-center"},
  {title:"Festas com Montagem",desc:"A LHL cuida de tudo para você.",image:PHOTO.montagem,href:"/decoracao-com-montagem",position:"object-[50%_48%]"},
  {title:"Personalizadas",desc:"Um projeto exclusivo pensado para sua história.",image:PHOTO.personalizado,href:"/tema-personalizado",position:"object-center"},
];

function Modalidades(){return <section id="modalidades" className="bg-[#fffaf6] py-[clamp(3rem,6vw,5.8rem)]"><div className="mx-auto max-w-[1450px] px-[clamp(1rem,4vw,4rem)]"><div className="mb-[clamp(2rem,4vw,3.5rem)] grid items-center gap-5 md:grid-cols-[.7fr_1.3fr]"><h2 className="font-serif text-[clamp(3rem,5vw,5.2rem)] italic leading-[.82] text-[#d66a7a]">Qual é<br/>a sua festa?</h2><p className="max-w-[44ch] text-[clamp(.9rem,1.1vw,1.05rem)] leading-relaxed text-[#4e3b3e]">Aqui tem um jeito perfeito de celebrar o seu momento.</p></div><div className="grid grid-cols-2 gap-[clamp(.7rem,1.6vw,1.4rem)] lg:grid-cols-4">{services.map(s=><article key={s.title} className="group flex min-w-0 flex-col overflow-hidden rounded-t-[clamp(2.2rem,4vw,4.5rem)] bg-[#f7e9e3] shadow-[0_12px_35px_-30px_rgba(63,28,34,.5)]"><div className="aspect-[.83] overflow-hidden sm:aspect-[.9]"><SafeImage src={s.image} alt={s.title} className={`h-full w-full object-cover transition duration-700 group-hover:scale-[1.025] ${s.position}`}/></div><div className="flex flex-1 flex-col items-center px-[clamp(.55rem,1.4vw,1.2rem)] pb-[clamp(.8rem,1.5vw,1.2rem)] pt-[clamp(.7rem,1.3vw,1rem)] text-center"><h3 className="font-serif text-[clamp(1.25rem,2vw,2rem)] leading-none text-[#3e2025]">{s.title}</h3><p className="mt-2 min-h-[2.7em] text-[clamp(.65rem,.82vw,.78rem)] leading-snug text-[#745d61]">{s.desc}</p><a href={s.href} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#d66a7a] px-[clamp(.8rem,1.2vw,1.15rem)] py-2 text-[clamp(.6rem,.72vw,.7rem)] font-semibold text-white">Ver opções <ArrowRight className="h-3 w-3"/></a></div></article>)}</div></div></section>}

function Inspiration(){return <section id="inspiracao" className="bg-[#f5e4df] py-[clamp(3rem,6vw,5.5rem)]"><div className="mx-auto grid max-w-[1450px] gap-[clamp(2rem,4vw,4rem)] px-[clamp(1rem,4vw,4rem)] lg:grid-cols-[.62fr_1.38fr] lg:items-center"><div><p className="text-[clamp(.58rem,.72vw,.7rem)] font-semibold uppercase tracking-[.26em] text-[#bd6673]">Inspiração que vira realidade</p><h2 className="mt-3 max-w-[8ch] font-serif text-[clamp(3rem,5.2vw,5.4rem)] leading-[.85] text-[#3d2025]">Festas que emocionam.</h2><p className="mt-5 max-w-[34ch] text-[clamp(.78rem,.95vw,.92rem)] leading-relaxed text-[#6f595d]">Mais de 300 festas realizadas e muitas histórias para contar. Veja alguns dos nossos trabalhos.</p><Link to="/catalogo" className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#d66a7a] px-5 text-xs font-semibold text-white">Ver mais festas <ArrowRight className="h-4 w-4"/></Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{PHOTO.gallery.map((src,i)=><div key={src} className={`overflow-hidden rounded-[10px] bg-white ${i===0?"sm:row-span-2 sm:col-span-2":""}`}><SafeImage src={src} alt={`Festa realizada pela LHL ${i+1}`} className={`h-full w-full object-cover ${i===0?"aspect-square sm:aspect-auto sm:min-h-[390px]":"aspect-square"}`}/></div>)}</div></div></section>}

function FinalCta(){return <section id="sobre" className="relative overflow-hidden bg-[#ead7d0]"><div className="absolute inset-y-0 left-0 w-[34%] overflow-hidden opacity-55"><SafeImage src={PHOTO.mesa} alt="Detalhe de decoração" className="h-full w-full object-cover object-center"/></div><div className="relative mx-auto flex max-w-[1450px] flex-col gap-6 px-[clamp(1rem,4vw,4rem)] py-[clamp(2.2rem,4vw,3.6rem)] sm:flex-row sm:items-center sm:justify-between"><div className="ml-0 max-w-[640px] rounded-2xl bg-[#ead7d0]/88 p-4 backdrop-blur-sm sm:ml-[22%]"><h2 className="font-serif text-[clamp(2rem,3.4vw,3.5rem)] leading-[.92] text-[#3e2025]">Cada festa tem um significado.<br/>Deixe a LHL fazer parte do seu.</h2><p className="mt-3 text-[clamp(.72rem,.9vw,.86rem)] text-[#70595d]">Seu momento merece ser planejado com carinho.</p></div><Link to="/orcamento" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#d66a7a] px-5 text-xs font-semibold text-white"><MessageCircle className="h-4 w-4"/> Fazer meu orçamento <ArrowRight className="h-4 w-4"/></Link></div></section>}

function Footer(){return <footer id="contato" className="bg-[#fffaf6] py-8"><div className="mx-auto flex max-w-[1450px] flex-col items-center justify-between gap-6 px-[clamp(1rem,4vw,4rem)] md:flex-row"><img src={logoImages[0]} alt="LHL Festas" className="h-12 w-auto"/><nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-[#5e4a4e]">{nav.map(([label,href])=><a key={label} href={href}>{label}</a>)}<Link to="/privacidade">Privacidade</Link></nav><div className="flex items-center gap-2"><a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-8 w-8 place-items-center rounded-full border border-[#ddc8c2]"><Instagram className="h-3.5 w-3.5"/></a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-8 w-8 place-items-center rounded-full border border-[#ddc8c2]"><MessageCircle className="h-3.5 w-3.5"/></a><p className="ml-3 font-serif text-sm italic text-[#7c5e64]">Festas que ficam<br/>pra sempre ♥</p></div></div></footer>}

function HomePage(){return <main className="min-h-screen bg-[#fffaf6] text-[#3f1c22]"><Header/><Hero/><Modalidades/><Inspiration/><FinalCta/><Footer/><Suspense fallback={null}><ConsultorFAB/></Suspense></main>}
