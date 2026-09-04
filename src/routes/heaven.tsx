import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Menu,
  NotebookPen,
  PackageCheck,
  Repeat,
  Sparkles,
  Table2,
  Wallet,
  X,
} from "lucide-react";
import {
  Card,
  Eyebrow,
  Flow,
  Lead,
  Reveal,
  Screenshot,
  Section,
  Title,
} from "@/components/heaven/heaven-ui";
import { HeavenForm } from "@/components/heaven/heaven-form";
import producaoCentralAsset from "@/assets/producao-central.png.asset.json";
import leadsCentralAsset from "@/assets/leads-central.png.asset.json";
import opIndividualAsset from "@/assets/op-individual.png.asset.json";
import financeiroCentralAsset from "@/assets/financeiro-central.png.asset.json";
import painelOperacionalAsset from "@/assets/painel-operacional.png.asset.json";
import loginAcessoAsset from "@/assets/login-acesso.png.asset.json";

const CANONICAL = "https://lhl-festas.lovable.app/heaven";
const TITLE = "Heaven Festas | Gestão para quem trabalha com festas";
const DESCRIPTION =
  "Organize contratos, agenda, compras, produção, financeiro e toda a operação da sua empresa de festas em um só lugar.";

export const Route = createFileRoute("/heaven")({
  component: HeavenPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Heaven Festas — Da reserva à devolução. Tudo em um só lugar." },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Heaven Festas" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Heaven Festas — Plataforma de Gestão para Festas" },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Heaven Festas",
          applicationCategory: "BusinessApplication",
          description: DESCRIPTION,
          url: CANONICAL,
        }),
      },
    ],
  }),
});

const CHIPS = ["Contratos", "Agenda", "Compras", "Produção", "Financeiro", "Conferência"];

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#historia", label: "Nossa história" },
  { href: "#quero-testar", label: "Quero testar" },
];

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate">Heaven Festas</span>
        </a>
        <nav aria-label="Principal" className="ml-auto hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-muted-foreground hover:text-foreground">
              {n.label}
            </a>
          ))}
          <a
            href="#quero-testar"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            QUERO TESTAR
          </a>
        </nav>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl border border-border md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <nav aria-label="Principal (móvel)" className="border-t border-border bg-background px-5 pb-4 md:hidden">
          <ul className="grid gap-1 py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-medium hover:bg-muted"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#quero-testar"
            onClick={() => setOpen(false)}
            className="block rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground"
          >
            QUERO TESTAR
          </a>
        </nav>
      ) : null}
    </header>
  );
}

function Hero() {
  return (
    <Section id="top" className="pt-10 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Reveal>
            <Eyebrow>Plataforma Heaven Festas</Eyebrow>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Da reserva à devolução.
              <br />
              <span className="text-primary">Tudo em um só lugar.</span>
            </h1>
            <Lead>
              Uma plataforma de gestão pensada para quem trabalha com festas. Organize seus pedidos,
              acompanhe sua operação e saiba o que precisa ser feito todos os dias.
            </Lead>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Criado por decoradores, para quem vive de festas.
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              Desenvolvido a partir das necessidades reais de uma operação de decoração de festas.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ul className="mt-6 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80"
                >
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#como-funciona"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                QUERO CONHECER
              </a>
              <a
                href="#quero-testar"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-base font-semibold hover:bg-muted"
              >
                Quero participar do teste
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={180}>
          <Screenshot
            src={painelOperacionalAsset.url}
            alt="Dashboard Operacional da Heaven Festas"
            device="desktop"
          />
        </Reveal>
      </div>
    </Section>
  );
}

const DORES = [
  { icon: Sparkles, t: "WhatsApp", d: "Clientes e conversas." },
  { icon: CalendarDays, t: "Agenda", d: "Datas e compromissos." },
  { icon: BookOpen, t: "Caderno", d: "Lista do que precisa fazer." },
  { icon: Table2, t: "Planilha", d: "Valores e pagamentos." },
  { icon: NotebookPen, t: "Bloco de notas", d: "Compras e produção." },
  { icon: Clock, t: "E a cabeça...", d: "Tudo aquilo que não pode esquecer." },
];

const BENEFICIOS = [
  { t: "Menos retrabalho", d: "Evite cadastrar a mesma informação várias vezes." },
  { t: "Mais organização", d: "Centralize o andamento dos pedidos." },
  { t: "Mais previsibilidade", d: "Veja o que vem pela frente." },
  { t: "Menos esquecimentos", d: "Receba alertas sobre pendências." },
  { t: "Mais controle", d: "Acompanhe cada etapa." },
  { t: "Mais tempo", d: "Gaste menos energia procurando informações." },
];

