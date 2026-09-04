import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Images, Loader2, Search, Sparkles, X } from "lucide-react";

const CATALOG_API = "https://catalogo-lhlfestas.lovable.app/api/public/catalog.json";

const vinho = "#651421";
const vinhoEscuro = "#470b15";
const rosa = "#d87982";
const rosaClaro = "#f6dbd7";
const marfim = "#fff8f0";
const dourado = "#c89b58";

type CatalogImage = {
  url: string;
  thumbnailUrl: string;
  modality: string;
};

type CatalogTheme = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  modalities: string[];
  images: CatalogImage[];
};

type CatalogPayload = {
  version: number;
  updatedAt: string;
  totalThemes: number;
  themes: CatalogTheme[];
};

export const Route = createFileRoute("/catalogo")({
  component: CatalogoPage,
  head: () => ({
    meta: [
      { title: "Catálogo de Temas | LHL Festas" },
      {
        name: "description",
        content: "Explore os temas disponíveis da LHL Festas para Festa na Mesa e Peg & Monte.",
      },
      { property: "og:title", content: "Catálogo de Temas | LHL Festas" },
      { property: "og:url", content: "https://www.lhlfestas.com.br/catalogo" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/catalogo" }],
  }),
});

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBudgetUrl(theme: CatalogTheme, image: CatalogImage) {
  const params = new URLSearchParams();
  params.set("tema", theme.name);
  params.set("modalidade", image.modality || theme.modalities[0] || "");
  params.set("modelo", `Opção ${Math.max(1, theme.images.findIndex((i) => i.url === image.url) + 1)}`);
  params.set("imagem", image.url);
  params.set("themeId", theme.id);
  params.set("origem", "catalogo");
  params.set("utm_source", "catalogo");
  params.set("utm_medium", "site");
  params.set("utm_campaign", "escolha_tema");
  return `/orcamento?${params.toString()}`;
}

function CatalogoPage() {
  const [data, setData] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modality, setModality] = useState<string>("Todos");
  const [selected, setSelected] = useState<CatalogTheme | null>(null);

  useEffect(() => {
    let active = true;
    fetch(CATALOG_API, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Falha ao carregar catálogo (${res.status})`);
        return res.json() as Promise<CatalogPayload>;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar o catálogo.");
      });
    return () => {
      active = false;
    };
  }, []);

  const modalities = useMemo(() => {
    const set = new Set<string>();
    for (const theme of data?.themes ?? []) {
      for (const m of theme.modalities) set.add(m);
    }
    return ["Todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [data]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return (data?.themes ?? []).filter((theme) => {
      const matchesModality = modality === "Todos" || theme.modalities.includes(modality);
      if (!matchesModality) return false;
      if (!q) return true;
      const haystack = normalize([theme.name, ...theme.aliases, ...theme.modalities].join(" "));
      return haystack.includes(q);
    });
  }, [data, query, modality]);

  return (
    <div className="min-h-screen" style={{ background: marfim, color: vinho }}>
      <header className="sticky top-0 z-40 border-b border-white/10 text-white shadow-lg" style={{ background: `linear-gradient(90deg, ${vinhoEscuro}, ${vinho})` }}>
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar para o site
          </Link>
          <div className="text-center">
            <div className="font-serif text-xl text-[#f4d49b]">Catálogo LHL Festas</div>
            <div className="text-[10px] uppercase tracking-[.2em] text-white/60">Escolha seu tema</div>
          </div>
          <Link to="/orcamento" className="rounded-full px-4 py-2 text-sm font-semibold text-[#4a0d18] shadow" style={{ background: rosa }}>
            Orçamento
          </Link>
        </div>
      </header>

      <section className="border-b" style={{ borderColor: "#ead2c8", background: `linear-gradient(135deg, ${rosaClaro}, #fffaf4)` }}>
        <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:py-14">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.22em]" style={{ color: dourado }}>Catálogo de temas</span>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[.95] sm:text-6xl lg:text-7xl">
              Encontre a decoração que combina com a sua festa.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#6d4c49] sm:text-lg">
              Escolha a modalidade, pesquise pelo tema e veja as opções de artes disponíveis. Depois, envie sua escolha direto para o orçamento.
            </p>
          </div>
          <div className="rounded-3xl border bg-white/80 p-5 shadow-sm" style={{ borderColor: "#e8cfc5" }}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9b7470]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tema: Stitch, Safari, Princesas..."
                className="w-full rounded-full border bg-white py-3.5 pl-12 pr-5 text-base outline-none transition focus:ring-2"
                style={{ borderColor: "#dfc5bb" }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {modalities.map((m) => (
                <button
                  key={m}
                  onClick={() => setModality(m)}
                  className="rounded-full border px-4 py-2 text-sm font-semibold transition"
                  style={{
                    background: modality === m ? vinho : "white",
                    color: modality === m ? "white" : vinho,
                    borderColor: modality === m ? vinho : "#dfc5bb",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-8 md:py-12">
        {!data && !error && (
          <div className="flex items-center justify-center gap-3 py-24 text-[#765d58]">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando temas...
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: "#e8cfc5" }}>
            <h2 className="font-serif text-3xl">Não conseguimos carregar o catálogo agora.</h2>
            <p className="mt-3 text-sm text-[#765d58]">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl">Temas disponíveis</h2>
                <p className="mt-1 text-sm text-[#765d58]">
                  {filtered.length} {filtered.length === 1 ? "tema encontrado" : "temas encontrados"}
                </p>
              </div>
              <button
                onClick={() => {
                  setQuery("");
                  setModality("Todos");
                }}
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                Limpar filtros
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-3xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: "#e8cfc5" }}>
                <Sparkles className="mx-auto h-7 w-7" style={{ color: rosa }} />
                <h3 className="mt-3 font-serif text-3xl">Não encontrou seu tema?</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-[#765d58]">
                  A LHL também trabalha com temas personalizados. Conte para a gente o que você imaginou.
                </p>
                <Link to="/orcamento" search={{ tipoSolicitacao: "tema-personalizado" } as never} className="mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white" style={{ background: vinho }}>
                  Solicitar tema personalizado
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((theme) => (
                  <article key={theme.id} className="group overflow-hidden rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: "#ead4cb" }}>
                    <button type="button" onClick={() => setSelected(theme)} className="block w-full text-left">
                      <div className="aspect-square overflow-hidden rounded-xl bg-[#f5e8e2]">
                        <img
                          src={theme.images[0]?.thumbnailUrl || theme.images[0]?.url}
                          alt={theme.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="px-1 pb-1 pt-3 text-center">
                        <h3 className="min-h-[2.5rem] font-serif text-lg font-semibold leading-tight">{theme.name}</h3>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-[#8d716c]">{theme.modalities.join(" · ")}</p>
                        {theme.images.length > 1 && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: rosa }}>
                            <Images className="h-3.5 w-3.5" /> {theme.images.length} opções
                          </span>
                        )}
                      </div>
                    </button>
                    <button onClick={() => setSelected(theme)} className="mt-3 w-full rounded-full px-3 py-2 text-xs font-semibold text-white" style={{ background: vinho }}>
                      {theme.images.length > 1 ? "Ver opções" : "Ver tema"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selected && <ThemeModal theme={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ThemeModal({ theme, onClose }: { theme: CatalogTheme; onClose: () => void }) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomIndex !== null) setZoomIndex(null);
        else onClose();
      }
      if (zoomIndex !== null && e.key === "ArrowRight") setZoomIndex((zoomIndex + 1) % theme.images.length);
      if (zoomIndex !== null && e.key === "ArrowLeft") setZoomIndex((zoomIndex - 1 + theme.images.length) % theme.images.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomIndex, theme.images.length, onClose]);

  const current = zoomIndex !== null ? theme.images[zoomIndex] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 sm:p-8" onClick={onClose}>
      <div className="relative mx-auto w-full max-w-6xl rounded-3xl bg-[#fffaf4] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <div className="pr-12">
          <h2 className="font-serif text-3xl sm:text-4xl" style={{ color: vinho }}>{theme.name}</h2>
          <p className="mt-1 text-sm text-[#765d58]">Escolha a arte que mais gostar.</p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {theme.images.map((image, index) => (
            <article key={`${image.url}-${index}`} className="rounded-2xl border bg-white p-3 shadow-sm" style={{ borderColor: "#ead4cb" }}>
              <button onClick={() => setZoomIndex(index)} className="block aspect-square w-full overflow-hidden rounded-xl bg-[#f5e8e2]">
                <img src={image.thumbnailUrl || image.url} alt={`${theme.name} - opção ${index + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </button>
              <div className="mt-3 text-center">
                <div className="font-semibold" style={{ color: vinho }}>Opção {index + 1}</div>
                <div className="mt-1 text-xs text-[#8d716c]">{image.modality}</div>
                <a href={buildBudgetUrl(theme, image)} className="mt-3 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: vinho }}>
                  Escolher este tema
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      {current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomIndex(null)}>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white" onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex! - 1 + theme.images.length) % theme.images.length); }}>
            <ChevronLeft />
          </button>
          <img src={current.url} alt={theme.name} className="max-h-[84vh] max-w-[88vw] rounded-xl object-contain" referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white" onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex! + 1) % theme.images.length); }}>
            <ChevronRight />
          </button>
          <button className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" onClick={() => setZoomIndex(null)}><X /></button>
          <a href={buildBudgetUrl(theme, current)} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl" style={{ background: vinho }} onClick={(e) => e.stopPropagation()}>
            Escolher este tema
          </a>
        </div>
      )}
    </div>
  );
}
