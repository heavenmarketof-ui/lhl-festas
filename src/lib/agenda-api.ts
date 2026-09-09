import { supabase } from "@/integrations/supabase/client";
import { excluirAgendaEventoFn, salvarAgendaEventoFn } from "./agenda.functions";
import type { AgendaEvento, AgendaBloqueio } from "./agenda-types";

const LS_KEY = "lhl_agenda_eventos";

function parse(r: any): AgendaEvento {
  return {
    id: String(r.id || ""),
    titulo: String(r.titulo || ""),
    data: String(r.data || "").slice(0, 10),
    observacoes: String(r.observacoes || ""),
    bloqueio: (r.bloqueio === "montagens" || r.bloqueio === "total" ? r.bloqueio : "nenhum") as AgendaBloqueio,
    createdAt: String(r.created_at || r.createdAt || ""),
    updatedAt: String(r.updated_at || r.updatedAt || ""),
  };
}

function readLocal(): AgendaEvento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(parse).filter((e) => e.id && e.data) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: AgendaEvento[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function isMissingTableError(message: string) {
  const m = message.toLowerCase();
  return m.includes("agenda_eventos") && (m.includes("schema cache") || m.includes("does not exist") || m.includes("not find"));
}

function sameEvent(a: AgendaEvento, b: AgendaEvento) {
  return a.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase() && a.data === b.data && a.bloqueio === b.bloqueio && String(a.observacoes || "").trim() === String(b.observacoes || "").trim();
}

async function migrarLocaisParaRemoto(remotos: AgendaEvento[]) {
  const locais = readLocal();
  if (!locais.length) return remotos;
  const result = [...remotos];
  let mudou = false;
  for (const local of locais) {
    if (result.some((r) => sameEvent(r, local))) continue;
    try {
      const saved = await salvarAgendaEventoFn({ data: { titulo: local.titulo, data: local.data, observacoes: local.observacoes, bloqueio: local.bloqueio } as any });
      result.push(parse(saved));
      mudou = true;
    } catch {
      return remotos;
    }
  }
  if (mudou || locais.length) writeLocal(result);
  return result;
}

export async function fetchAgendaEventos(): Promise<AgendaEvento[]> {
  const { data, error } = await supabase.from("agenda_eventos" as any).select("*").order("data", { ascending: true });
  if (error) {
    if (isMissingTableError(error.message || "")) return readLocal().sort((a, b) => a.data.localeCompare(b.data));
    throw new Error("Não foi possível carregar a agenda interna.");
  }
  const remoto = (data || []).map(parse);
  const sincronizado = await migrarLocaisParaRemoto(remoto);
  writeLocal(sincronizado);
  return sincronizado.sort((a, b) => a.data.localeCompare(b.data));
}

export async function salvarAgendaEvento(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }) {
  try {
    const saved = await salvarAgendaEventoFn({ data: input as any });
    const parsed = parse(saved);
    const list = readLocal();
    const out = list.some((x) => x.id === parsed.id) ? list.map((x) => (x.id === parsed.id ? parsed : x)) : [...list.filter((x) => !sameEvent(x, parsed)), parsed];
    writeLocal(out);
    return parsed;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e || "");
    if (!isMissingTableError(message)) throw new Error("Não foi possível salvar o compromisso.");
    const now = new Date().toISOString();
    const list = readLocal();
    const id = input.id || crypto.randomUUID();
    const next: AgendaEvento = { id, titulo: input.titulo.trim(), data: input.data.slice(0, 10), observacoes: String(input.observacoes || ""), bloqueio: input.bloqueio || "nenhum", createdAt: list.find((x) => x.id === id)?.createdAt || now, updatedAt: now };
    const out = list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? next : x)) : [...list, next];
    writeLocal(out);
    return next;
  }
}

export async function excluirAgendaEvento(id: string) {
  try {
    const result = await excluirAgendaEventoFn({ data: { id } });
    writeLocal(readLocal().filter((x) => x.id !== id));
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e || "");
    if (!isMissingTableError(message)) throw new Error("Não foi possível remover o compromisso.");
    writeLocal(readLocal().filter((x) => x.id !== id));
    return { ok: true };
  }
}
