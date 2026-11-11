// Cloudflare Email Worker. Do not activate routing until D1 is bound and tested.
// D1 binding: MAIL_DB. Secrets: MAIL_ADMIN_TOKEN (for trusted server only).
const address = "contato@lhlfestas.com.br";
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return json({ready: Boolean(env.MAIL_DB),service:"lhl-email-receiver"});
  const isList = url.pathname === "/internal/messages" && request.method === "GET";
  const isSend = url.pathname === "/internal/send" && request.method === "POST";
  if (!isList && !isSend) return new Response("Not found",{status:404});
  const auth = request.headers.get("authorization");
  if (!env.MAIL_ADMIN_TOKEN || auth !== "Bearer " + env.MAIL_ADMIN_TOKEN) return json({error:"Unauthorized"},401);
  if (isSend) {
   if (!env.RESEND_API_KEY) return json({error:"Send service unavailable"},503);
   let input;
   try { input = await request.json(); } catch { return json({error:"Invalid JSON"},400); }
   const to = input?.to;
   const cc = input?.cc ?? [];
   const bcc = input?.bcc ?? [];
   const validList = (list) => Array.isArray(list) && list.every(x => typeof x === "string" && x.length <= 254 && /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/.test(x));
   const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
   const body = typeof input?.body === "string" ? input.body.trim() : "";
   if (!validList(to) || !to.length || !validList(cc) || !validList(bcc) || to.length + cc.length + bcc.length > 50 || !subject || subject.length > 200 || !body || body.length > 50000) return json({error:"Invalid message"},400);
   const attachments = input?.attachments ?? [];
   if (!Array.isArray(attachments) || attachments.length > 5 || attachments.some(a => !a || typeof a.filename !== "string" || !/^[^\\/]{1,150}$/.test(a.filename) || typeof a.content !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.content)) || attachments.reduce((n,a)=>n+a.content.length,0)>7_000_000) return json({error:"Invalid attachments"},400);
   try {
    const response = await fetch("https://api.resend.com/emails",{
     method:"POST",
     headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
     body:JSON.stringify({from:"LHL Festas <contato@lhlfestas.com.br>",to,cc,bcc,subject,text:body,attachments}),
     signal:AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(()=>({}));
    if (!response.ok || typeof result.id !== "string") {
     console.error("Resend HTTP",response.status);
     return json({error:"Provider rejected request",status:response.status},502);
    }
    return json({id:result.id});
   } catch(error) {
    console.error("Resend request failed",String(error));
    return json({error:"Send request failed"},502);
   }
  }
  if (!env.MAIL_DB) return json({error:"Storage unavailable"},503);
  const result = await env.MAIL_DB.prepare("SELECT id,message_id,sender,recipient,subject,received_at,status,linked_contract_id,linked_lead_id FROM mail_messages ORDER BY received_at DESC LIMIT 100").all();
  return json({messages:result.results});
 },
 async email(message,env) {
  if (message.to.toLowerCase() !== address) { message.setReject("Destinatário não autorizado"); return; }
  if (!env.MAIL_DB) { message.setReject("Caixa temporariamente indisponível"); return; }
  try {
   if (message.rawSize > 10*1024*1024) {message.setReject("Mensagem excede limite de 10 MB");return;}
   const raw = await new Response(message.raw).text();
   const id = crypto.randomUUID();
   const messageId = message.headers.get("message-id")?.trim() || id;
   const subject = message.headers.get("subject") || "";
   await env.MAIL_DB.prepare("INSERT OR IGNORE INTO mail_messages (id,message_id,sender,recipient,subject,raw_message) VALUES (?,?,?,?,?,?)").bind(id,messageId,message.from,message.to,subject,raw).run();
  } catch (err) {
   console.error("Email persistence failed",String(err));
   // Throw to signal delivery failure; never silently acknowledge a lost email.
   throw err;
  }
 }
};
