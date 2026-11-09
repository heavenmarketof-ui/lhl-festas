import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Mail, Inbox, Send, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/emails")({
  component: EmailsPage,
  head: () => ({ meta: [{ title: "Central de E-mails — LHL Festas" }] }),
});

function EmailsPage() {
  return <AdminShell>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#f7ded9] p-3 text-[#5a111d]"><Mail /></div>
        <div><h1 className="font-serif text-3xl text-[#5a111d]">Central de E-mails</h1>
        <p className="text-sm text-[#79585d]">contato@lhlfestas.com.br</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{label:"Caixa de entrada",icon:Inbox},{label:"Enviados",icon:Send},{label:"Acesso protegido",icon:ShieldCheck}].map(({label,icon:Icon})=>
          <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="mb-3 text-[#651421]"/><h2 className="font-semibold">{label}</h2><p className="mt-2 text-sm text-[#79585d]">Aguardando integração segura</p></div>)}
      </div>
      <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        O recebimento de e-mails já foi validado no Cloudflare D1. Esta tela está em preparação.
        Por segurança, as mensagens não são carregadas diretamente do navegador: a integração exige um endpoint
        autenticado no servidor. O envio também será habilitado após configurar o provedor de e-mail.
      </div>
    </div>
  </AdminShell>;
}