const MODALIDADES = [
  "Peg & Monte",
  "Festa na Mesa",
  "Decoração",
  "Personalizados",
  "Locação de peças",
  "Produção própria",
];

const HISTORIA_FESTA = [
  "Contrato criado",
  "Festa entra no calendário",
  "Materiais são planejados",
  "Compras seguem para orçamento/aprovação",
  "Personalizados entram em produção",
  "Kit é separado",
  "Pedido é conferido",
  "Cliente retira",
  "Kit retorna",
  "Pedido concluído",
];

const ALERTAS = [
  "Compra atrasada",
  "Produção pendente",
  "Retirada próxima",
  "Devolução atrasada",
  "Pagamento pendente",
];

function HeavenPage() {
  return (
    <div className="heaven-theme min-h-screen">
      <Header />
      <main>
        <Hero />

        {/* A DOR */}
        <Section tone="muted">
          <Reveal>
            <Title>Quantos lugares você usa para organizar uma única festa?</Title>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DORES.map((d, i) => (
              <Reveal key={d.t} delay={i * 60}>
                <Card>
                  <d.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 font-semibold">{d.t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d.d}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
              <p className="text-lg font-semibold sm:text-2xl">E se tudo isso conversasse entre si?</p>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Foi a partir dessa pergunta que começamos a construir a Heaven Festas.
              </p>
            </div>
          </Reveal>
        </Section>

        {/* SOLUÇÃO / FLUXO */}
        <Section id="como-funciona">
          <Reveal>
            <Eyebrow>Como funciona</Eyebrow>
            <Title>Uma festa. Um pedido. Um fluxo.</Title>
            <Lead>
              As informações acompanham o pedido durante toda a operação, reduzindo cadastros
              repetidos e ajudando a equipe a saber o que ainda precisa ser feito.
            </Lead>
          </Reveal>
          <div className="mt-10">
            <Flow
              steps={[
                "Cliente",
                "Contrato",
                "Planejamento",
                ["Compras", "Produção"],
                "Separação",
                "Conferência",
                "Retirada",
                "Devolução",
                "Pedido concluído",
              ]}
            />
          </div>
        </Section>

        {/* DASHBOARD */}
        <Section id="recursos" tone="muted">
          <Reveal>
            <Eyebrow>Recursos</Eyebrow>
            <Title>Comece o dia sabendo exatamente o que precisa fazer.</Title>
            <Lead>
              Em vez de procurar pendências em vários lugares, o Dashboard organiza as prioridades da
              operação em uma única tela.
            </Lead>
          </Reveal>
          <div className="mt-8">
            <Reveal>
              <Screenshot
                src={painelOperacionalAsset.url}
                alt="Dashboard Operacional com calendário e prioridades"
                title="Dashboard Operacional"
                description="Calendário, “Faça isso primeiro”, avisos, retiradas, compras liberadas, produções pendentes, separações, conferências e pedidos prontos."
                highlights={[
                  "Calendário",
                  "Faça isso primeiro",
                  "Avisos",
                  "Retiradas",
                  "Compras liberadas",
                  "Produções pendentes",
                  "Separações",
                  "Conferências",
                  "Pedidos prontos",
                ]}
              />
            </Reveal>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "O que precisa ser feito agora?",
              "Qual festa está mais próxima?",
              "O que está atrasado?",
              "O que já está pronto?",
            ].map((q, i) => (
              <Reveal key={q} delay={i * 60}>
                <Card className="text-sm font-medium">{q}</Card>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* CALENDÁRIO */}
        <Section>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Calendário operacional</Eyebrow>
              <Title>Sua agenda deixa de ser apenas uma agenda.</Title>
              <Lead>
                Visualize festas, retiradas, devoluções e a situação operacional dos pedidos
                diretamente no calendário.
              </Lead>
              <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
                {[
                  "Próximos eventos",
                  "Urgências",
                  "Pedidos concluídos",
                  "Pedidos com pendências",
                  "Retiradas próximas",
                ].map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {i}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <Screenshot
                src={producaoCentralAsset.url}
                alt="Calendário operacional da plataforma"
              />
            </Reveal>
          </div>
        </Section>

        {/* CONTRATOS */}
        <Section tone="muted">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal delay={100} className="order-2 lg:order-1">
              <Screenshot
                src={leadsCentralAsset.url}
                alt="Tela de leads da plataforma"
              />
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <Eyebrow>Novos Leads</Eyebrow>
              <Title>Tudo começa organizado.</Title>
              <Lead>Do primeiro contato até a festa, a jornada comercial acontece em um único lugar.</Lead>
              <ul className="mt-6 flex flex-wrap gap-2">
                {["Cliente", "Telefone", "Tema", "Modalidade", "Kit", "Data da festa", "Retirada", "Devolução", "Valor", "Sinal", "Saldo", "Caução"].map(
                  (i) => (
                    <li key={i} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
                      {i}
                    </li>
                  ),
                )}
              </ul>
            </Reveal>
          </div>
        </Section>

        {/* PLANEJAMENTO */}
        <Section>
          <Reveal>
            <Eyebrow>Planejamento da festa</Eyebrow>
            <Title>Já sabe que vai precisar? Registre na hora.</Title>
            <Lead>
              Durante o planejamento do pedido, registre os materiais que precisarão ser comprados e
              tudo aquilo que precisará ser produzido.
            </Lead>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Reveal>
              <Card>
                <p className="flex items-center gap-2 font-semibold">
                  <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" /> Itens a Comprar
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {["Balões", "Papel", "Tecido", "Cola"].map((i) => (
                    <li key={i} className="rounded-lg bg-muted px-3 py-2">{i}</li>
                  ))}
                </ul>
              </Card>
            </Reveal>
            <Reveal delay={80}>
              <Card>
                <p className="flex items-center gap-2 font-semibold">
                  <PackageCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Itens a Produzir
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {["Painel", "Display", "Topo", "Adesivo", "Caixa personalizada"].map((i) => (
                    <li key={i} className="rounded-lg bg-muted px-3 py-2">{i}</li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <p className="mt-6 text-sm text-muted-foreground">
              Ao salvar, essas informações seguem para o fluxo operacional do pedido.
            </p>
          </Reveal>
        </Section>

        {/* COMPRAS */}
        <Section tone="muted">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Compras</Eyebrow>
              <Title>Da necessidade à compra, sem perder o controle.</Title>
              <Lead>
                Acompanhe o que precisa ser orçado, o que aguarda autorização e quais compras já
                estão liberadas.
              </Lead>
              <div className="mt-8">
                <Flow
                  steps={[
                    "Aguardando orçamento",
                    "Aguardando autorização",
                    "Compra autorizada",
                    "Compra realizada",
                    "Pago",
                  ]}
                />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Screenshot
                src={opIndividualAsset.url}
                alt="Fluxo de compras na Ordem de Produção"
                device="mobile"
              />
            </Reveal>
          </div>
        </Section>

        {/* APROVAÇÃO DE COMPRAS */}
        <Section>
          <Reveal>
            <Eyebrow>Aprovação de compras</Eyebrow>
            <Title>Saiba exatamente o que está aprovando.</Title>
            <Lead>
              As solicitações ficam organizadas por prioridade, ajudando a decidir primeiro aquilo
              que impacta as festas mais próximas.
            </Lead>
          </Reveal>
          <div className="mt-8">
            <Reveal>
              <Screenshot
                src={opIndividualAsset.url}
                alt="Ordem de Produção"
                title="Cada festa vira um processo organizado, do pedido à entrega."
                highlights={["Compras", "Produção", "Separação", "Conferência", "Kit pronto"]}
              />
            </Reveal>
          </div>
        </Section>

        {/* PRODUÇÃO */}
        <Section tone="muted">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Produção</Eyebrow>
              <Title>Tudo o que precisa ser produzido em um só fluxo.</Title>
              <Lead>
                Painéis, displays, personalizados e outros itens acompanham o pedido até estarem
                prontos para a festa.
              </Lead>
              <div className="mt-8">
                <Flow
                  steps={["Produção pendente", "Em produção", "Produzido", "Separado", "Conferido"]}
                />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <Screenshot
                src={producaoCentralAsset.url}
                alt="Central de Produção"
                title="Central de Produção"
                description="Da compra à conferência, cada festa segue um fluxo."
                highlights={[
                  "Hoje",
                  "Esta Semana",
                  "Próxima Semana",
                  "Todas",
                  "Retiradas",
                  "Produções pendentes",
                  "Conferências",
                  "Alertas",
                ]}
              />
            </Reveal>
          </div>
        </Section>

        {/* SEPARAÇÃO E CONFERÊNCIA */}
        <Section>
          <Reveal>
            <Eyebrow>Separação e conferência</Eyebrow>
            <Title>Antes de sair, confira.</Title>
            <Lead>Acompanhe a preparação do kit e confirme as etapas antes da retirada.</Lead>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Itens do kit", "Itens específicos da festa", "Separação", "Conferência", "Responsável", "Observações", "Kit pronto"].map(
              (i, idx) => (
                <Reveal key={i} delay={idx * 50}>
                  <Card className="text-sm font-medium">{i}</Card>
                </Reveal>
              ),
            )}
          </div>
          <Reveal delay={100}>
            <p className="mt-8 text-lg font-semibold">
              Menos dependência da memória. <span className="text-primary">Mais segurança na entrega.</span>
            </p>
          </Reveal>
        </Section>

        {/* FINANCEIRO */}
        <Section tone="muted">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Financeiro</Eyebrow>
              <Title>A operação e o financeiro conversam.</Title>
              <Lead>
                Acompanhe o que entrou, o que ainda falta receber e os gastos relacionados à operação.
              </Lead>
              <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {["Valor contratado", "Sinal", "Saldo", "Caução", "Despesas", "Pagamentos", "Fluxo financeiro"].map(
                  (i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {i}
                    </li>
                  ),
                )}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <Screenshot
                src={financeiroCentralAsset.url}
                alt="Gestão financeira da plataforma"
                title="Não basta saber quanto vendeu. É preciso saber quanto sobrou."
                highlights={["Recebido no mês", "Contas a receber", "Saldo previsto", "Saldo em conta"]}
              />
            </Reveal>
          </div>
        </Section>

        {/* ALERTAS */}
        <Section>
          <Reveal>
            <Eyebrow>Alertas</Eyebrow>
            <Title>O sistema ajuda você a lembrar.</Title>
            <Lead>
              A Heaven Festas transforma informações do sistema em avisos que ajudam a equipe a
              identificar o que precisa de atenção.
            </Lead>
          </Reveal>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALERTAS.map((a, i) => (
              <li key={a}>
                <Reveal delay={i * 60}>
                  <Card className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium">{a}</span>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>

        {/* UMA FESTA COMPLETA */}
        <Section tone="muted">
          <Reveal>
            <Eyebrow>Storytelling</Eyebrow>
            <Title>Veja uma festa passar pela Heaven Festas.</Title>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {[
                ["Cliente", "Ana"],
                ["Tema", "Stitch"],
                ["Festa", "24/08"],
              ].map(([k, v]) => (
                <span key={k} className="rounded-full border border-border bg-card px-3 py-1.5">
                  <span className="text-muted-foreground">{k}: </span>
                  <span className="font-semibold">{v}</span>
                </span>
              ))}
            </div>
          </Reveal>
          <ol className="mx-auto mt-8 grid max-w-2xl gap-3">
            {HISTORIA_FESTA.map((step, i) => (
              <li key={step}>
                <Reveal delay={i * 60}>
                  <Card className="flex items-center gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 text-sm font-medium sm:text-base">{step}</span>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ol>
          <Reveal delay={120}>
            <p className="mt-8 text-center text-lg font-semibold">
              Um pedido acompanhado do começo ao fim.
            </p>
          </Reveal>
        </Section>

        {/* ANTES x DEPOIS */}
        <Section>
          <Reveal>
            <Title>Antes × Depois</Title>
          </Reveal>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Reveal>
              <Card>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Antes</p>
                <ul className="mt-4 grid gap-2 text-sm">
                  {["WhatsApp", "Caderno", "Agenda", "Planilha", "Bloco de notas", "Memória"].map((i) => (
                    <li key={i} className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">{i}</li>
                  ))}
                </ul>
              </Card>
            </Reveal>
            <Reveal delay={100}>
              <Card className="border-primary/30 bg-primary/5">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Depois — Heaven Festas</p>
                <div className="mt-4">
                  <Flow
                    steps={[
                      "Contrato",
                      "Planejamento",
                      ["Compras", "Produção"],
                      "Separação",
                      "Conferência",
                      "Retirada",
                      "Devolução",
                    ]}
                  />
                </div>
              </Card>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <p className="mt-8 text-lg font-semibold">
              Menos informação espalhada. <span className="text-primary">Mais controle da operação.</span>
            </p>
          </Reveal>
        </Section>

        {/* MODALIDADES */}
        <Section tone="muted">
          <Reveal>
            <Title>Feito para diferentes formas de trabalhar com festas.</Title>
            <Lead>
              A plataforma nasceu de uma operação real, mas foi pensada para evoluir junto com
              diferentes negócios do setor de festas.
            </Lead>
          </Reveal>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODALIDADES.map((m, i) => (
              <li key={m}>
                <Reveal delay={i * 60}>
                  <Card className="flex items-center gap-3 text-sm font-semibold">
                    <Repeat className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {m}
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>

        {/* HISTÓRIA */}
        <Section id="historia">
          <Reveal>
            <Eyebrow>Nossa história</Eyebrow>
            <Title>Não nasceu em uma empresa de software.</Title>
            <p className="mt-2 text-lg font-medium text-primary sm:text-2xl">
              Nasceu dentro de uma empresa de festas.
            </p>
            <div className="mt-6 grid max-w-3xl gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                A Heaven Festas começou como uma solução interna para organizar uma operação real.
              </p>
              <p>
                Contratos, compras, personalizados, produção, separação, financeiro, retiradas e
                devoluções faziam parte da nossa própria rotina.
              </p>
              <p>
                Cada melhoria surgiu de uma pergunta simples: como podemos fazer isso de um jeito
                mais organizado e com menos trabalho?
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-6">
              <p className="text-lg font-semibold">Primeiro usamos.</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Depois percebemos que outras empresas de festas poderiam precisar da mesma coisa.
              </p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Desenvolvido a partir da experiência operacional da LHL Festas.
            </p>
          </Reveal>
          <Reveal delay={180} className="mt-12">
            <Screenshot
              src={loginAcessoAsset.url}
              alt="Acesso Administrativo Heaven Festas"
              title="Sua operação organizada em um único lugar."
            />
          </Reveal>
        </Section>

        {/* POSICIONAMENTO HUMANO */}
        <Section tone="muted">
          <Reveal>
            <Title>
              O sistema não substitui sua forma de trabalhar.
              <br />
              <span className="text-primary">Ele ajuda a organizar sua forma de trabalhar.</span>
            </Title>
            <Lead>
              Você continua criando, atendendo clientes e realizando festas. A Heaven ajuda a
              organizar tudo aquilo que precisa acontecer entre uma reserva e outra.
            </Lead>
          </Reveal>
        </Section>

        {/* BENEFÍCIOS */}
        <Section>
          <Reveal>
            <Title>Benefícios</Title>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map((b, i) => (
              <Reveal key={b.t} delay={i * 60}>
                <Card>
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 font-semibold">{b.t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* PILOTO + FORMULÁRIO */}
        <Section id="quero-testar" tone="muted">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Vagas para teste piloto
            </span>
            <Title className="mt-4">
              Estamos selecionando decoradoras para conhecer e testar a Heaven Festas.
            </Title>
            <Lead>
              Queremos conhecer outras rotinas, entender diferentes formas de trabalhar e construir a
              próxima etapa da plataforma junto com profissionais do setor.
            </Lead>
          </Reveal>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <Card className="bg-card">
                <p className="text-lg font-semibold">Conheça uma plataforma desenvolvida a partir da rotina real de uma empresa de festas.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preencha os campos ao lado e ajude a construir a próxima geração da Heaven Festas.
                </p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  QUERO PARTICIPAR <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </p>
              </Card>
            </Reveal>
            <Reveal delay={100}>
              <HeavenForm />
            </Reveal>
          </div>
        </Section>

        {/* CTA FINAL */}
        <Section>
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--heaven-shadow-lg)] sm:p-14">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Sua empresa cuida das festas.
                <br />
                <span className="text-primary">A Heaven ajuda você a cuidar da operação.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Faça parte do grupo de profissionais que vai testar a próxima etapa da Heaven Festas.
              </p>
              <a
                href="#quero-testar"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                QUERO CONHECER A HEAVEN
              </a>
            </div>
          </Reveal>
        </Section>
      </main>

      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              Heaven Festas
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Plataforma de Gestão para Festas</p>
            <p className="mt-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              Produto em fase piloto.
            </p>
          </div>
          <nav aria-label="Rodapé">
            <ul className="grid gap-2 text-sm sm:justify-items-end">
              <li><a href="#top" className="text-muted-foreground hover:text-foreground">Apresentação</a></li>
              <li><a href="#recursos" className="text-muted-foreground hover:text-foreground">Recursos</a></li>
              <li><a href="#historia" className="text-muted-foreground hover:text-foreground">Nossa história</a></li>
              <li><a href="#quero-testar" className="text-muted-foreground hover:text-foreground">Quero testar</a></li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
