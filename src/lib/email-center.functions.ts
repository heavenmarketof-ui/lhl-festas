import { createServerFn } from "@tanstack/react-start";
import { contextFromAdminAccessToken } from "@/lib/admin-action-auth.server";
import { getServerEnv } from "@/lib/runtime-env.server";

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
  const url = getServerEnv("MAIL_WORKER_URL");
  if (!token || !url || !url.startsWith("https://")) throw new Error("Central de e-mails ainda não configurada no servidor.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
   const response = await fetch(new URL("/internal/messages",url), {
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
