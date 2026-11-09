import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { listAdminEmails, type MailSummary } from "@/lib/email-center.functions";
import { Mail, Inbox, RefreshCw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/emails")({
 component: EmailsPage,
 head: () => ({ meta: [{ title: "Central de E-mails — LHL Festas" }] }),
});

function EmailsPage() {
 const { authenticated, isAdmin, loading: authLoading } = useAdminSession();
 const [messages,setMessages] = useState<MailSummary[]>([]);
 const [loading,setLoading] = useState(false);
 const [error,setError] = useState("");
 async function refresh() {
  setLoading(true); setError("");
  try {
   const {data,error:sessionError}=await supabase.auth.getSession();
   const accessToken=data.session?.access_token;
   if(sessionError || !accessToken) throw new Error("Sessão expirada. Entre novamente.");
   const result=await listAdminEmails({data:{accessToken}});
   setMessages(result.messages);
  } catch(e) { setError(e instanceof Error ? e.message : "Falha ao carregar e-mails."); }
  finally { setLoading(false); }
 }
 useEffect(()=>{if(!authLoading && authenticated && isAdmin) void refresh();},[authLoading,authenticated,isAdmin]);
 return <AdminShell><div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="flex items-center gap-3">
    <div className="rounded-2xl bg-[#f7ded9] p-3 text-[#5a111d]"><Mail /></div>
    <div><h1 className="font-serif text-3xl text-[#5a111d]">Central de E-mails</h1>
    <p className="text-sm text-[#79585d]">contato@lhlfestas.com.br</p></div>
   </div>
   <button type="button" disabled={loading} onClick={()=>void refresh()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16}/> Atualizar</button>
  </div>
  <div className="grid gap-4 sm:grid-cols-2">
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><Inbox className="mb-3 text-[#651421]"/><h2 className="font-semibold">Caixa de entrada</h2><p className="mt-2 text-2xl font-bold">{messages.length}</p><p className="text-xs text-[#79585d]">Últimas 100 mensagens</p></div>
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><ShieldCheck className="mb-3 text-[#651421]"/><h2 className="font-semibold">Acesso administrativo</h2><p className="mt-2 text-sm text-[#79585d]">Consulta protegida por sessão e papel admin</p></div>
  </div>
  {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
  <section className="overflow-hidden rounded-2xl border bg-white">
   <h2 className="border-b px-5 py-4 font-semibold">Mensagens recebidas</h2>
   {loading ? <p className="p-5 text-sm">Carregando...</p> : messages.length===0 ? <p className="p-5 text-sm text-[#79585d]">Nenhuma mensagem disponível.</p> :
    <div className="divide-y">{messages.map(m=><article key={m.id} className="p-5">
     <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-all">{m.sender}</strong><time className="text-xs text-[#79585d]">{m.received_at}</time></div>
     <p className="mt-1 text-sm font-medium">{m.subject || "(Sem assunto)"}</p>
     <p className="mt-1 text-xs text-[#79585d]">Para: {m.recipient}</p>
    </article>)}</div>}
  </section>
  <p className="text-sm text-[#79585d]">Nesta fase a lista exibe remetente, assunto e data. Abertura do conteúdo, anexos e envio serão habilitados após validação do acesso seguro.</p>
 </div></AdminShell>;
}
