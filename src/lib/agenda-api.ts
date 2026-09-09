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

function sameEvent(a: AgendaEvento, b: AgendaEvento) {
  return a.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase() && a.data === b.data && a.bloqueio === b.bloqueio && String(a.observacoes || "").trim() === String(b.observacoes || "").trim();
}

function salvarLocal(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }): AgendaEvento {
  const now = new Date().toISOString();
  const list = readLocal();
  const id = input.id || crypto.randomUUID();
  const next: AgendaEvento = {
    id,
    titulo: input.titulo.trim(),
    data: input.data.slice(0, 10),
    observacoes: String(input.observacoes || ""),
    bloqueio: input.bloqueio || "nenhum",
    createdAt: list.find((x) => x.id === id)?.createdAt || now,
    updatedAt: now,
  };
  const out = list.some((x) => x.id === id)
    ? list.map((x) => (x.id === id ? next : x))
    : [...list.filter((x) => !sameEvent(x, next)), next];
  writeLocal(out);
  return next;
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
      // O Supabase é legado e pode não estar disponível/autenticado no ambiente
      // oficial. Mantemos a agenda funcional localmente até a migração definitiva.
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
    // Não deixa uma integração Supabase legada derrubar a Agenda oficial.
    return readLocal().sort((a, b) => a.data.localeCompare(b.data));
  }
}

export async function salvarAgendaEvento(input: { id?: string; titulo: string; data: string; observacoes?: string; bloqueio?: AgendaBloqueio }) {
  const titulo = String(input.titulo || "").trim();
  const data = String(input.data || "").slice(0, 10);
  if (!titulo) throw new Error("Informe o título do compromisso.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Informe uma data válida.");

  try {
    const saved = await salvarAgendaEventoFn({ data: { ...input, titulo, data } as any });
    const parsed = parse(saved);
    const list = readLocal();
    const out = list.some((x) => x.id === parsed.id)
      ? list.map((x) => (x.id === parsed.id ? parsed : x))
      : [...list.filter((x) => !sameEvent(x, parsed)), parsed];
    writeLocal(out);
    return parsed;
  } catch (e) {
    // A Agenda não pode ficar indisponível porque a antiga autenticação/tabela
    // Supabase não existe mais no ambiente oficial. Salva imediatamente no
    // espelho local e mantém edição/exclusão funcionando no dispositivo.
    console.warn("[Agenda] Backend legado indisponível; salvando localmente.", e);
    return salvarLocal({ ...input, titulo, data });
  }
}

export async function excluirAgendaEvento(id: string) {
  try {
    const result = await excluirAgendaEventoFn({ data: { id } });
    writeLocal(readLocal().filter((x) => x.id !== id));
    return result;
  } catch (e) {
    console.warn("[Agenda] Backend legado indisponível; removendo localmente.", e);
    writeLocal(readLocal().filter((x) => x.id !== id));
    return { ok: true };
  }
}
