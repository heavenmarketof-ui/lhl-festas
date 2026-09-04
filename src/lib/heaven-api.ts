import { supabase } from "@/integrations/supabase/client";

export type HeavenLeadStatus = 
  | "Novo" 
  | "Contatado" 
  | "Demonstração agendada" 
  | "Em teste" 
  | "Convertido" 
  | "Perdido";

export const HEAVEN_LEAD_STATUSES: HeavenLeadStatus[] = [
  "Novo",
  "Contatado",
  "Demonstração agendada",
  "Em teste",
  "Convertido",
  "Perdido",
];

export type HeavenLead = {
  id?: string;
  created_at?: string;
  nome: string;
  empresa: string;
  whatsapp: string;
  email: string;
  cidade?: string;
  estado?: string;
  instagram?: string;
  organizacao_hoje?: string;
  atuacao?: string[];
  dificuldade?: string;
  status?: HeavenLeadStatus;
  observacoes?: string;
  data_ultimo_contato?: string;
  data_proximo_acompanhamento?: string;
};

export async function submitHeavenLead(lead: Omit<HeavenLead, "id" | "created_at" | "status">): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("heaven_leads").insert({
      nome: lead.nome,
      empresa: lead.empresa,
      whatsapp: lead.whatsapp,
      email: lead.email,
      cidade: lead.cidade,
      estado: lead.estado,
      instagram: lead.instagram,
      organizacao_hoje: lead.organizacao_hoje,
      atuacao: lead.atuacao,
      dificuldade: lead.dificuldade,
    });

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error("Erro ao salvar lead Heaven:", err);
    return { ok: false, error: err.message || "Erro desconhecido" };
  }
}

export async function fetchHeavenLeads(): Promise<HeavenLead[]> {
  const { data, error } = await supabase
    .from("heaven_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as HeavenLead[];
}

export async function updateHeavenLead(id: string, updates: Partial<HeavenLead>): Promise<void> {
  const { error } = await supabase
    .from("heaven_leads")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteHeavenLead(id: string): Promise<void> {
  const { error } = await supabase
    .from("heaven_leads")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
