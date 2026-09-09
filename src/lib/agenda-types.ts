export type AgendaBloqueio = "nenhum" | "montagens" | "total";

export type AgendaEvento = {
  id: string;
  titulo: string;
  data: string;
  observacoes: string;
  bloqueio: AgendaBloqueio;
  createdAt: string;
  updatedAt: string;
};

export const AGENDA_BLOQUEIO_LABEL: Record<AgendaBloqueio, string> = {
  nenhum: "Somente compromisso",
  montagens: "Bloquear montagens",
  total: "Bloquear agenda inteira",
};
