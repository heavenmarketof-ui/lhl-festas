import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarDays, Heart, Instagram, Menu, MessageCircle, Search, Star, Truck, X } from "lucide-react";
import { logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";

const d = (id:string,w=1800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const P = {
  hero:d("1QvxmzbjJNCanILqUWuDwAE9Yw9hnKANs",2200),
  mesa:d("1oe1H1YUXprHITr2hQbuqmDnvu_4Rf2SQ",1600),
  peg:d("13MMyb2SQfmKrkdjdccjtjZ3f49CovFTD",1600),
  mont:d("1RhHiAwt-AMy_SYeYb3DeR5oAP9AInWQ6",1600),
  pers:d("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi",1600),
  gal:[
    "1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu",
    "1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov",
    "1d5xpnRNkiSECrh5FlkSC8DnISWWDBMh9",
    "1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf",
    "1sPR9r8RFE32InQjk1puq0L1v1Dw4gE3_",
    "15zwnq9Ejv-JYvqGfE3K69Rn7DgXthDCq",
  ].map(x=>d(x,1500)),
};
const WA=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero solicitar um orçamento com a LHL Festas.")}`;

export const Route=createFileRoute("/")({
  component:Home,
  head:()=>({meta:[
    {title:"LHL Festas — Criamos cenários para grandes histórias"},
    {name:"description",content:"Festa na Mesa, Peg & Monte, Festas com Montagem e Festas Personalizadas no ABC."},
    {property:"og:image",content:P.hero}
  ]})
});

const nav=["Início","Nossas Festas","Como Funciona","Sobre Nós","Depoimentos","Contato"];
function Header(){
  const[o,setO]=useState(false);
  const href=(i:number)=>i===0?"#inicio":i===1?"#modalidades":i===2?"#como":"#contato";
  return <header className="relative z-50 border-b border-[#eadbd5]/70 bg-[#fffaf6] text-[#40272a]">
    <div className="mx-auto flex h-[74px] max-w-[1500px] items-center justify-between px-[clamp(18px,4vw,64px)] lg:h-[82px]">
      <Link to="/" aria-label="LHL Festas"><img src={logoImages[0]} alt="LHL Festas" className="h-[52px] w-auto object-contain lg:h-[60px]"/></Link>
      <nav className="hidden items-center gap-[clamp(20px,2.2vw,34px)] text-[13px] lg:flex">{nav.map((n,i)=><a key={n} href={href(i)} className={i===0?"text-[#d55f73] underline decoration-2 underline-offset-[11px]":"transition hover:text-[#d55f73]"}>{n}</a>)}</nav>
      <Link to="/orcamento" className="hidden items-center gap-2 rounded-full bg-[#d76578] px-6 py-3 text-sm font-semibold text-white lg:flex"><MessageCircle className="h-4 w-4"/>Fazer Orçamento<ArrowRight className="h-4 w-4"/></Link>
      <button className="lg:hidden" onClick={()=>setO(!o)} aria-label="Menu">{o?<X/>:<Menu/>}</button>
    </div>
    {o&&<div className="absolute inset-x-0 top-full bg-[#fffaf6] p-5 shadow-xl lg:hidden">{nav.slice(0,4).map((n,i)=><a key={n} onClick={()=>setO(false)} href={href(i)} className="block py-3 text-sm">{n}</a>)}<Link to="/orcamento" className="mt-2 flex justify-center rounded-full bg-[#d76578] px-5 py-3 text-white">Fazer Orçamento</Link></div>}
  </header>
}

function Hero(){
  const benefits=[[Heart,"Decorações incríveis"],[CalendarDays,"Todos os temas"],[Truck,"Retire, monte ou deixe com a gente"],[Star,"Mais de 300 festas realizadas"]] as const;
  return <section id="inicio" className="bg-[#f8ebe6]">
    <div className="relative mx-auto min-h-[620px] max-w-[1600px] overflow-hidden bg-[#f8ebe6] lg:min-h-[650px]">
      <img src={P.hero} alt="Decoração Moranguinho LHL Festas" fetchPriority="high" className="absolute right-0 top-0 hidden h-full w-auto max-w-none object-contain lg:block"/>
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fff9f5_0%,#fff9f5_27%,rgba(255,249,245,.98)_34%,rgba(255,249,245,.82)_41%,rgba(255,249,245,.38)_48%,rgba(255,249,245,.08)_55%,transparent_62%)] lg:block"/>
      <div className="relative z-10 hidden min-h-[650px] w-[48%] max-w-[660px] flex-col justify-center px-[clamp(38px,5vw,82px)] lg:flex">
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[.28em] text-[#ce6475]">Mais que decorações</p>
        <h1 className="max-w-[9.5ch] font-serif text-[clamp(4rem,5vw,5.8rem)] leading-[.88] tracking-[-.045em] text-[#171313]">Criamos cenários para <span className="text-[#cf6675]">grandes histórias.</span></h1>
        <p className="mt-5 max-w-[390px] text-[14px] leading-relaxed text-[#4e4143]">Festa na Mesa, Peg &amp; Monte, Festas com Montagem e Personalizadas para todos os momentos da sua vida.</p>
        <Link to="/orcamento" className="mt-6 inline-flex w-fit items-center gap-3 rounded-full bg-[#d76578] px-7 py-3.5 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/>Quero meu orçamento<ArrowRight className="h-4 w-4"/></Link>
        <div className="mt-8 grid grid-cols-4 gap-4">{benefits.map(([I,t])=>{const Icon=I;return <div key={t} className="flex min-h-[78px] flex-col items-center justify-start text-center text-[#4f3e41]"><Icon className="mb-2 h-7 w-7 text-[#c95e70]"/><span className="max-w-[125px] text-[11px] leading-[1.25]">{t}</span></div>})}</div>
      </div>
      <div className="lg:hidden">
        <div className="px-6 pb-7 pt-10 text-center sm:px-10"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[.26em] text-[#ce6475]">Mais que decorações</p><h1 className="mx-auto max-w-[10ch] font-serif text-[clamp(3rem,12vw,4.4rem)] leading-[.88] tracking-[-.04em] text-[#171313]">Criamos cenários para <span className="text-[#cf6675]">grandes histórias.</span></h1><p className="mx-auto mt-4 max-w-[390px] text-[13px] leading-relaxed text-[#4e4143]">Festa na Mesa, Peg &amp; Monte, Festas com Montagem e Personalizadas para todos os momentos da sua vida.</p><Link to="/orcamento" className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#d76578] px-6 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/>Quero meu orçamento<ArrowRight className="h-4 w-4"/></Link></div>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[900px] overflow-hidden"><img src={P.hero} alt="Decoração Moranguinho LHL Festas" className="h-full w-full object-contain object-center"/></div>
        <div className="grid grid-cols-2 gap-3 bg-[#fff9f5] px-5 py-5 sm:grid-cols-4">{benefits.map(([I,t])=>{const Icon=I;return <div key={t} className="flex min-h-[68px] flex-col items-center justify-center text-center"><Icon className="mb-2 h-6 w-6 text-[#c95e70]"/><span className="max-w-[130px] text-[11px] leading-tight">{t}</span></div>})}</div>
      </div>
    </div>
  </section>
}

const services=[
  {t:"Festa na Mesa",d:"Decorações compactas, encantadoras e perfeitas para momentos especiais.",i:P.mesa,h:"/festa-na-mesa"},
  {t:"Peg & Monte",d:"Você escolhe, retira, monta e comemora. Praticidade e economia com muito estilo.",i:P.peg,h:"/peg-e-monte"},
  {t:"Festas com Montagem",d:"A LHL cuida de tudo para você. Do planejamento à montagem, é só aproveitar.",i:P.mont,h:"/decoracao-com-montagem"},
  {t:"Festas Personalizadas",d:"Um projeto exclusivo, criado especialmente para transformar a sua ideia em cenário.",i:P.pers,h:"/tema-personalizado"},
];
function Modalidades(){return <section id="modalidades" className="bg-[#fffaf6] py-[clamp(52px,6vw,88px)]"><div className="mx-auto max-w-[1440px] px-[clamp(18px,4vw,60px)]">
  <div className="mb-9 flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-20 sm:text-left"><div className="relative"><Heart className="absolute -left-9 top-3 hidden h-7 w-7 fill-[#d66a7c] text-[#d66a7c] sm:block"/><h2 className="rotate-[-3deg] font-serif text-[clamp(2.7rem,4.3vw,4.9rem)] italic leading-[.82] text-[#d36b7d]">Qual é<br/>a sua festa?</h2></div><p className="max-w-[390px] text-[clamp(14px,1.05vw,17px)] leading-relaxed text-[#43383a]">Aqui tem um jeito perfeito de celebrar<br className="hidden sm:block"/> o seu momento.</p></div>
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{services.map(s=><article key={s.t} className="group overflow-hidden rounded-[34px] border border-[#eadbd5] bg-white shadow-[0_8px_24px_rgba(73,34,41,.06)]"><div className="aspect-[4/3.15] overflow-hidden"><img src={s.i} alt={s.t} className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"/></div><div className="flex min-h-[190px] flex-col items-center px-5 pb-5 pt-5 text-center"><h3 className="max-w-[11ch] font-serif text-[clamp(1.8rem,2vw,2.2rem)] leading-[.96] text-[#2b2022]">{s.t}</h3><div className="my-3 h-[2px] w-8 bg-[#d76578]"/><p className="max-w-[29ch] text-[13px] leading-relaxed text-[#5c4c4f]">{s.d}</p><a href={s.h} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d76578] px-5 py-2.5 text-xs font-semibold text-white">Ver opções<ArrowRight className="h-3.5 w-3.5"/></a></div></article>)}</div>
</div></section>}

function Gallery(){return <section className="bg-[#fae9e5] py-[clamp(46px,5vw,72px)]"><div className="mx-auto grid max-w-[1440px] gap-8 px-[clamp(18px,4vw,60px)] lg:grid-cols-[.72fr_1.65fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#c75f70]">Inspiração que<br/>vira realidade</p><div className="my-4 h-[2px] w-8 bg-[#d76578]"/><h2 className="font-serif text-[clamp(2.8rem,4.2vw,5rem)] leading-[.9] text-[#241b1c]">Festas que<br/>emocionam.</h2><p className="mt-5 max-w-[330px] text-sm leading-relaxed text-[#5d4c4f]">Mais de 300 festas realizadas e muitas histórias para contar. Veja alguns dos nossos trabalhos.</p><Link to="/catalogo" className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#d76578] px-6 py-3 text-sm font-semibold text-white">Ver mais festas<ArrowRight className="h-4 w-4"/></Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{P.gal.map((x,i)=><img key={x} src={x} className="aspect-[4/2.7] w-full rounded-lg object-cover" alt={`Decoração real LHL ${i+1}`}/>)}</div></div></section>}

function CTA(){return <section className="relative overflow-hidden bg-[#f1dfd8] py-9"><div className="absolute inset-y-0 left-0 w-[22%] bg-[radial-gradient(circle,#e8a0a7_0%,#efc5c1_40%,transparent_72%)]"/><div className="relative mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-5 px-[clamp(18px,4vw,60px)] sm:flex-row sm:items-center"><div className="sm:ml-[18%]"><h2 className="font-serif text-[clamp(2rem,3vw,3.4rem)] leading-[.92] text-[#302326]">Cada festa tem um significado.<br/>Deixe a LHL fazer parte do seu.</h2><p className="mt-3 text-sm text-[#655154]">Solicite seu orçamento agora e comece a planejar um momento inesquecível.</p></div><Link to="/orcamento" className="inline-flex shrink-0 items-center gap-3 rounded-full bg-[#d76578] px-7 py-3.5 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4"/>Fazer meu orçamento<ArrowRight className="h-4 w-4"/></Link></div></section>}

function Como(){const steps=[[Search,"1. Escolha","Encontre o tema e o modelo ideal."],[MessageCircle,"2. Orçamento","Solicite pelo site ou WhatsApp."],[CalendarDays,"3. Alinhamento","Confirmamos todos os detalhes com você."],[Heart,"4. Festa!","É só comemorar. A LHL está com você!"]] as const;return <section id="como" className="bg-[#fffaf6] py-12"><div className="mx-auto grid max-w-[1440px] gap-8 px-[clamp(18px,4vw,60px)] lg:grid-cols-[.7fr_2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[#ce6576]">Como funciona</p><h2 className="mt-3 font-serif text-[clamp(2.4rem,3.3vw,4rem)] leading-[.9]">Do seu jeito,<br/>sem complicação.</h2></div><div className="grid grid-cols-2 gap-7 sm:grid-cols-4">{steps.map(([I,a,b])=>{const Icon=I;return <div key={a} className="flex min-h-[148px] flex-col items-center justify-start text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#f4dedd] text-[#c45d6f]"><Icon className="h-5 w-5"/></div><b className="text-sm">{a}</b><p className="mt-2 max-w-[160px] text-xs leading-relaxed text-[#665457]">{b}</p></div>})}</div></div></section>}

function Footer(){return <footer id="contato" className="border-t border-[#eadbd5] bg-[#fffaf6] py-8"><div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 px-[clamp(18px,4vw,60px)] sm:flex-row"><div className="flex items-center gap-5"><img src={logoImages[0]} alt="LHL Festas" className="h-12"/><span className="text-xs text-[#735f63]">Decorações que celebram a vida.</span></div><div className="flex flex-wrap items-center justify-center gap-4 text-xs"><a href="#inicio">Início</a><a href="#modalidades">Nossas Festas</a><a href="#como">Como Funciona</a><a href={WA}>Contato</a><a href="https://www.instagram.com/lhl_festas/" target="_blank" rel="noreferrer"><Instagram className="h-4 w-4"/></a></div><p className="font-serif text-xl italic text-[#d26b7c]">Festas<br/>que ficam<br/>pra sempre ♥</p></div></footer>}

function Home(){return <main className="bg-[#fffaf6] text-[#2c2224]"><Header/><Hero/><Modalidades/><Gallery/><CTA/><Como/><Footer/></main>}
