import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  buildWhatsAppMessage,
  WHATSAPP_NUMBER,
  buildEnderecoCompleto,
  type ContractDetails,
  emptyKit,
} from "@/lib/orders-storage";
import { postOrderToSheet } from "@/lib/sheets-api";
import { validateReserva } from "@/lib/reserva-validation";
import KitPicker from "@/components/kits/KitPicker";
import { modalidadeIdFromLabel } from "@/data/kits";
import logo from "@/assets/lhl-logo-transparente.png";

export const Route = createFileRoute("/reserva")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Reserva | LHL Festas" },
      { name: "description", content: "Envie seus dados para a equipe LHL Festas preparar sua reserva e contrato." },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:title", content: "Reserva | LHL Festas" },
      { property: "og:description", content: "Sua festa, do seu jeito!" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.lhlfestas.com.br/reserva" },
    ],
    links: [
      { rel: "canonical", href: "https://www.lhlfestas.com.br/reserva" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Karla:wght@300;400;500;600&display=swap" },
    ],
  }),
});

const empty = {
  tipoPessoa: "PF", responsavel: "", mesmoEndereco: "Sim", complemento: "",
  eventoRua: "", eventoNumero: "", eventoBairro: "", eventoCidade: "", eventoCep: "", eventoComplemento: "", localEvento: "",
  nome: "", cpf: "", telefone: "", email: "",
  rua: "", numero: "", bairro: "", cidade: "", cep: "",
  tema: "",
  modalidade: "", plano: "",
  dataEvento: "",
  nomeAniversariante: "", idadeAniversariante: "", tipoFesta: "",
};

const ACEITE_ITEMS = [
  "Estou ciente das condições desta solicitação de reserva.",
  "Estou ciente de que a confirmação da data ocorre mediante o pagamento do sinal, conforme combinado com a equipe.",
  "Estou ciente de que o saldo restante e a caução, quando aplicável, serão informados pela equipe conforme a modalidade contratada.",
  "Nas modalidades com retirada, comprometo-me a cuidar dos itens enquanto estiverem sob minha responsabilidade.",
  "Estou ciente de que retirada, devolução, montagem e desmontagem seguem o combinado para a modalidade contratada.",
  "Li e concordo com as condições da contratação e com a Política de Privacidade.",
];

