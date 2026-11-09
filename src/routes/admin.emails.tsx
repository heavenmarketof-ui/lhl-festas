import { createFileRoute } from "@tanstack/react-router";
import { Mail, Inbox, Send, FileEdit, Settings2, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/emails")({
  component: EmailCentral,
  head: () => ({ meta: [{ title: "E-mails — LHL Festas" }] }),
});

function EmailCentral() {
  return <AdminShell>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-serif text-3xl text-primary"><Mail className="h-7 w-7" /> Central de E-mails</h1>
          <p className="mt-1 text-sm text-muted-foreground">contato@lhlfestas.com.br</p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">Configuração pendente</span>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <strong>O e-mail ainda não está ativo.</strong> Esta é a primeira etapa visual do módulo. Antes de enviar ou receber mensagens, precisamos configurar e validar DNS, provedor, armazenamento privado e integrações seguras. Nenhum e-mail fictício é exibido como real.
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {[{icon: Inbox,label:"Recebidos"},{icon: Send,label:"Enviados"},{icon: FileEdit,label:"Rascunhos"}].map(({icon:Icon,label})=>
          <div key={label} className="rounded-2xl border bg-white p-5"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">Disponível após a integração</p></div>)}
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-serif text-2xl text-primary">Caixa de entrada</h2>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Inbox className="h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">Aguardando conexão do provedor</p>
          <p className="max-w-md text-sm text-muted-foreground">Quando a configuração estiver concluída, as mensagens recebidas aparecerão aqui e poderão ser associadas aos clientes e contratos.</p>
          <Button disabled><Send className="mr-2 h-4 w-4" /> Escrever e-mail</Button>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5" /> Próximas configurações</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Verificar os registros DNS da Cloudflare e ativar autenticação do domínio, recebimento por webhook e envio seguro sem expor credenciais no navegador.</p>
      </section>
    </main>
  </AdminShell>;
}
