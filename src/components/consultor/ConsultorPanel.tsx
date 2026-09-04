import { useEffect, useMemo, useRef, useState } from "react";
import { X, ArrowLeft, Send, Sparkles, Search, MapPin, Cake, Home, Truck, Wallet, ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import consultoraAsset from "@/assets/lhl/consultor/consultora-lhl.png";
import { WHATSAPP_NUMBER } from "@/lib/orders-storage";
import { appendCampaignParams } from "@/lib/campaign-params";
import { INITIAL_STATE, loadState, progressRatio, saveState, clearState } from "@/lib/consultor/state";
import { pushConsultorEvent } from "@/lib/consultor/analytics";
import { loadCatalogArts, searchArts, type ThemeSearchResult, type CatalogSource } from "@/lib/consultor/catalog";
import type { CatalogArt } from "@/lib/consultor/types";
import { getKitById, getKitsByModalidade, MODALIDADE_LABELS, type OfficialKit } from "@/lib/consultor/kits";
import { MODALIDADES } from "@/data/kits";
import { buildWhatsappUrl, submitConsultorLead } from "@/lib/consultor/whatsapp";
import type { ConsultorState, Modality, StepId, VenueType } from "@/lib/consultor/types";
import { MODALITY_LABELS } from "@/lib/consultor/types";

type Props = { onClose: () => void };

const ACK_MESSAGES = [
  "Perfeito!",
  "Excelente!",
  "Ótima escolha!",
  "Que legal!",
  "Anotado!",
];
function ack(seed: number): string {
  return ACK_MESSAGES[Math.abs(seed) % ACK_MESSAGES.length];
}

export default function ConsultorPanel({ onClose }: Props) {
  const [state, setState] = useState<ConsultorState>(() => loadState());
  const [transitioning, setTransitioning] = useState(false);
  const [catalogArts, setCatalogArts] = useState<CatalogArt[] | null>(null);
  const [catalogSource, setCatalogSource] = useState<CatalogSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persistência automática
  useEffect(() => { saveState(state); }, [state]);

  // Carrega catálogo oficial em runtime (com fallback silencioso).
  // Roda apenas quando o painel abre — Home não é impactada.
  useEffect(() => {
    let cancelled = false;
    loadCatalogArts().then(({ arts, source }) => {
      if (cancelled) return;
      setCatalogArts(arts);
      setCatalogSource(source);
      // `source` é apenas identificação técnica — nunca exibida ao cliente.
      pushConsultorEvent("consultor_festas_catalog_loaded", {
        source, count: arts.length,
      });
    });
    return () => { cancelled = true; };
  }, []);

  // ESC fecha o painel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trava scroll do body enquanto aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goTo = (next: StepId, patch: Partial<ConsultorState["answers"]> = {}) => {
    setTransitioning(true);
    setTimeout(() => {
      setState((s) => ({
        step: next,
        history: [...s.history, s.step],
        answers: { ...s.answers, ...patch },
      }));
      setTransitioning(false);
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 180);
  };

  const goBack = () => {
    setState((s) => {
      if (!s.history.length) return s;
      const prev = s.history[s.history.length - 1];
      return { ...s, step: prev, history: s.history.slice(0, -1) };
    });
  };

  const restart = () => {
    clearState();
    setState(INITIAL_STATE);
  };

  const progress = progressRatio(state.step);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Consultor de Festas LHL"
      className="fixed inset-0 z-[60] flex items-stretch justify-end bg-black/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#fff8f5] via-white to-[#fdf4ee] shadow-2xl sm:h-auto sm:max-h-[95vh] sm:my-auto sm:mr-4 sm:w-[460px] sm:rounded-3xl animate-[slide-in-right_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-primary/10 bg-white/85 px-4 py-3 backdrop-blur-md">
          <img
            src={consultoraAsset}
            alt=""
            aria-hidden="true"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Consultora de Festas</div>
            <div className="text-xs text-muted-foreground">LHL Festas · atendimento personalizado</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        {state.step !== "welcome" ? (
          <div className="px-4 pt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-amber-400 transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Body */}
        <div className={`flex-1 px-4 py-5 transition-opacity duration-200 ${transitioning ? "opacity-0" : "opacity-100"}`}>
          <StepRenderer state={state} catalogArts={catalogArts} catalogSource={catalogSource} onAnswer={goTo} onBack={goBack} onRestart={restart} onClose={onClose} />
        </div>

        {/* Rodapé discreto */}
        <div className="border-t border-primary/10 bg-white/60 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
          Você também pode{" "}
          <a href="/orcamento" className="underline underline-offset-2 hover:text-foreground">solicitar orçamento</a>{" "}
          ou{" "}
          <a
            href={appendCampaignParams(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero fazer uma festa com a LHL Festas.")}`)}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >falar no WhatsApp</a>{" "}
          a qualquer momento.
        </div>
      </div>
    </div>
  );
}

// ---------- Step router ----------

function StepRenderer({
  state, catalogArts, catalogSource, onAnswer, onBack, onRestart, onClose,
}: {
  state: ConsultorState;
  catalogArts: CatalogArt[] | null;
  catalogSource: CatalogSource | null;
  onAnswer: (next: StepId, patch?: Partial<ConsultorState["answers"]>) => void;
  onBack: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const showBack = state.history.length > 0 && state.step !== "welcome" && state.step !== "summary";
  const seed = state.history.length;

  return (
    <div className="space-y-4">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
      ) : null}

      {state.step === "welcome" && <StepWelcome onNext={() => onAnswer("name")} />}
      {state.step === "name" && <StepName value={state.answers.name} onNext={(name) => onAnswer("date", { name })} />}
      {state.step === "date" && <StepDate seed={seed} name={state.answers.name} onNext={(date, skipped) => onAnswer("city", { date, dateSkipped: skipped })} />}
      {state.step === "city" && <StepCity seed={seed} value={state.answers.city} onNext={(city) => onAnswer("age", { city })} />}
      {state.step === "age" && <StepAge seed={seed} value={state.answers.age} onNext={(age) => onAnswer("venue", { age })} />}
      {state.step === "venue" && <StepVenue seed={seed} onNext={(venue) => onAnswer("modality", { venue })} />}
      {state.step === "modality" && <StepModality seed={seed} onNext={(modality) => onAnswer("theme", { modality })} />}
      {state.step === "theme" && <StepTheme seed={seed} arts={catalogArts} source={catalogSource} onNext={(patch) => onAnswer("kits", patch)} />}
      {state.step === "kits" && <StepKits state={state} onNext={(patch) => onAnswer("photo", patch)} />}
      {state.step === "photo" && <StepPhoto seed={seed} onNext={(hasReferencePhoto) => onAnswer("summary", { hasReferencePhoto })} />}
      {state.step === "summary" && <StepSummary state={state} onRestart={onRestart} onClose={onClose} />}
    </div>
  );
}

// ---------- Steps ----------

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <img src={consultoraAsset} alt="" aria-hidden className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-primary/20" />
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  const handleStart = () => {
    pushConsultorEvent("consultor_festas_started");
    onNext();
  };
  return (
    <div className="space-y-5 pt-2">
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" /> Atendimento personalizado
        </div>
        <h2 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Vamos encontrar a decoração perfeita para sua festa?
        </h2>
      </div>
      <Bubble>
        <p>👋 Olá! Sou a <strong>Consultora de Festas da LHL Festas</strong>.</p>
        <p className="mt-2">Se você ainda não sabe qual decoração escolher, eu posso ajudar. Em menos de um minuto vou conhecer um pouco da sua festa e indicar opções que combinam com o seu evento.</p>
        <p className="mt-2">Depois disso você poderá continuar pelo WhatsApp com todas as informações já organizadas. ✨</p>
      </Bubble>
      <Button onClick={handleStart} size="lg" className="w-full gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        🎈 Encontrar minha decoração
      </Button>
    </div>
  );
}

function StepName({ value, onNext }: { value?: string; onNext: (name: string) => void }) {
  const [v, setV] = useState(value || "");
  const ok = v.trim().length >= 2;
  return (
    <div className="space-y-3">
      <Bubble>Antes de começar, como você gostaria de ser chamada(o)? 😊</Bubble>
      <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Seu nome" maxLength={60} onKeyDown={(e) => e.key === "Enter" && ok && onNext(v.trim())} />
      <Button disabled={!ok} onClick={() => onNext(v.trim())} className="w-full rounded-full">Continuar</Button>
    </div>
  );
}

function StepDate({ seed, name, onNext }: { seed: number; name?: string; onNext: (date: string, skipped: boolean) => void }) {
  const [v, setV] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <Bubble>Prazer em conhecer você{name ? `, ${name}` : ""}! 💕 Quando será realizada a festa?</Bubble>
      <Input type="date" min={today} value={v} onChange={(e) => setV(e.target.value)} />
      <Button disabled={!v} onClick={() => onNext(v, false)} className="w-full rounded-full">Continuar com essa data</Button>
      <button type="button" onClick={() => onNext("", true)} className="w-full rounded-full border border-dashed border-primary/30 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-primary/5">
        Ainda não defini
      </button>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Muitas pessoas escolhem a decoração primeiro.</p>
    </div>
  );
}

function StepCity({ seed, value, onNext }: { seed: number; value?: string; onNext: (city: string) => void }) {
  const [v, setV] = useState(value || "");
  const ok = v.trim().length >= 2;
  return (
    <div className="space-y-3">
      <Bubble><MapPin className="mr-1 inline h-4 w-4" /> Em qual cidade será realizada sua festa?</Bubble>
      <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Ex.: São Paulo" maxLength={80} onKeyDown={(e) => e.key === "Enter" && ok && onNext(v.trim())} />
      <Button disabled={!ok} onClick={() => onNext(v.trim())} className="w-full rounded-full">Continuar</Button>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Assim consideramos a região do atendimento.</p>
    </div>
  );
}

function StepTheme({ seed, arts, source, onNext }: { seed: number; arts: CatalogArt[] | null; source: CatalogSource | null; onNext: (patch: Partial<ConsultorState["answers"]>) => void }) {
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "searching" | "found" | "empty">("idle");
  const [results, setResults] = useState<ThemeSearchResult[]>([]);

  const doSearch = () => {
    if (!q.trim()) return;
    setSearched(true);
    setPhase("searching");
    setTimeout(() => {
      // Pesquisa exclusivamente nos registros reais do catálogo carregado.
      const r = arts && arts.length ? searchArts(q.trim(), arts) : [];
      setResults(r);
      pushConsultorEvent("consultor_festas_theme_selected", { theme_query: q.trim() });
      if (r.length > 0) {
        pushConsultorEvent("consultor_festas_catalog_match", {
          theme_query: q.trim(), results: r.length, source: source || "unknown",
        });
        setPhase("found");
      } else {
        setPhase("empty");
      }
    }, 650);
  };

  const chooseArt = (r: ThemeSearchResult) => {
    onNext({
      theme: r.art.name,
      themeId: r.art.id,
      themeImageUrl: r.art.imageUrl,
      themeModality: r.art.modality,
      themeIsCustom: false,
    });
  };

  const chooseCustom = () => {
    pushConsultorEvent("consultor_festas_custom_theme", { theme_query: q.trim() });
    onNext({ theme: q.trim() || "Tema personalizado", themeIsCustom: true, themeId: "custom" });
  };

  return (
    <div className="space-y-3">
      <Bubble>Qual será o tema da festa? Pode digitar do jeitinho que preferir 💕</Bubble>
      <div className="flex gap-2">
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Homem-Aranha, Hello Kitty, Stitch..." onKeyDown={(e) => e.key === "Enter" && doSearch()} maxLength={80} />
        <Button onClick={doSearch} disabled={!q.trim() || phase === "searching"} className="rounded-full" size="icon" aria-label="Pesquisar tema">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {phase === "searching" ? (
        <div className="space-y-1.5 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <p className="animate-pulse text-foreground">🔎 Procurando esse tema em nosso catálogo...</p>
          <p className="text-xs text-muted-foreground">Conferindo as artes disponíveis.</p>
        </div>
      ) : null}

      {phase === "found" ? (
        <>
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            ✔ Encontramos {results.length === 1 ? "1 arte" : `${results.length} artes`}. Escolha a que mais combina com sua festa:
          </div>
          <div className="grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3">
            {results.map((r) => (
              <button
                key={r.art.id}
                type="button"
                onClick={() => chooseArt(r)}
                className="group relative overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition-transform hover:scale-[1.02] hover:shadow-md"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                  {r.art.thumbnailUrl ? (
                    <img src={r.art.thumbnailUrl} alt={r.art.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : null}
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-semibold leading-tight text-foreground">{r.art.name}</div>
                  {r.art.modality ? <div className="text-[10px] text-muted-foreground">{r.art.modality}</div> : null}
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">Quero esta arte</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}


      {phase === "empty" ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-foreground">Ainda não encontramos esse tema no catálogo.</p>
          <p className="text-sm text-muted-foreground">Você pode tentar outra forma de escrever ou solicitar um tema personalizado 💕.</p>
          <div className="flex gap-2">
            <Button onClick={chooseCustom} className="flex-1 rounded-full">✨ Tema personalizado</Button>
            <Button variant="outline" onClick={() => { setSearched(false); setPhase("idle"); setQ(""); }} className="flex-1 rounded-full">🔄 Tentar outra escrita</Button>
          </div>
        </div>
      ) : null}

      {!searched ? <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Pode escrever com plural, singular ou até com pequenos erros — eu entendo. 😉</p> : null}
    </div>
  );
}

function StepAge({ seed, value, onNext }: { seed: number; value?: string; onNext: (age: string) => void }) {
  const [v, setV] = useState(value || "");
  const n = Number(v);
  const ok = Number.isFinite(n) && n > 0 && n < 130;
  return (
    <div className="space-y-3">
      <Bubble><Cake className="mr-1 inline h-4 w-4" /> Qual será a idade do(a) aniversariante?</Bubble>
      <Input autoFocus type="number" min={0} max={129} value={v} onChange={(e) => setV(e.target.value)} placeholder="Ex.: 5" onKeyDown={(e) => e.key === "Enter" && ok && onNext(v)} />
      <Button disabled={!ok} onClick={() => onNext(v)} className="w-full rounded-full">Continuar</Button>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Essa informação ajuda muito na escolha.</p>
    </div>
  );
}

const VENUES: VenueType[] = ["Casa", "Salão", "Condomínio", "Escola", "Buffet", "Chácara", "Outro"];

function StepVenue({ seed, onNext }: { seed: number; onNext: (venue: VenueType) => void }) {
  return (
    <div className="space-y-3">
      <Bubble><Home className="mr-1 inline h-4 w-4" /> Onde será realizada a festa?</Bubble>
      <div className="grid grid-cols-2 gap-2">
        {VENUES.map((v) => (
          <button key={v} type="button" onClick={() => onNext(v)} className="rounded-2xl border border-primary/15 bg-white px-3 py-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5">
            {v}
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Isso influencia bastante na decoração ideal.</p>
    </div>
  );
}

function StepModality({ seed, onNext }: { seed: number; onNext: (m: Modality) => void }) {
  const opts: { id: Modality; label: string; desc: string }[] = [
    { id: "festa-na-mesa", label: MODALITY_LABELS["festa-na-mesa"], desc: "Decoração compacta e encantadora para a mesa principal." },
    { id: "peg-monte", label: MODALITY_LABELS["peg-monte"], desc: "Você retira a decoração completa, monta e devolve." },
    { id: "nao-sei", label: MODALITY_LABELS["nao-sei"], desc: "Quero ver as duas opções antes de decidir." },
  ];
  return (
    <div className="space-y-3">
      <Bubble><Truck className="mr-1 inline h-4 w-4" /> Qual modalidade você procura?</Bubble>
      <div className="space-y-2">
        {opts.map((o) => (
          <button key={o.id} type="button" onClick={() => onNext(o.id)} className="w-full rounded-2xl border border-primary/15 bg-white p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5">
            <div className="text-sm font-semibold text-foreground">{o.label}</div>
            <div className="text-xs text-muted-foreground">{o.desc}</div>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)}</p>
    </div>
  );
}

// ---------- Kits (somente texto, sem recomendação automática) ----------

function KitCard({
  kit, chosen, choices, onChoice, onPick,
}: {
  kit: OfficialKit;
  chosen: boolean;
  choices: Record<string, string>;
  onChoice: (escolhaId: string, opcao: string) => void;
  onPick: () => void;
}) {
  const pendentes = (kit.escolhas || []).filter((e) => !choices[e.id]);
  return (
    <div className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${chosen ? "ring-primary/50" : "ring-black/5"}`}>
      <div className="text-sm font-semibold uppercase tracking-wide text-foreground">{kit.nome}</div>
      <div className="mt-1 text-xs text-muted-foreground">{kit.descricao}</div>
      <div className="mt-2 text-[11px] font-medium text-foreground">Itens inclusos:</div>
      <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        {kit.itens.map((it) => <li key={it}>• {it}</li>)}
      </ul>

      {(kit.escolhas || []).map((e) => (
        <div key={e.id} className="mt-3">
          <div className="text-[11px] font-medium text-foreground">{e.label} — escolha uma opção:</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {e.opcoes.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChoice(e.id, op)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  choices[e.id] === op
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/20 bg-white text-foreground hover:bg-primary/5"
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={onPick} disabled={pendentes.length > 0} className="mt-3 w-full rounded-full">
        {pendentes.length > 0 ? "Escolha as opções acima" : "Quero este kit"}
      </Button>
    </div>
  );
}

function StepKits({ state, onNext }: { state: ConsultorState; onNext: (patch: Partial<ConsultorState["answers"]>) => void }) {
  const [choices, setChoices] = useState<Record<string, string>>(state.answers.kitChoices || {});
  const modality = state.answers.modality;

  const grupos = useMemo(() => {
    if (modality === "festa-na-mesa" || modality === "peg-monte") {
      return [{ id: modality, label: MODALIDADE_LABELS[modality], kits: getKitsByModalidade(modality) }];
    }
    return MODALIDADES.map((m) => ({
      id: m.id,
      label: m.label,
      kits: getKitsByModalidade(m.id),
    }));
  }, [modality]);

  const pick = (kit: OfficialKit) => {
    const kitChoices: Record<string, string> = {};
    for (const e of kit.escolhas || []) {
      if (choices[e.id]) kitChoices[e.id] = choices[e.id];
    }
    pushConsultorEvent("consultor_festas_kit_selected", { kit_id: kit.id, kit_name: kit.nome });
    onNext({
      chosenKitId: kit.id,
      kitUndecided: false,
      kitChoices,
      modality: kit.modalidade,
    });
  };

  const skip = () => {
    pushConsultorEvent("consultor_festas_kit_undecided");
    onNext({ chosenKitId: undefined, kitUndecided: true, kitChoices: {} });
  };

  return (
    <div className="space-y-4">
      <Bubble>
        Estes são os kits oficiais da LHL Festas. Toque em um para escolher — sem pressa 💕
      </Bubble>

      {grupos.map((g) => (
        <div key={g.id} className="space-y-2">
          <div className="rounded-full bg-primary/10 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-primary">
            {g.label}
          </div>
          {g.kits.map((k) => (
            <KitCard
              key={k.id}
              kit={k}
              chosen={state.answers.chosenKitId === k.id}
              choices={choices}
              onChoice={(eid, op) => setChoices((c) => ({ ...c, [eid]: op }))}
              onPick={() => pick(k)}
            />
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={skip}
        className="w-full rounded-2xl border border-dashed border-primary/30 py-3 text-sm text-muted-foreground transition-colors hover:bg-primary/5"
      >
        Ainda não sei qual kit escolher
      </button>
    </div>
  );
}


function StepPhoto({ seed, onNext }: { seed: number; onNext: (hasPhoto: boolean) => void }) {
  return (
    <div className="space-y-3">
      <Bubble><ImageIcon className="mr-1 inline h-4 w-4" /> Você possui alguma foto de referência da decoração que deseja?</Bubble>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onNext(true)} className="rounded-2xl border border-primary/15 bg-white p-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5">
          Sim, tenho uma foto 📸
        </button>
        <button type="button" onClick={() => onNext(false)} className="rounded-2xl border border-primary/15 bg-white p-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5">
          Não tenho
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{ack(seed)} Se tiver, você poderá enviar direto no WhatsApp.</p>
    </div>
  );
}

function StepSummary({ state, onRestart, onClose }: { state: ConsultorState; onRestart: () => void; onClose: () => void }) {
  const [preparing, setPreparing] = useState(true);
  const [waUrl, setWaUrl] = useState<string>("");
  const a = state.answers;
  const kit = useMemo(() => getKitById(a.chosenKitId), [a.chosenKitId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      pushConsultorEvent("consultor_festas_completed");
      const url = buildWhatsappUrl(state);
      setWaUrl(url);
      // registra lead em segundo plano; se falhar, seguimos assim mesmo.
      const res = await submitConsultorLead(state);
      if (!cancelled && res.ok) {
        pushConsultorEvent("consultor_festas_lead", { lead_id: res.id });
      }
      setTimeout(() => { if (!cancelled) setPreparing(false); }, 1200);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goWhatsapp = () => {
    pushConsultorEvent("consultor_festas_whatsapp_clicked");
    if (waUrl) window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  if (preparing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm font-medium text-foreground">✨ Aguarde um instante...</p>
        <p className="text-xs text-muted-foreground">Estou organizando todas as informações da sua festa.</p>
      </div>
    );
  }

  const rows: Array<[string, string]> = [
    ["📅 Data", a.dateSkipped ? "Ainda a definir" : (a.date || "-")],
    ["📍 Cidade", a.city || "-"],
    ["🎂 Tema", (a.theme || "-") + (a.themeIsCustom ? " (personalizado)" : "")],
    ["🎈 Idade", a.age || "-"],
    ["🏠 Local", a.venue || "-"],
    ["🚚 Modalidade", a.modality ? MODALITY_LABELS[a.modality] : "-"],
    ["🎁 Kit", kit ? kit.nome : "A definir com a equipe"],
    ["📷 Foto de referência", a.hasReferencePhoto ? "Sim" : "Não"],
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-5 w-5" /></div>
        <h3 className="font-serif text-xl text-foreground">🎉 Tudo pronto{a.name ? `, ${a.name}` : ""}!</h3>
        <p className="mt-1 text-xs text-muted-foreground">Este é o resumo que será enviado à nossa equipe:</p>
      </div>

      {/* Preview visual: tema escolhido */}
      {a.themeImageUrl ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
            <img src={a.themeImageUrl} alt={a.theme || "Tema"} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tema escolhido</div>
            <div className="text-sm font-semibold text-foreground">{a.theme}{a.themeIsCustom ? " (personalizado)" : ""}</div>
            {a.themeModality ? <div className="text-[11px] text-muted-foreground">Arte disponível em: {a.themeModality}</div> : null}
          </div>
        </div>
      ) : null}

      {kit ? (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kit escolhido</div>
          <div className="text-sm font-semibold text-foreground">{kit.nome}</div>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
            {kit.itens.map((it) => <li key={it}>• {it}</li>)}
          </ul>
          {(kit.escolhas || []).some((e) => a.kitChoices?.[e.id]) ? (
            <div className="mt-2 border-t border-primary/10 pt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Escolhas do kit</div>
              <ul className="mt-1 space-y-0.5 text-[11px] text-foreground">
                {(kit.escolhas || []).map((e) =>
                  a.kitChoices?.[e.id] ? <li key={e.id}>• {e.label}: {a.kitChoices[e.id]}</li> : null,
                )}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-primary/5 p-3 text-xs text-foreground">
          Você ainda não escolheu um kit — nossa equipe vai te ajudar a encontrar o ideal 💕
        </p>
      )}


      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <dl className="divide-y divide-primary/10 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-right text-sm font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="rounded-2xl bg-primary/5 p-3 text-center text-xs text-foreground">
        Nossa equipe vai analisar essas informações, verificar a disponibilidade da data e preparar um orçamento personalizado para você.
      </p>

      <Button onClick={goWhatsapp} size="lg" className="w-full gap-2 rounded-full bg-[#25D366] text-white hover:bg-[#1ebe57]">
        <Send className="h-4 w-4" /> Continuar no WhatsApp
      </Button>
      <button type="button" onClick={onRestart} className="w-full rounded-full py-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        ✏️ Alterar respostas
      </button>
    </div>
  );
}
