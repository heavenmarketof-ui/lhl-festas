import { createServerFn } from "@tanstack/react-start";
import { contextFromAdminAccessToken } from "@/lib/admin-action-auth.server";
import { getServerEnv, getServerServiceBinding } from "@/lib/runtime-env.server";

export type MailSummary = {
 id: string; message_id: string; sender: string; recipient: string;
 subject: string; received_at: string; status: string;
 linked_contract_id: string | null; linked_lead_id: string | null;
};

export const listAdminEmails = createServerFn({ method: "POST" })
 .validator((input: { accessToken: string }) => input)
 .handler(async ({ data }): Promise<{ messages: MailSummary[] }> => {
  const { supabase, userId } = await contextFromAdminAccessToken(data.accessToken);
  const { data: allowed, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || allowed !== true) throw new Error("Acesso restrito a administradores.");
  const token = getServerEnv("MAIL_ADMIN_TOKEN");
  const receiver = getServerServiceBinding("MAIL_RECEIVER");
  if (!token || !receiver) throw new Error("Service Binding MAIL_RECEIVER não configurado na pré-visualização.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
   const response = await receiver.fetch("https://lhl-email-receiver/internal/messages", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: controller.signal, cache: "no-store"
   });
   if (!response.ok) {
    console.error("Mail receiver returned HTTP", response.status);
    throw new Error(`Falha na consulta ao receptor (HTTP ${response.status}).`);
   }
   const payload = await response.json() as { messages?: MailSummary[] };
   return { messages: Array.isArray(payload.messages) ? payload.messages : [] };
  } finally { clearTimeout(timeout); }
 });

export const sendAdminEmail = createServerFn({ method: "POST" })
 .validator((input: { accessToken: string; to: string; cc: string; bcc: string; subject: string; body: string; attachments: {filename:string;content:string}[] }) => input)
 .handler(async ({ data }): Promise<{ id: string }> => {
  const { supabase, userId } = await contextFromAdminAccessToken(data.accessToken);
  const { data: allowed, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || allowed !== true) throw new Error("Acesso restrito a administradores.");
  const parseRecipients = (value: string) => value.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  const to = parseRecipients(data.to);
  const cc = parseRecipients(data.cc);
  const bcc = parseRecipients(data.bcc);
  const recipients = [...to, ...cc, ...bcc];
  const emailPattern = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;
  if (!to.length || recipients.length > 50 || recipients.some(x => x.length > 254 || !emailPattern.test(x))) throw new Error("Confira os destinatários. Informe pelo menos um Para, com até 50 endereços válidos no total.");
  const subject = data.subject.trim();
  const body = data.body.trim();
  if (!subject || subject.length > 200) throw new Error("O assunto deve ter entre 1 e 200 caracteres.");
  if (!body || body.length > 50000) throw new Error("A mensagem deve ter entre 1 e 50.000 caracteres.");
  const attachments = data.attachments ?? [];
  if (!Array.isArray(attachments) || attachments.length > 5 || attachments.some(a => !a || typeof a.filename !== "string" || !/^[^\\/]{1,150}$/.test(a.filename) || typeof a.content !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.content)) || attachments.reduce((n,a)=>n+a.content.length,0)>7_000_000) throw new Error("Envie até 5 anexos, com limite total de 5 MB.");
  const token = getServerEnv("MAIL_ADMIN_TOKEN");
  const receiver = getServerServiceBinding("MAIL_RECEIVER");
  if (!token || !receiver) throw new Error("Serviço de envio não configurado nesta implantação.");
  const response = await receiver.fetch("https://lhl-email-receiver/internal/send", {
   method: "POST",
   headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
   body: JSON.stringify({ to, cc, bcc, subject, body, attachments }),
   signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; error?: string; status?: number };
  if (!response.ok || !payload.id) {
   console.error("Mail gateway HTTP", response.status, payload.status ?? "");
   if (response.status === 404) throw new Error("Receptor ainda não atualizado com o serviço de envio.");
   if (response.status === 503) throw new Error("Configure RESEND_API_KEY como segredo no Worker lhl-email-receiver.");
   if (response.status === 401) throw new Error("Falha de autenticação entre os Workers.");
   throw new Error("Falha ao enviar pelo provedor de e-mails. Consulte os registros do receptor.");
  }
  return { id: payload.id };
 });

async function authorizedReceiver(accessToken: string) {
 const { supabase, userId } = await contextFromAdminAccessToken(accessToken);
 const { data: allowed, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
 if (error || allowed !== true) throw new Error("Acesso restrito a administradores.");
 const token = getServerEnv("MAIL_ADMIN_TOKEN");
 const receiver = getServerServiceBinding("MAIL_RECEIVER");
 if (!token || !receiver) throw new Error("Serviço de e-mails indisponível.");
 return {token,receiver};
}
export type SentMail = {id:string;recipients:string;cc:string;bcc:string;subject:string;body:string;attachment_names:string;sent_at:string};
export const listSentEmails = createServerFn({method:"POST"})
 .validator((input:{accessToken:string})=>input)
 .handler(async ({data}):Promise<{messages:SentMail[]}>=>{
  const {token,receiver}=await authorizedReceiver(data.accessToken);
  const response=await receiver.fetch("https://lhl-email-receiver/internal/sent",{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error("Não foi possível carregar os enviados.");
  return await response.json() as {messages:SentMail[]};
 });
export type MailDetail = {id:string;sender:string;recipient:string;subject:string;received_at:string;body:string};
export const readAdminEmail = createServerFn({method:"POST"})
 .validator((input:{accessToken:string;id:string})=>input)
 .handler(async ({data}):Promise<{message:MailDetail}>=>{
  const {token,receiver}=await authorizedReceiver(data.accessToken);
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(data.id)) throw new Error("Mensagem inválida.");
  const response=await receiver.fetch("https://lhl-email-receiver/internal/message?id="+encodeURIComponent(data.id),{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error("Não foi possível abrir esta mensagem.");
  const payload=await response.json() as {message:Omit<MailDetail,"body">&{raw_message:string}};
  const raw=payload.message.raw_message;
  const split=raw.search(/\r?\n\r?\n/);
  const body=split>=0?raw.slice(split).replace(/^\r?\n\r?\n/,""):raw;
  return {message:{id:payload.message.id,sender:payload.message.sender,recipient:payload.message.recipient,subject:payload.message.subject,received_at:payload.message.received_at,body:body.slice(0,150000)}};
 });
