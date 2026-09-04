import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  saveOrder,
  computePricing,
  buildWhatsAppMessage,
  WHATSAPP_NUMBER,
  buildEnderecoCompleto,
  type ContractDetails,
  emptyKit,
} from "@/lib/orders-storage";
import { postOrderToSheet } from "@/lib/sheets-api";
import KitPicker from "@/components/kits/KitPicker";
import { modalidadeIdFromLabel } from "@/data/kits";

import { Lock } from "lucide-react";
import logo from "@/assets/lhl-logo.png";

export const Route = createFileRoute("/reserva")({
  component: Index,
  head: () => ({
    meta: [
      { title: "LHL Festas – Peg & Monte | Prático, lindo e feito para você" },
      { name: "description", content: "Envie seus dados e escolha o tema da sua festa com a LHL Festas Peg & Monte." },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:title", content: "LHL Festas – Peg & Monte" },
      { property: "og:description", content: "Sua festa, do seu jeito!" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lhl-festas.lovable.app/reserva" },
    ],
    links: [
      { rel: "canonical", href: "https://lhl-festas.lovable.app/reserva" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Karla:wght@300;400;500;600&display=swap" },
    ],
  }),
});

const empty = {
  nome: "", cpf: "", telefone: "", email: "",
  rua: "", numero: "", bairro: "", cidade: "", cep: "",
  tema: "",
  modalidade: "", plano: "",
  dataEvento: "",
  nomeAniversariante: "", idadeAniversariante: "", tipoFesta: "",
};

const ACEITE_ITEMS = [
  "Estou ciente das condições da reserva.",
  "Estou ciente das regras de sinal e caução.",
  "Comprometo-me a cuidar dos itens locados durante o período da locação.",
  "Estou ciente dos prazos combinados para retirada e devolução.",
  "Li e concordo com os termos da locação.",
];

function Index() {
  const [form, setForm] = useState(empty);
  const [aceites, setAceites] = useState<boolean[]>(() => ACEITE_ITEMS.map(() => false));
  const navigate = useNavigate();

  const set = (k: keyof typeof empty) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const allAceites = aceites.every(Boolean);

  const pricing = useMemo(
    () => computePricing(form.modalidade, form.plano, form.dataEvento),
    [form.modalidade, form.plano, form.dataEvento],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.modalidade || !form.plano) {
      toast.error("Selecione a modalidade e o kit da sua festa.");
      return;
    }
    if (!form.dataEvento) {
      toast.error("Preencha a data do evento.");
      return;
    }
    if (!allAceites) {
      toast.error("Confirme todos os itens da Confirmação da Reserva antes de enviar.");
      return;
    }

    const isMontagem = modalidadeIdFromLabel(form.modalidade) === "festa-com-montagem";
    const nowIso = new Date().toISOString();
    const enderecoCompleto = buildEnderecoCompleto(form);

    const details: ContractDetails = {
      dataEvento: form.dataEvento,
      dataRetirada: "",
      horaRetirada: "",
      dataDevolucao: "",
      horaDevolucao: "",
      nomeAniversariante: form.nomeAniversariante,
      idadeAniversariante: form.idadeAniversariante,
      tipoFesta: form.tipoFesta,
      valorTotal: String(pricing.total),
      valorSinal: String(pricing.sinal),
      valorRestante: String(pricing.restante),
      valorCaucao: isMontagem ? "0" : String(pricing.caucao),
      kit: { ...emptyKit },
      balaoTipo: "",
      demaisPecas: "",
      observacoes: "",
      origemCliente: "",
      veioAnuncio: "Não",
      pagamentoFinalizado: "Não",
      devolucaoConfirmada: "Não",
      ativo: "Sim",
      observacoesInternas: "",
      sinalRecebido: "Não",
      pagamentoFinalRecebido: "Não",
      caucaoDevolvida: "Não",
      dataPagamentoFinal: "",
      dataDevolucaoCaucao: "",
      clienteRecorrente: "Não",
      aceiteContrato: "Sim",
      dataHoraAceite: nowIso,
      fotoDecoracaoUrl: "",
      checklistMontado: "Não",
      kitSeparado: "Não",
      caucaoRecebida: "Não",
      rua: form.rua,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      cep: form.cep,
      itensExclusivos: "",
      itensComprar: "",
      itensProduzir: "",
      servicoMontagem: isMontagem ? "Sim" : "Não",
    };

    const orderInput = {
      nome: form.nome,
      cpf: form.cpf,
      rg: "",
      telefone: form.telefone,
      email: form.email,
      endereco: enderecoCompleto,
      cidadeUf: form.cidade,
      tema: form.tema,
      modalidade: form.modalidade,
      plano: form.plano,
      details,
    };

    let saved;
    try {
      saved = saveOrder(orderInput);
    } catch {
      /* sem bloqueio */
    }

    if (saved) {
      postOrderToSheet({
        id: saved.id,
        createdAt: saved.createdAt,
        status: saved.status,
        nomeCompleto: form.nome,
        cpf: form.cpf,
        rg: "",
        telefone: form.telefone,
        email: form.email,
        endereco: enderecoCompleto,
        cidadeUf: form.cidade,
        tema: form.tema,
        modalidade: form.modalidade,
        plano: form.plano,
        dataEvento: form.dataEvento,
        nomeAniversariante: form.nomeAniversariante,
        idadeAniversariante: form.idadeAniversariante,
        tipoFesta: form.tipoFesta,
        valorTotal: pricing.total,
        valorSinal: pricing.sinal,
        valorRestante: pricing.restante,
        caucao: pricing.caucao,
        demaisPecas: "",
        observacoes: "",
        kitJson: JSON.stringify(details.kit),
        aceiteContrato: "Sim",
        dataHoraAceite: nowIso,
        rua: form.rua,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        cep: form.cep,
      }).catch(() => { /* não bloqueia o cliente */ });
    }

    const msg = buildWhatsAppMessage({
      nome: form.nome,
      cpf: form.cpf,
      telefone: form.telefone,
      email: form.email,
      endereco: enderecoCompleto,
      tema: form.tema,
      modalidade: form.modalidade,
      plano: form.plano,
      dataEvento: form.dataEvento,
      nomeAniversariante: form.nomeAniversariante,
      idadeAniversariante: form.idadeAniversariante,
      tipoFesta: form.tipoFesta,
    });
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

    toast.success("Seus dados foram preparados!", {
      description: "Finalize o envio pelo WhatsApp para confirmar o atendimento.",
      duration: 4000,
    });
    setForm(empty);
    navigate({ to: "/obrigado" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      <header className="px-6 pt-10 pb-8 text-center">
        <img src={logo} alt="LHL Festas Peg & Monte" className="mx-auto w-44 sm:w-56 drop-shadow-sm" />
        <h1 className="mt-6 text-4xl sm:text-5xl text-primary tracking-wide">LHL Festas</h1>
        <p className="font-script text-2xl sm:text-3xl text-gold mt-1">Peg &amp; Monte</p>
        <p className="mt-4 text-sm sm:text-base uppercase tracking-[0.25em] text-muted-foreground">
          Prático, lindo e feito para você
        </p>
        <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </header>

      <main className="px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="mx-auto max-w-2xl rounded-3xl bg-card border border-border/60 p-6 sm:p-10 shadow-[var(--shadow-soft)]"
        >
          {/* Seção 1 — Dados Pessoais */}
          <SectionTitle number="01" title="Dados Pessoais" />
          <div className="grid gap-5 mt-6 sm:grid-cols-2">
            <Field label="Nome Completo" full>
              <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} required placeholder="Nome completo" />
            </Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => set("cpf")(e.target.value)} required placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <Input type="tel" value={form.telefone} onChange={(e) => set("telefone")(e.target.value)} required placeholder="(00) 00000-0000" />
            </Field>
            <Field label="E-mail" full>
              <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required placeholder="voce@email.com" />
            </Field>
          </div>

          <Divider />

          {/* Endereço */}
          <SectionTitle number="02" title="Endereço" />
          <div className="grid gap-5 mt-6 sm:grid-cols-2">
            <Field label="Rua" full>
              <Input value={form.rua} onChange={(e) => set("rua")(e.target.value)} required placeholder="Nome da rua" />
            </Field>
            <Field label="Número">
              <Input value={form.numero} onChange={(e) => set("numero")(e.target.value)} required placeholder="Nº" />
            </Field>
            <Field label="Bairro">
              <Input value={form.bairro} onChange={(e) => set("bairro")(e.target.value)} required placeholder="Bairro" />
            </Field>
            <Field label="Cidade">
              <Input value={form.cidade} onChange={(e) => set("cidade")(e.target.value)} required placeholder="Cidade" />
            </Field>
            <Field label="CEP">
              <Input value={form.cep} onChange={(e) => set("cep")(e.target.value)} required placeholder="00000-000" />
            </Field>
          </div>

          <Divider />

          {/* Seção 3 — Festa */}
          <SectionTitle number="03" title="Escolha da Festa" />
          <div className="mt-6 space-y-7">
            <Field label="Tema Escolhido" full>
              <Input value={form.tema} onChange={(e) => set("tema")(e.target.value)} required placeholder="Ex: Jardim Encantado, Princesas, Safari..." />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Tipo da Festa">
                <select
                  value={form.tipoFesta}
                  onChange={(e) => set("tipoFesta")(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {["Aniversário","Chá de Bebê","Chá Bar","Chá Revelação","Batizado","Casamento","Noivado","Corporativo","Outro"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nome do Aniversariante (se houver)">
                <Input value={form.nomeAniversariante} onChange={(e) => set("nomeAniversariante")(e.target.value)} placeholder="Ex: Ana Beatriz" />
              </Field>
              <Field label="Idade do Aniversariante (se houver)" full>
                <Input value={form.idadeAniversariante} onChange={(e) => set("idadeAniversariante")(e.target.value)} placeholder="Ex: 9 anos" />
              </Field>
            </div>

            <KitPicker
              modalidade={form.modalidade}
              onModalidadeChange={(v) => setForm((f) => ({ ...f, modalidade: v, plano: "" }))}
              kit={form.plano}
              onKitChange={(v) => setForm((f) => ({ ...f, plano: v }))}
            />
          </div>


          <Divider />

          {/* Seção 4 — Logística */}
          <SectionTitle number="04" title="Logística" />
          <div className="mt-6 space-y-3">
            <Field label="Data do Evento" full>
              <Input type="date" value={form.dataEvento} onChange={(e) => set("dataEvento")(e.target.value)} required />
            </Field>
            <p className="text-xs italic text-muted-foreground bg-accent/40 border border-border/50 rounded-xl px-4 py-3">
              As retiradas e devoluções são realizadas de segunda a sábado, das 9h às 18h. Não realizamos retiradas ou devoluções aos domingos. O dia exato será alinhado com nossa equipe.
            </p>
          </div>

          <Divider />

          <div className="mt-6 rounded-2xl border border-border/60 bg-accent/20 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Valores da locação
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              Esta é uma <strong>solicitação de reserva</strong>. Os valores finais (total, sinal
              de <strong>50%</strong>, restante e caução) serão confirmados pela nossa equipe
              conforme a data do evento e a disponibilidade dos itens.
            </p>
          </div>

          <Divider />

          <SectionTitle number="05" title="Confirmação da Reserva" />
          <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-accent/20 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Marque todos os itens abaixo para prosseguir com o envio
            </p>
            {ACEITE_ITEMS.map((txt, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={aceites[i]}
                  onChange={(e) =>
                    setAceites((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                  }
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>{txt}</span>
              </label>
            ))}
          </div>

          <Button
            type="submit"
            disabled={!allAceites}
            className="mt-10 w-full h-12 text-base tracking-wide rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95 transition-opacity shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar Dados pelo WhatsApp ♥
          </Button>
        </form>

        <p className="mt-8 text-center font-script text-2xl text-primary">
          Sua festa, do seu jeito!
        </p>

        <div className="mt-6 text-center">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Lock className="h-3 w-3" /> Visão da Loja
          </Link>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-serif text-gold text-lg">{number}</span>
      <span className="h-px flex-1 bg-border" />
      <h2 className="font-serif text-2xl text-primary">{title}</h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Divider() {
  return <div className="my-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
