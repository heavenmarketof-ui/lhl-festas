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
 .validator((input: { accessToken: string; to: string; subject: string; body: string }) => input)
 .handler(async ({ data }): Promise<{ id: string }> => {
  const { supabase, userId } = await contextFromAdminAccessToken(data.accessToken);
  const { data: allowed, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || allowed !== true) throw new Error("Acesso restrito a administradores.");
  const to = data.to.trim();
  const subject = data.subject.trim();
  const body = data.body.trim();
  if (!/^[^@ ,;<>]+@[^@ ,;<>]+[.][^@ ,;<>]+$/.test(to) || to.length > 254) throw new Error("Informe um e-mail de destino válido.");
  if (!subject || subject.length > 200) throw new Error("O assunto deve ter entre 1 e 200 caracteres.");
  if (!body || body.length > 50000) throw new Error("A mensagem deve ter entre 1 e 50.000 caracteres.");
  const apiKey = getServerEnv("RESEND_API_KEY");
  if (!apiKey) throw new Error("Envio indisponível: configure RESEND_API_KEY como segredo no ambiente de testes.");
  const response = await fetch("https://api.resend.com/emails", {
   method: "POST",
   headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
   body: JSON.stringify({ from: "LHL Festas <contato@lhlfestas.com.br>", to: [to], subject, text: body }),
   signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) {
   console.error("Mail send provider HTTP", response.status);
   throw new Error(response.status === 403 ? "Domínio ainda não autorizado no provedor de envio." : "Falha ao enviar e-mail. Confira a configuração do provedor e tente novamente.");
  }
  return { id: payload.id };
 });
