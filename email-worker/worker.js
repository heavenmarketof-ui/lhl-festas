// Cloudflare Email Worker. Do not activate routing until D1 is bound and tested.
// D1 binding: MAIL_DB. Secrets: MAIL_ADMIN_TOKEN (for trusted server only).
const address = "contato@lhlfestas.com.br";
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return json({ready: Boolean(env.MAIL_DB),service:"lhl-email-receiver"});
  if (url.pathname !== "/internal/messages" || request.method !== "GET") return new Response("Not found",{status:404});
  const auth = request.headers.get("authorization");
  if (!env.MAIL_ADMIN_TOKEN || auth !== "Bearer " + env.MAIL_ADMIN_TOKEN) return json({error:"Unauthorized"},401);
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
