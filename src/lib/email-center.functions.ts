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
function parseReadableEmail(raw: string): string {
 const splitPart=(source:string)=>{
  const normalized=source.replace(/\r\n/g,"\n");
  const index=normalized.indexOf("\n\n");
  const header=index>=0?normalized.slice(0,index):"";
  const content=index>=0?normalized.slice(index+2):normalized;
  const unfolded=header.replace(/\n[ \t]+/g," ");
  const get=(name:string)=>unfolded.match(new RegExp("^"+name+":\\s*(.*)$","im"))?.[1]??"";
  return {content,type:get("Content-Type"),encoding:get("Content-Transfer-Encoding")};
 };
 const decode=(value:string,encoding:string)=>{
  if(/base64/i.test(encoding)){
   try {const bytes=Uint8Array.from(atob(value.replace(/\s/g,"")),x=>x.charCodeAt(0));return new TextDecoder().decode(bytes);}catch{return "";}
  }
  if(/quoted-printable/i.test(encoding)){
   const joined=value.replace(/=\n/g,"");
   const bytes:number[]=[];
   for(let i=0;i<joined.length;i++){
    if(joined[i]==="="&&/^[0-9a-f]{2}$/i.test(joined.slice(i+1,i+3))){bytes.push(parseInt(joined.slice(i+1,i+3),16));i+=2;}
    else {bytes.push(...new TextEncoder().encode(joined[i]));}
   }
   return new TextDecoder().decode(new Uint8Array(bytes));
  }
  return value;
 };
 const collect=(source:string,depth:number):{plain:string[];html:string[]}=>{
  if(depth>8)return {plain:[],html:[]};
  const {content,type,encoding}=splitPart(source);
  const boundary=type.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1]??type.match(/boundary\s*=\s*([^;\s]+)/i)?.[1];
  if(/multipart\//i.test(type)&&boundary){
   const chunks=content.split("--"+boundary).slice(1);
   const output={plain:[] as string[],html:[] as string[]};
   for(const chunk of chunks){if(chunk.startsWith("--"))break;const part=collect(chunk.replace(/^\n/,""),depth+1);output.plain.push(...part.plain);output.html.push(...part.html);}
   return output;
  }
  if(/attachment/i.test(type))return {plain:[],html:[]};
  const decoded=decode(content,encoding).trim();
  if(/text\/html/i.test(type))return {plain:[],html:[decoded]};
  if(!type||/text\/plain/i.test(type))return {plain:[decoded],html:[]};
  return {plain:[],html:[]};
 };
 const result=collect(raw,0);
 if(result.plain.length)return result.plain.filter(Boolean).join("\n\n").slice(0,150000);
 if(result.html.length)return result.html.join("\n").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p\s*>/gi,"\n\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim().slice(0,150000);
 return "(Esta mensagem não contém texto legível.)";
}
export type ReceivedAttachment = {filename:string;contentType:string;contentBase64:string;size:number};
function extractReceivedAttachments(raw:string):ReceivedAttachment[]{
 const results:ReceivedAttachment[]=[];
 const scan=(source:string,depth:number)=>{
  if(depth>8||results.length>=10)return;
  const normalized=source.replace(/\r\n/g,"\n");
  const split=normalized.indexOf("\n\n");
  if(split<0)return;
  const header=normalized.slice(0,split).replace(/\n[ \t]+/g," ");
  const body=normalized.slice(split+2);
  const get=(name:string)=>header.match(new RegExp("^"+name+":\\s*(.*)$","im"))?.[1]??"";
  const type=get("Content-Type");
  const disposition=get("Content-Disposition");
  const boundary=type.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1]??type.match(/boundary\s*=\s*([^;\s]+)/i)?.[1];
  if(/multipart\//i.test(type)&&boundary){
   for(const chunk of body.split("--"+boundary).slice(1)){
    if(chunk.startsWith("--"))break;
    scan(chunk.replace(/^\n/,""),depth+1);
   }
   return;
  }
  const name=disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1]??type.match(/name\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1];
  if(!name||!(/attachment/i.test(disposition)||/filename\s*=/i.test(disposition)))return;
  const filename=name.replace(/[\\/\x00-\x1f]/g,"_").slice(0,150);
  if(!filename)return;
  const encoding=get("Content-Transfer-Encoding");
  let base64="";
  if(/base64/i.test(encoding))base64=body.replace(/\s/g,"");
  else if(/quoted-printable/i.test(encoding)){
   const joined=body.replace(/=\n/g,"");
   const bytes:number[]=[];
   for(let i=0;i<joined.length;i++){
    if(joined[i]==="="&&/^[0-9a-f]{2}$/i.test(joined.slice(i+1,i+3))){bytes.push(parseInt(joined.slice(i+1,i+3),16));i+=2;}
    else bytes.push(...new TextEncoder().encode(joined[i]));
   }
   let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
   base64=btoa(binary);
  }else{
   const bytes=new TextEncoder().encode(body.trimEnd());
   let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
   base64=btoa(binary);
  }
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))return;
  const size=Math.floor(base64.length*3/4)-(base64.endsWith("==")?2:base64.endsWith("=")?1:0);
  if(size>0&&size<=5*1024*1024&&results.reduce((n,a)=>n+a.size,0)+size<=7*1024*1024){
   results.push({filename,contentType:type.split(";")[0].trim()||"application/octet-stream",contentBase64:base64,size});
  }
 };
 scan(raw,0);
 return results;
}
export type MailDetail = {id:string;sender:string;recipient:string;subject:string;received_at:string;body:string;attachments:ReceivedAttachment[]};
export const readAdminEmail = createServerFn({method:"POST"})
 .validator((input:{accessToken:string;id:string})=>input)
 .handler(async ({data}):Promise<{message:MailDetail}>=>{
  const {token,receiver}=await authorizedReceiver(data.accessToken);
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(data.id)) throw new Error("Mensagem inválida.");
  const response=await receiver.fetch("https://lhl-email-receiver/internal/message?id="+encodeURIComponent(data.id),{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error("Não foi possível abrir esta mensagem.");
  const payload=await response.json() as {message:Omit<MailDetail,"body">&{raw_message:string}};
  const raw=payload.message.raw_message;
  const body=parseReadableEmail(raw);
  return {message:{id:payload.message.id,sender:payload.message.sender,recipient:payload.message.recipient,subject:payload.message.subject,received_at:payload.message.received_at,body:body.slice(0,150000),attachments:extractReceivedAttachments(raw)}};
 });
