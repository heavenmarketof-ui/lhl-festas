import { supabase } from "@/integrations/supabase/client";
import { excluirAgendaEventoFn, salvarAgendaEventoFn } from "./agenda.functions";
import { withAdminAccessToken } from "./admin-action-auth";
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
  } catch { return []; }
}

function writeLocal(list: AgendaEvento[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function sameEvent(a: AgendaEvento, b: AgendaEvento) {
  return a.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase() && a.data === b.data && a.bloqueio === b.bloqueio && String(a.observacoes || "").trim() === String(b.observacoes || "").trim();
}

function salvarLocal(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }): AgendaEvento {
  const now = new Date().toISOString();
  const list = readLocal();
  const id = input.id || crypto.randomUUID();
  const next: AgendaEvento = { id, titulo: input.titulo.trim(), data: input.data.slice(0, 10), observacoes: String(input.observacoes || ""), bloqueio: input.bloqueio || "nenhum", createdAt: list.find((x) => x.id === id)?.createdAt || now, updatedAt: now };
  const out = list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? next : x)) : [...list.filter((x) => !sameEvent(x, next)), next];
  writeLocal(out);
  return next;
}

async function salvarRemoto(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }) {
  const data = await withAdminAccessToken(input as Record<string, unknown>);
  return salvarAgendaEventoFn({ data } as any);
}

async function migrarLocaisParaRemoto(remotos: AgendaEvento[]) {
  const locais = readLocal();
  if (!locais.length) return remotos;
  const result = [...remotos];
  let mudou = false;
  for (const local of locais) {
    if (result.some((r) => sameEvent(r, local))) continue;
    try {
      const saved = await salvarRemoto({ titulo: local.titulo, data: local.data, observacoes: local.observacoes, bloqueio: local.bloqueio });
      result.push(parse(saved));
      mudou = true;
    } catch {
      return remotos.length ? [...remotos, ...locais.filter((l) => !remotos.some((r) => sameEvent(r, l)))] : locais;
    }
  }
  if (mudou || locais.length) writeLocal(result);
  return result;
}

export async function fetchAgendaEventos(): Promise<AgendaEvento[]> {
  try {
    const { data, error } = await supabase.from("agenda_eventos" as any).select("*").order("data", { ascending: true });
    if (error) throw error;
    const remoto = (data || []).map(parse);
    const sincronizado = await migrarLocaisParaRemoto(remoto);
    writeLocal(sincronizado);
    return sincronizado.sort((a, b) => a.data.localeCompare(b.data));
  } catch {
    return readLocal().sort((a, b) => a.data.localeCompare(b.data));
  }
}

export async function salvarAgendaEvento(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }) {
  const titulo = String(input.titulo || "").trim();
  const dataEvento = String(input.data || "").slice(0, 10);
  if (!titulo) throw new Error("Informe o título do compromisso.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEvento)) throw new Error("Informe uma data válida.");

  try {
    const saved = await salvarRemoto({ ...input, titulo, data: dataEvento });
    const parsed = parse(saved);
    const list = readLocal();
    const out = list.some((x) => x.id === parsed.id) ? list.map((x) => (x.id === parsed.id ? parsed : x)) : [...list.filter((x) => !sameEvent(x, parsed)), parsed];
    writeLocal(out);
    return parsed;
  } catch (e) {
    // Modo de contingência: não perde o compromisso se o backend estiver fora,
    // mas a via normal agora é remota/autenticada e compartilhada entre aparelhos.
    console.warn("[Agenda] Falha remota; salvando cópia local de contingência.", e);
    return salvarLocal({ ...input, titulo, data: dataEvento });
  }
}

export async function excluirAgendaEvento(id: string) {
  try {
    const data = await withAdminAccessToken({ id });
    const result = await excluirAgendaEventoFn({ data } as any);
    writeLocal(readLocal().filter((x) => x.id !== id));
    return result;
  } catch (e) {
    console.warn("[Agenda] Falha remota; removendo apenas da contingência local.", e);
    writeLocal(readLocal().filter((x) => x.id !== id));
    return { ok: true };
  }
}
