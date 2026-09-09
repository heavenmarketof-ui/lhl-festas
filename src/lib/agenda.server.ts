import type { AgendaBloqueio } from "./agenda-types";

export type Ctx = { supabase: any; userId: string; claims?: any };
export type Ator = { userId: string; email: string };

async function assertAdmin(context: Ctx): Promise<Ator> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
  let email = String(context.claims?.email || "");
  if (!email) {
    const { data: u } = await context.supabase.auth.getUser();
    email = String(u?.user?.email || "");
  }
  return { userId: context.userId, email };
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const txt = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const dataISO = (v: unknown) => {
  const s = txt(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const bloqueioValido = (v: unknown): AgendaBloqueio =>
  v === "montagens" || v === "total" ? v : "nenhum";

export type AgendaInput = {
  id?: string;
  titulo: string;
  data: string;
  observacoes?: string;
  bloqueio?: AgendaBloqueio;
};

export async function salvarAgendaEventoServer(input: AgendaInput, context: Ctx) {
  const ator = await assertAdmin(context);
  const titulo = txt(input.titulo, 180);
  const data = dataISO(input.data);
  if (!titulo) throw new Error("Informe o título do compromisso.");
  if (!data) throw new Error("Informe uma data válida.");

  const row = {
    titulo,
    data,
    observacoes: txt(input.observacoes, 1500) || null,
    bloqueio: bloqueioValido(input.bloqueio),
  };
  const admin = await db();
  if (input.id) {
    const { data: saved, error } = await admin
      .from("agenda_eventos")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!saved) throw new Error("Compromisso não encontrado.");
    return saved;
  }

  const { data: saved, error } = await admin
    .from("agenda_eventos")
    .insert({ ...row, criado_por: ator.userId, criado_por_email: ator.email || null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return saved;
}

export async function excluirAgendaEventoServer(idRaw: string, context: Ctx) {
  await assertAdmin(context);
  const id = txt(idRaw, 50);
  if (!id) throw new Error("Compromisso inválido.");
  const admin = await db();
  const { error } = await admin.from("agenda_eventos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
