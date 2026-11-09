import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { listAdminEmails, sendAdminEmail, type MailSummary } from "@/lib/email-center.functions";
import { Mail, Inbox, RefreshCw, ShieldCheck, Send, X, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/emails")({
 component: EmailsPage,
 head: () => ({ meta: [{ title: "Central de E-mails — LHL Festas" }] }),
});

function EmailsPage() {
 const { authenticated, isAdmin, loading: authLoading } = useAdminSession();
 const [messages,setMessages] = useState<MailSummary[]>([]);
 const [loading,setLoading] = useState(false);
 const [error,setError] = useState("");
 const [compose,setCompose] = useState(false);
 const [to,setTo] = useState("");
 const [subject,setSubject] = useState("");
 const [body,setBody] = useState("");
 const [sending,setSending] = useState(false);
 const [sendNotice,setSendNotice] = useState("");
 async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); setSending(true); setError(""); setSendNotice("");
  try {
   const {data,error:sessionError}=await supabase.auth.getSession();
   const accessToken=data.session?.access_token;
   if(sessionError || !accessToken) throw new Error("Sessão expirada. Entre novamente.");
   await sendAdminEmail({data:{accessToken,to,subject,body}});
   setSendNotice("E-mail enviado com sucesso."); setCompose(false); setTo(""); setSubject(""); setBody("");
  } catch(e) { setError(e instanceof Error ? e.message : "Falha ao enviar e-mail."); }
  finally { setSending(false); }
 }

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
   <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setCompose(true);setError("");setSendNotice("");}} className="flex items-center gap-2 rounded-xl bg-[#651421] px-4 py-2 text-sm font-semibold text-white"><Plus size={16}/> Novo e-mail</button><button type="button" disabled={loading} onClick={()=>void refresh()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16}/> Atualizar</button></div>
  </div>
  <div className="grid gap-4 sm:grid-cols-2">
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><Inbox className="mb-3 text-[#651421]"/><h2 className="font-semibold">Caixa de entrada</h2><p className="mt-2 text-2xl font-bold">{messages.length}</p><p className="text-xs text-[#79585d]">Últimas 100 mensagens</p></div>
   <div className="rounded-2xl border bg-white p-5 shadow-sm"><ShieldCheck className="mb-3 text-[#651421]"/><h2 className="font-semibold">Acesso administrativo</h2><p className="mt-2 text-sm text-[#79585d]">Consulta protegida por sessão e papel admin</p></div>
  </div>
  {sendNotice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">{sendNotice}</div>}
  {compose && <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-xl text-[#651421]">Nova mensagem</h2><button type="button" aria-label="Fechar" onClick={()=>setCompose(false)}><X size={20}/></button></div><form onSubmit={sendMessage} className="space-y-4"><p className="text-sm text-[#79585d]">De: contato@lhlfestas.com.br</p><label className="block text-sm font-medium">Para<input required type="email" value={to} onChange={e=>setTo(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="cliente@exemplo.com"/></label><label className="block text-sm font-medium">Assunto<input required maxLength={200} value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-sm font-medium">Mensagem<textarea required rows={8} maxLength={50000} value={body} onChange={e=>setBody(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><button disabled={sending} type="submit" className="flex items-center gap-2 rounded-xl bg-[#651421] px-5 py-3 font-semibold text-white disabled:opacity-50"><Send size={16}/>{sending ? "Enviando..." : "Enviar e-mail"}</button></form></section>}
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
  <p className="text-sm text-[#79585d]">Nesta fase a lista exibe remetente, assunto e data. Abertura do conteúdo, anexos e histórico de enviados serão adicionados nas próximas etapas. O envio requer configuração do provedor.</p>
 </div></AdminShell>;
}
