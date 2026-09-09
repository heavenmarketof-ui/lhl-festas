import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgendaInput } from "./agenda.server";

export const salvarAgendaEventoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AgendaInput) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./agenda.server");
    return m.salvarAgendaEventoServer(data, context as any);
  });

export const excluirAgendaEventoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const m = await import("./agenda.server");
    return m.excluirAgendaEventoServer(data.id, context as any);
  });
