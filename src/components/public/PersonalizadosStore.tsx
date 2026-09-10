import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  ImageIcon,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { logoImages } from "@/assets/lhl";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import {
  formatPersonalizadoPrice,
  PERSONALIZADOS_CATEGORIES,
  PERSONALIZADOS_PRODUCTS,
  personalizadoImage,
  type PersonalizadoProduct,
} from "@/data/personalizados-store";

function unitLabel(product: PersonalizadoProduct) {
  if (product.unit === "letra") return "por letra";
  if (product.unit === "arte") return "por arte";
  return "por unidade";
}

export default function PersonalizadosStore() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof PERSONALIZADOS_CATEGORIES)[number]>("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [nome, setNome] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [tema, setTema] = useState("");
  const [personalizacao, setPersonalizacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return PERSONALIZADOS_PRODUCTS.filter((product) => {
      const categoryMatch = category === "Todos" || product.category === category;
      const searchMatch = !q || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase("pt-BR").includes(q);
      return categoryMatch && searchMatch;
    });
  }, [category, search]);

  const cartLines = useMemo(() => {
    return PERSONALIZADOS_PRODUCTS.flatMap((product) => {
      const quantity = cart[product.id] || 0;
      return quantity > 0 ? [{ product, quantity, subtotal: quantity * product.price }] : [];
    });
  }, [cart]);

  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const total = cartLines.reduce((sum, line) => sum + line.subtotal, 0);

  function changeQuantity(id: string, delta: number) {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] || 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }

  function removeItem(id: string) {
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function openWhatsApp() {
    if (!cartLines.length) return;
    const lines = cartLines.map(({ product, quantity, subtotal }) =>
      `• ${quantity}x ${product.name} — ${formatPersonalizadoPrice(subtotal)}${product.unit === "letra" ? " (quantidade de letras)" : ""}`
    );
    const message = [
      "Olá! Vim pela Loja de Personalizados da LHL Festas e quero finalizar meu orçamento.",
      "",
      nome ? `Nome: ${nome}` : "",
      dataEvento ? `Data da festa: ${dataEvento.split("-").reverse().join("/")}` : "",
      tema ? `Tema/cores: ${tema}` : "",
      personalizacao ? `Nome/idade/texto da arte: ${personalizacao}` : "",
      "",
      "Itens selecionados:",
      ...lines,
      `Estimativa dos personalizados: ${formatPersonalizadoPrice(total)}`,
      observacoes ? `Observações: ${observacoes}` : "",
      "",
      "Quero confirmar disponibilidade, prazo de produção e detalhes da personalização.",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  const featured = PERSONALIZADOS_PRODUCTS.filter((product) => product.featured && product.imageId).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#fffaf6] text-[#2b2022]">
      <header className="sticky top-0 z-40 border-b border-[#eadbd5]/80 bg-[#fffaf6]/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] max-w-[1500px] items-center justify-between px-5 md:px-8 lg:h-[82px]">
          <Link to="/" aria-label="LHL Festas">
            <img src={logoImages[0]} alt="LHL Festas" className="h-[50px] w-auto object-contain lg:h-[58px]" />
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] text-[#4f4144] lg:flex">
            <Link to="/">Início</Link>
            <a href="#produtos">Produtos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#personalizacao">Personalização</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-[#d76578] px-4 py-2.5 text-xs font-semibold text-white sm:px-5 sm:text-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Meu orçamento</span>
              {itemCount > 0 ? <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#b95063]">{itemCount}</span> : null}
            </button>
            <button type="button" className="rounded-full border border-[#eadbd5] p-2.5 lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="absolute inset-x-0 top-full border-b border-[#eadbd5] bg-[#fffaf6] px-5 py-4 shadow-xl lg:hidden">
            <a onClick={() => setMenuOpen(false)} href="#produtos" className="block py-3 text-sm">Produtos</a>
            <a onClick={() => setMenuOpen(false)} href="#como-funciona" className="block py-3 text-sm">Como funciona</a>
            <a onClick={() => setMenuOpen(false)} href="#personalizacao" className="block py-3 text-sm">Personalização</a>
          </div>
        ) : null}
      </header>

      <main>
        <section className="overflow-hidden bg-[#f8ebe6]">
          <div className="relative mx-auto min-h-[620px] max-w-[1600px] overflow-hidden bg-[#fff9f5] lg:min-h-[650px]">
            {featured[0] ? (
              <img
                src={personalizadoImage(featured[0].imageId, 1800)}
                alt="Personalizados para festa LHL Festas"
                className="absolute right-0 top-0 hidden h-full w-[57%] object-cover object-center lg:block"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 z-[1] hidden bg-[linear-gradient(90deg,#fff9f5_0%,#fff9f5_38%,rgba(255,249,245,1)_42%,rgba(255,249,245,.96)_45%,rgba(255,249,245,.82)_48%,rgba(255,249,245,.62)_51%,rgba(255,249,245,.38)_54%,rgba(255,249,245,.18)_57%,rgba(255,249,245,.06)_60%,transparent_66%)] lg:block" />
            <div className="relative z-10 flex min-h-[620px] flex-col justify-center px-6 py-14 sm:px-10 lg:min-h-[650px] lg:w-[52%] lg:max-w-[720px] lg:px-[clamp(38px,5vw,82px)]">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fae9e5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#b95063]">
                <Sparkles className="h-3.5 w-3.5" /> Novo na LHL
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.28em] text-[#ce6475]">Loja de Personalizados</p>
              <h1 className="mt-3 max-w-[10ch] font-serif text-[clamp(3.6rem,5.1vw,6rem)] leading-[.88] tracking-[-.045em] text-[#21191b]">
                Pequenos detalhes. <span className="text-[#cf6675]">Grandes lembranças.</span>
              </h1>
              <p className="mt-6 max-w-[520px] text-[15px] leading-[1.75] text-[#594b4e] sm:text-base">
                Escolha caixinhas, lembrancinhas, itens de mesa e convites. Monte sua seleção e envie o orçamento para a LHL finalizar com você pelo WhatsApp.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#produtos" className="inline-flex items-center gap-2 rounded-full bg-[#d76578] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(215,101,120,.2)]">
                  Escolher produtos <ArrowRight className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => setCartOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-[#d76578]/40 bg-white/90 px-7 py-3.5 text-sm font-semibold text-[#b95063]">
                  <ShoppingBag className="h-4 w-4" /> Ver orçamento
                </button>
              </div>
              <div className="mt-8 grid max-w-[540px] gap-3 sm:grid-cols-3">
                {["Arte no seu tema", "Você escolhe as quantidades", "Finalização pelo WhatsApp"].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-xs leading-relaxed text-[#67575a]">
                    <Check className="h-4 w-4 shrink-0 text-[#d76578]" /> {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="grid grid-cols-3 gap-2 bg-[#fff9f5] px-4 pb-5">
                {featured.map((product, index) => (
                  <img key={product.id} src={personalizadoImage(product.imageId, 700)} alt={product.name} className={index === 0 ? "col-span-2 aspect-[4/3] h-full w-full rounded-[22px] object-cover" : "aspect-[2/3] h-full w-full rounded-[22px] object-cover"} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-[#eadbd5] bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-px bg-[#eadbd5] md:grid-cols-4">
            {[
              ["01", "Escolha", "Adicione os personalizados e quantidades que deseja."],
              ["02", "Personalize", "Conte o tema, nome, idade, cores ou texto que quer usar."],
              ["03", "Envie", "O site organiza sua seleção e abre o WhatsApp da LHL."],
              ["04", "Confirme", "A Josi confirma prazo, disponibilidade, arte e valor final."],
            ].map(([number, title, text]) => (
              <div key={number} className="bg-white px-7 py-7">
                <div className="font-serif text-3xl text-[#d76578]">{number}</div>
                <div className="mt-3 font-serif text-2xl text-[#302326]">{title}</div>
                <p className="mt-2 text-xs leading-relaxed text-[#746266]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="produtos" className="py-[clamp(56px,6vw,92px)]">
          <div className="mx-auto max-w-[1500px] px-5 md:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Monte do seu jeito</p>
                <h2 className="mt-3 max-w-[12ch] font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[.92] text-[#241b1c]">Escolha seus personalizados.</h2>
                <p className="mt-4 max-w-[620px] text-sm leading-relaxed text-[#68575a] sm:text-base">Os valores exibidos são unitários e ajudam a montar a estimativa. A produção e a arte são confirmadas no atendimento.</p>
              </div>
              <div className="relative w-full lg:max-w-[390px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a78288]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto..." className="h-12 w-full rounded-full border border-[#e8d6d0] bg-white pl-11 pr-5 text-sm outline-none transition focus:border-[#d76578]" />
              </div>
            </div>

            <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
              {PERSONALIZADOS_CATEGORIES.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={category === item ? "shrink-0 rounded-full bg-[#651421] px-5 py-2.5 text-xs font-semibold text-white" : "shrink-0 rounded-full border border-[#eadbd5] bg-white px-5 py-2.5 text-xs font-semibold text-[#6c555a] transition hover:border-[#d76578]/60"}>
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => {
                const quantity = cart[product.id] || 0;
                return (
                  <article key={product.id} className="group flex min-h-full flex-col overflow-hidden rounded-[28px] border border-[#eadbd5] bg-white shadow-[0_10px_30px_rgba(82,42,49,.05)]">
                    <div className="relative aspect-[4/3.2] overflow-hidden bg-[#fae9e5]">
                      {product.imageId ? (
                        <img src={personalizadoImage(product.imageId, 900)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-[#b88991]">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-xs">Foto em validação</span>
                        </div>
                      )}
                      <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9f5764] shadow-sm backdrop-blur">{product.category}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-serif text-2xl leading-none text-[#302326]">{product.name}</h3>
                      <p className="mt-3 min-h-[52px] text-xs leading-relaxed text-[#725f63]">{product.description}</p>
                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#f0e1db] pt-4">
                        <div>
                          <div className="font-serif text-[1.7rem] leading-none text-[#b95063]">{formatPersonalizadoPrice(product.price)}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#9a8186]">{unitLabel(product)}</div>
                        </div>
                        {quantity === 0 ? (
                          <button type="button" onClick={() => changeQuantity(product.id, 1)} className="inline-flex items-center gap-1.5 rounded-full bg-[#d76578] px-4 py-2.5 text-xs font-semibold text-white">
                            <Plus className="h-3.5 w-3.5" /> Adicionar
                          </button>
                        ) : (
                          <div className="flex items-center rounded-full border border-[#e7d4ce] bg-[#fffaf6] p-1">
                            <button type="button" onClick={() => changeQuantity(product.id, -1)} className="grid h-8 w-8 place-items-center rounded-full text-[#a65261] hover:bg-white"><Minus className="h-3.5 w-3.5" /></button>
                            <span className="min-w-8 text-center text-sm font-bold">{quantity}</span>
                            <button type="button" onClick={() => changeQuantity(product.id, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#d76578] text-white"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {!filtered.length ? <div className="mt-12 rounded-[28px] border border-dashed border-[#dec8c2] bg-white p-10 text-center text-sm text-[#806b70]">Nenhum produto encontrado com esse filtro.</div> : null}
          </div>
        </section>

        <section id="personalizacao" className="bg-[#fae9e5] py-[clamp(56px,6vw,92px)]">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-5 md:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-[110px]">
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c95e70]">Sua festa, sua identidade</p>
              <h2 className="mt-3 max-w-[10ch] font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[.92] text-[#241b1c]">Conte como você imagina a arte.</h2>
              <p className="mt-5 max-w-[470px] text-sm leading-relaxed text-[#68575a] sm:text-base">Pode ser um personagem, hobby, profissão, paleta de cores, foto, nome ou uma ideia criada especialmente para a comemoração.</p>
              <div className="mt-7 space-y-3">
                {["Nome e idade", "Tema ou paleta de cores", "Foto ou referência enviada depois no WhatsApp", "Frases e detalhes especiais"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-[#5e4c50]"><Check className="h-4 w-4 text-[#d76578]" /> {item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[#e8d1ca] bg-white p-5 shadow-[0_12px_40px_rgba(82,42,49,.07)] sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#654f54]">Seu nome
                  <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Como podemos chamar você?" className="mt-2 h-12 w-full rounded-2xl border border-[#eadbd5] bg-[#fffaf6] px-4 text-sm font-normal outline-none focus:border-[#d76578]" />
                </label>
                <label className="text-xs font-semibold text-[#654f54]">Data da festa
                  <input type="date" value={dataEvento} onChange={(event) => setDataEvento(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#eadbd5] bg-[#fffaf6] px-4 text-sm font-normal outline-none focus:border-[#d76578]" />
                </label>
                <label className="text-xs font-semibold text-[#654f54] sm:col-span-2">Tema ou cores
                  <input value={tema} onChange={(event) => setTema(event.target.value)} placeholder="Ex.: Stitch, jardim encantado, rosa e dourado..." className="mt-2 h-12 w-full rounded-2xl border border-[#eadbd5] bg-[#fffaf6] px-4 text-sm font-normal outline-none focus:border-[#d76578]" />
                </label>
                <label className="text-xs font-semibold text-[#654f54] sm:col-span-2">Nome, idade ou texto para personalizar
                  <input value={personalizacao} onChange={(event) => setPersonalizacao(event.target.value)} placeholder="Ex.: Helena • 5 anos" className="mt-2 h-12 w-full rounded-2xl border border-[#eadbd5] bg-[#fffaf6] px-4 text-sm font-normal outline-none focus:border-[#d76578]" />
                </label>
                <label className="text-xs font-semibold text-[#654f54] sm:col-span-2">Observações
                  <textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Conte algum detalhe importante para a Josi..." rows={4} className="mt-2 w-full resize-none rounded-2xl border border-[#eadbd5] bg-[#fffaf6] px-4 py-3 text-sm font-normal outline-none focus:border-[#d76578]" />
                </label>
              </div>

              <div className="mt-6 rounded-[22px] bg-[#fff3ef] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a97880]">Sua seleção</div>
                    <div className="mt-1 font-serif text-2xl text-[#302326]">{cartLines.length ? `${itemCount} item(ns)` : "Nenhum item adicionado"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[.14em] text-[#9a8186]">Estimativa</div>
                    <div className="mt-1 font-serif text-2xl text-[#b95063]">{formatPersonalizadoPrice(total)}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setCartOpen(true)} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#b95063]">Revisar produtos <ChevronRight className="h-4 w-4" /></button>
              </div>

              <button type="button" disabled={!cartLines.length} onClick={openWhatsApp} className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#d76578] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(215,101,120,.2)] transition enabled:hover:bg-[#c9586c] disabled:cursor-not-allowed disabled:opacity-45">
                <MessageCircle className="h-5 w-5" /> Pedir orçamento no WhatsApp
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-[#917a7f]">O envio não confirma o pedido. A Josi valida disponibilidade, prazo de produção, arte e condições antes da confirmação.</p>
            </div>
          </div>
        </section>

        <section className="bg-[#651421] py-[clamp(52px,6vw,80px)] text-white">
          <div className="mx-auto grid max-w-[1400px] gap-8 px-5 md:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.25em] text-[#efb6b5]"><Sparkles className="h-4 w-4" /> Feito para combinar</p>
              <h2 className="mt-3 max-w-[10ch] font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[.9]">Personalizados que conversam com a decoração.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [Heart, "Identidade", "Tema, cores, nome e detalhes alinhados à proposta da festa."],
                [PackageCheck, "Seleção livre", "Escolha apenas os itens e quantidades que fazem sentido para você."],
                [MessageCircle, "Atendimento humano", "A Josi recebe sua seleção e finaliza tudo pelo WhatsApp."],
              ].map(([Icon, title, text]) => {
                const FeatureIcon = Icon as typeof Heart;
                return (
                  <div key={String(title)} className="rounded-[24px] border border-white/15 bg-white/7 p-5">
                    <FeatureIcon className="h-6 w-6 text-[#efb6b5]" />
                    <div className="mt-4 font-serif text-2xl">{String(title)}</div>
                    <p className="mt-2 text-xs leading-relaxed text-white/70">{String(text)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eadbd5] bg-[#fffaf6] py-8">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:text-left md:px-8">
          <div className="flex items-center gap-3"><img src={logoImages[0]} alt="LHL Festas" className="h-12 w-auto" /><span className="text-xs text-[#806b70]">Loja de Personalizados LHL Festas</span></div>
          <p className="max-w-[520px] text-[11px] leading-relaxed text-[#8a7478]">As fotos representam exemplos de personalização. Arte, disponibilidade e prazo são confirmados após o atendimento.</p>
        </div>
      </footer>

      {cartOpen ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-[#2a171b]/45 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Meu orçamento de personalizados">
          <button type="button" aria-label="Fechar orçamento" className="absolute inset-0" onClick={() => setCartOpen(false)} />
          <aside className="relative z-10 flex h-full w-full max-w-[470px] flex-col bg-[#fffaf6] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eadbd5] px-5 py-5 sm:px-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b95063]">Loja de Personalizados</div>
                <h2 className="mt-1 font-serif text-3xl text-[#302326]">Meu orçamento</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="rounded-full border border-[#eadbd5] p-2.5"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {!cartLines.length ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-10 w-10 text-[#d9a8b0]" />
                  <div className="mt-4 font-serif text-2xl text-[#453437]">Seu orçamento está vazio.</div>
                  <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-[#806b70]">Escolha os personalizados e ajuste as quantidades para montar sua seleção.</p>
                  <button type="button" onClick={() => setCartOpen(false)} className="mt-5 rounded-full bg-[#d76578] px-5 py-2.5 text-xs font-semibold text-white">Ver produtos</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartLines.map(({ product, quantity, subtotal }) => (
                    <div key={product.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-[20px] border border-[#eadbd5] bg-white p-3">
                      <div className="aspect-square overflow-hidden rounded-[14px] bg-[#fae9e5]">
                        {product.imageId ? <img src={personalizadoImage(product.imageId, 300)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-5 w-5 text-[#c699a1]" /></div>}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div><div className="font-semibold text-[#433336]">{product.name}</div><div className="mt-1 text-xs text-[#9a8186]">{formatPersonalizadoPrice(product.price)} {unitLabel(product)}</div></div>
                          <button type="button" onClick={() => removeItem(product.id)} className="p-1.5 text-[#a97b83] hover:text-[#b95063]" aria-label={`Remover ${product.name}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-full border border-[#eadbd5] bg-[#fffaf6] p-1">
                            <button type="button" onClick={() => changeQuantity(product.id, -1)} className="grid h-7 w-7 place-items-center"><Minus className="h-3 w-3" /></button>
                            <span className="min-w-7 text-center text-xs font-bold">{quantity}</span>
                            <button type="button" onClick={() => changeQuantity(product.id, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-[#d76578] text-white"><Plus className="h-3 w-3" /></button>
                          </div>
                          <div className="font-serif text-xl text-[#b95063]">{formatPersonalizadoPrice(subtotal)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#eadbd5] bg-white px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between"><span className="text-sm text-[#6f5d61]">Estimativa</span><strong className="font-serif text-3xl font-normal text-[#b95063]">{formatPersonalizadoPrice(total)}</strong></div>
              <p className="mt-1 text-[10px] leading-relaxed text-[#947d82]">Frete/retirada, prazo e ajustes de arte não estão confirmados nesta etapa.</p>
              <button type="button" disabled={!cartLines.length} onClick={() => { setCartOpen(false); document.getElementById("personalizacao")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#d76578] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-45">
                Continuar orçamento <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