function Index() {
  const [form, setForm] = useState(empty);
  const [aceites, setAceites] = useState<boolean[]>(() => ACEITE_ITEMS.map(() => false));
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const allAceites = aceites.every(Boolean);
  const empresa = form.tipoPessoa === "PJ";
  const corporativo = ["Corporativo", "Confraternização", "Inauguração"].includes(form.tipoFesta);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validateReserva(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!allAceites) {
      toast.error("Confirme todos os itens da Confirmação da Reserva antes de enviar.");
      return;
    }

    const isMontagem = modalidadeIdFromLabel(form.modalidade) === "festa-com-montagem";
    const nowIso = new Date().toISOString();
    const enderecoCompleto = buildEnderecoCompleto(form);
    const enderecoEvento = form.mesmoEndereco === "Sim" ? enderecoCompleto : buildEnderecoCompleto({rua:form.eventoRua,numero:form.eventoNumero,bairro:form.eventoBairro,cidade:form.eventoCidade,cep:form.eventoCep});
    const complementoEvento = form.mesmoEndereco === "Sim" ? form.complemento : form.eventoComplemento;
    const observacoesReserva = [empresa ? `Pessoa jurídica — Responsável pelo contato: ${form.responsavel.trim()}` : "Pessoa física", form.complemento.trim() ? `Complemento do endereço do contratante: ${form.complemento.trim()}` : "", `Local do evento: ${form.localEvento.trim() || "Não informado"}`, `Endereço do evento: ${enderecoEvento}${complementoEvento.trim() ? ` — Complemento: ${complementoEvento.trim()}` : ""}`, form.mesmoEndereco === "Sim" ? "Evento no mesmo endereço do contratante." : "Evento em endereço diferente do contratante."].filter(Boolean).join("\n");

    const details: ContractDetails = {
      horaInicioFesta: "", horaTerminoFesta: "", horaMontagem: "",
      dataEvento: form.dataEvento,
      dataRetirada: "",
      horaRetirada: "",
      dataDevolucao: "",
      horaDevolucao: "",
      nomeAniversariante: corporativo ? "" : form.nomeAniversariante,
      idadeAniversariante: corporativo ? "" : form.idadeAniversariante,
      tipoFesta: form.tipoFesta,
      valorTotal: "",
      valorSinal: "",
      valorRestante: "",
      valorCaucao: isMontagem ? "0" : "",
      kit: { ...emptyKit },
      balaoTipo: "",
      demaisPecas: "",
      observacoes: observacoesReserva,
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

    const orderId = crypto.randomUUID();
    const msg = buildWhatsAppMessage({
      tipoPessoa: form.tipoPessoa,
      responsavel: empresa ? form.responsavel : "",
      enderecoEvento: `${enderecoEvento}${complementoEvento.trim() ? ` — ${complementoEvento.trim()}` : ""}`,
      localEvento: form.localEvento,
      nome: form.nome,
      cpf: form.cpf,
      telefone: form.telefone,
      email: form.email,
      endereco: enderecoCompleto,
      tema: form.tema,
      modalidade: form.modalidade,
      plano: form.plano,
      dataEvento: form.dataEvento,
      nomeAniversariante: corporativo ? "" : form.nomeAniversariante,
      idadeAniversariante: corporativo ? "" : form.idadeAniversariante,
      tipoFesta: form.tipoFesta,
    });
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

    const whatsappWindow = window.open('', '_blank');
    setSubmitting(true);

    try {
      await postOrderToSheet({
        id: orderId,
        createdAt: nowIso,
        status: "Pendente",
        nomeCompleto: form.nome.trim(),
        cpf: form.cpf.trim(),
        rg: "",
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        endereco: enderecoCompleto,
        cidadeUf: form.cidade.trim(),
        tema: form.tema.trim(),
        modalidade: form.modalidade,
        plano: form.plano,
        dataEvento: form.dataEvento,
        nomeAniversariante: corporativo ? "" : form.nomeAniversariante.trim(),
        idadeAniversariante: corporativo ? "" : form.idadeAniversariante.trim(),
        tipoFesta: form.tipoFesta,
        valorTotal: "",
        valorSinal: "",
        valorRestante: "",
        caucao: isMontagem ? "0" : "",
        demaisPecas: "",
        observacoes: observacoesReserva,
        kitJson: JSON.stringify(details.kit),
        aceiteContrato: "Sim",
        dataHoraAceite: nowIso,
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        cep: form.cep.trim(),
        servicoMontagem: isMontagem ? "Sim" : "Não",
      });
    } catch {
      whatsappWindow?.close();
      setSubmitting(false);
      toast.error("Não foi possível registrar sua solicitação.", {
        description: "Seus dados continuam preenchidos. Tente novamente em alguns instantes.",
      });
      return;
    }

    if (whatsappWindow) {
      whatsappWindow.opener = null;
      whatsappWindow.location.href = whatsappUrl;
    } else {
      window.location.href = whatsappUrl;
      return;
    }

    toast.success("Solicitação registrada com sucesso!", {
      description: "Agora finalize o atendimento pelo WhatsApp.",
      duration: 4000,
    });
    setForm(empty);
    setAceites(ACEITE_ITEMS.map(() => false));
    setSubmitting(false);
    navigate({ to: "/obrigado" });
  };

  return (
    <div id="reserva-lhl" className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <header className="px-6 pt-10 pb-8 text-center">
        <img src={logo} alt="LHL Festas" className="mx-auto h-44 w-44 object-contain sm:h-52 sm:w-52" />
        <h1 className="mt-6 text-4xl sm:text-5xl text-primary tracking-wide">LHL Festas</h1>
        <p className="font-script text-2xl sm:text-3xl text-gold mt-1">Sua festa, do seu jeito</p>
        <p className="mt-4 text-sm sm:text-base uppercase tracking-[0.25em] text-muted-foreground">Prático, lindo e feito para você</p>
        <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </header>

      <main className="px-4 pb-16">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl rounded-3xl bg-card border border-border/60 p-6 sm:p-10 shadow-[var(--shadow-soft)]">
          <SectionTitle number="01" title="Dados do Contratante" />
          <fieldset className="mt-6"><legend className="mb-3 text-sm font-medium">Quem está contratando?</legend><div className="flex flex-wrap gap-5">{[["PF","Pessoa física"],["PJ","Pessoa jurídica"]].map(([value,label])=><label key={value} className="flex items-center gap-2"><input type="radio" name="tipoPessoa" value={value} checked={form.tipoPessoa===value} onChange={()=>setForm(f=>({...f,tipoPessoa:value,cpf:"",nome:"",responsavel:""}))}/>{label}</label>)}</div></fieldset>
          <div className="grid gap-5 mt-6 sm:grid-cols-2">
            <Field label={empresa ? "Razão social" : "Nome completo"} full><Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} required maxLength={120} autoComplete="name" placeholder={empresa ? "Razão social da empresa" : "Nome completo"} /></Field>
            <Field label={empresa ? "CNPJ" : "CPF"}><Input value={form.cpf} onChange={(e) => set("cpf")(e.target.value)} required inputMode={empresa ? "text" : "numeric"} maxLength={18} autoComplete="off" placeholder={empresa ? "00.000.000/0000-00" : "000.000.000-00"} /></Field>
            {empresa && <Field label="Responsável pelo contato" full><Input value={form.responsavel} onChange={e=>set("responsavel")(e.target.value)} required maxLength={120} autoComplete="name" /></Field>}
            <Field label="Telefone"><Input type="tel" value={form.telefone} onChange={(e) => set("telefone")(e.target.value)} required maxLength={20} autoComplete="tel" placeholder="(00) 00000-0000" /></Field>
            <Field label="E-mail" full><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required maxLength={254} autoComplete="email" placeholder="voce@email.com" /></Field>
          </div>

          <Divider />
          <SectionTitle number="02" title="Endereço do Contratante" />
          <div className="grid gap-5 mt-6 sm:grid-cols-2">
            <Field label="Rua" full><Input value={form.rua} onChange={(e) => set("rua")(e.target.value)} required maxLength={160} autoComplete="address-line1" placeholder="Nome da rua" /></Field>
            <Field label="Número"><Input value={form.numero} onChange={(e) => set("numero")(e.target.value)} required maxLength={20} placeholder="Nº" /></Field>
            <Field label="Bairro"><Input value={form.bairro} onChange={(e) => set("bairro")(e.target.value)} required maxLength={100} placeholder="Bairro" /></Field>
            <Field label="Cidade"><Input value={form.cidade} onChange={(e) => set("cidade")(e.target.value)} required maxLength={100} autoComplete="address-level2" placeholder="Cidade" /></Field>
            <Field label="CEP"><Input value={form.cep} onChange={(e) => set("cep")(e.target.value)} required inputMode="numeric" maxLength={10} autoComplete="postal-code" placeholder="00000-000" /></Field>
          </div>

          <div className="mt-5"><Field label="Complemento do contratante (opcional)"><Input value={form.complemento} onChange={e=>set("complemento")(e.target.value)} maxLength={160} placeholder="Apartamento, bloco, sala..." /></Field></div>
          <div className="mt-8 space-y-5 rounded-xl border p-4"><h3 className="font-medium">Endereço do evento</h3>
            <Field label="Nome do espaço (opcional)"><Input value={form.localEvento} onChange={e=>set("localEvento")(e.target.value)} maxLength={160} placeholder="Salão, buffet, empresa..." /></Field>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.mesmoEndereco==="Sim"} onChange={e=>set("mesmoEndereco")(e.target.checked?"Sim":"Não")} className="mt-1"/>O evento será no mesmo endereço do contratante</label>
            {form.mesmoEndereco==="Sim" ? <p className="text-sm text-muted-foreground">Usaremos o endereço do contratante informado acima.</p> : <div className="grid gap-5 sm:grid-cols-2">{([["eventoRua","Rua"],["eventoNumero","Número"],["eventoBairro","Bairro"],["eventoCidade","Cidade"],["eventoCep","CEP"],["eventoComplemento","Complemento (opcional)"]] as const).map(([key,label])=><Field key={key} label={label}><Input value={form[key]} onChange={e=>set(key)(e.target.value)} required={key!=="eventoComplemento"} maxLength={key==="eventoCep"?10:160} inputMode={key==="eventoCep"?"numeric":"text"}/></Field>)}</div>}
          </div>
          <Divider />
          <SectionTitle number="03" title="Dados do Evento" />
          <div className="mt-6 space-y-7">
            <Field label="Tema ou proposta do evento" full><Input value={form.tema} onChange={(e) => set("tema")(e.target.value)} required maxLength={120} placeholder="Ex: Jardim Encantado, Princesas, Safari..." /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Tipo do evento"><select value={form.tipoFesta} onChange={(e) => set("tipoFesta")(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione...</option>{["Aniversário","Chá de Bebê","Chá Bar","Chá Revelação","Batizado","Casamento","Noivado","Corporativo","Confraternização","Inauguração","Outro"].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              {!corporativo && <><Field label="Nome do Aniversariante (se houver)"><Input value={form.nomeAniversariante} onChange={(e) => set("nomeAniversariante")(e.target.value)} maxLength={120} placeholder="Ex: Ana Beatriz" /></Field>
              <Field label="Idade do Aniversariante (se houver)" full><Input value={form.idadeAniversariante} onChange={(e) => set("idadeAniversariante")(e.target.value)} maxLength={30} placeholder="Ex: 9 anos" /></Field></>}
            </div>
            <KitPicker modalidade={form.modalidade} onModalidadeChange={(v) => setForm((f) => ({ ...f, modalidade: v, plano: "" }))} kit={form.plano} onKitChange={(v) => setForm((f) => ({ ...f, plano: v }))} />
          </div>

          <Divider />
          <SectionTitle number="04" title="Logística" />
          <div className="mt-6 space-y-3">
            <Field label="Data do Evento" full><Input type="date" value={form.dataEvento} onChange={(e) => set("dataEvento")(e.target.value)} required /></Field>
            <p className="text-xs italic text-muted-foreground bg-accent/40 border border-border/50 rounded-xl px-4 py-3">Nas modalidades com retirada, os horários de retirada e devolução são combinados com a equipe. Na Festa com Montagem, montagem e desmontagem acontecem no local do evento conforme o combinado.</p>
          </div>

          <Divider />
          <div className="mt-6 rounded-2xl border border-border/60 bg-accent/20 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Condições da reserva</p>
            <p className="text-sm text-foreground leading-relaxed">Esta é uma <strong>solicitação de reserva</strong>. Nenhum valor é calculado automaticamente nesta página. A data é confirmada mediante o <strong>pagamento do sinal</strong>, conforme combinado com a equipe. O saldo restante e a caução, quando aplicável, serão informados pela equipe conforme a modalidade e a negociação.</p>
          </div>

          <Divider />
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Ao enviar seus dados, eles serão usados para atendimento, elaboração da reserva, contrato e execução do serviço, conforme nossa <Link to="/privacidade" className="font-medium text-primary underline underline-offset-2">Política de Privacidade</Link>.</p>

          <Divider />
          <SectionTitle number="05" title="Confirmação da Reserva" />
          <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-accent/20 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Marque todos os itens abaixo para prosseguir com o envio</p>
            {ACEITE_ITEMS.map((txt, i) => <label key={i} className="flex items-start gap-3 cursor-pointer text-sm text-foreground"><input type="checkbox" checked={aceites[i]} onChange={(e) => setAceites((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))} className="mt-1 h-4 w-4 accent-primary" /><span>{txt}</span></label>)}
          </div>

          <Button type="submit" disabled={!allAceites || submitting} className="mt-10 w-full h-12 text-base tracking-wide rounded-full bg-[image:var(--gradient-elegant)] text-primary-foreground border-0 hover:opacity-95 transition-opacity shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? "Registrando sua solicitação..." : "Enviar dados e continuar no WhatsApp ♥"}</Button>
        </form>

        <p className="mt-8 text-center font-script text-2xl text-primary">Sua festa, do seu jeito!</p>
      </main>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="flex items-center gap-3"><span className="font-serif text-gold text-lg">{number}</span><span className="h-px flex-1 bg-border" /><h2 className="font-serif text-2xl text-primary">{title}</h2><span className="h-px flex-1 bg-border" /></div>;
}

function Divider() { return <div className="my-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />; }

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={full ? "sm:col-span-2 space-y-2" : "space-y-2"}><label className="block space-y-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label></div>;
}
