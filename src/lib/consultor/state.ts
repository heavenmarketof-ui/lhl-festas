// Persistência do estado do Consultor durante a mesma sessão.
// Usa sessionStorage — reabrir na mesma navegação retoma exatamente
// da etapa onde parou; ao fechar a aba, começa do zero.

import type { ConsultorState, StepId } from "./types";

const KEY = "lhl_consultor_state";

export const INITIAL_STATE: ConsultorState = {
  step: "welcome",
  history: [],
  answers: {},
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadState(): ConsultorState {
  if (!isBrowser()) return INITIAL_STATE;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as ConsultorState;
    if (!parsed || typeof parsed !== "object") return INITIAL_STATE;
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveState(state: ConsultorState): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* noop */ }
}

export function clearState(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* noop */ }
}

// Ordem canônica das etapas — usada para a barra de progresso.
export const STEP_ORDER: StepId[] = [
  "welcome",
  "name",
  "date",
  "city",
  "age",
  "venue",
  "modality",
  "theme",
  "kits",
  "photo",
  "summary",
];

export function progressRatio(step: StepId): number {
  const i = STEP_ORDER.indexOf(step);
  if (i < 0) return 0;
  return i / (STEP_ORDER.length - 1);
}
