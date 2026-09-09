import { createServerFn } from "@tanstack/react-start";
import type { AgendaInput } from "./agenda.server";

type AuthAgendaInput = AgendaInput & { _accessToken: string };
type AuthDeleteInput = { id: string; _accessToken: string };

export const salvarAgendaEventoFn = createServerFn({ method: "POST" })
  .inputValidator((input: AuthAgendaInput) => input)
  .handler(async ({ data }) => {
    const auth = await import("./admin-action-auth.server");
    const context = await auth.contextFromAdminAccessToken(data._accessToken);
    const clean = auth.stripAccessToken(data) as AgendaInput;
    const m = await import("./agenda.server");
    return m.salvarAgendaEventoServer(clean, context as any);
  });

export const excluirAgendaEventoFn = createServerFn({ method: "POST" })
  .inputValidator((input: AuthDeleteInput) => input)
  .handler(async ({ data }) => {
    const auth = await import("./admin-action-auth.server");
    const context = await auth.contextFromAdminAccessToken(data._accessToken);
    const m = await import("./agenda.server");
    return m.excluirAgendaEventoServer(data.id, context as any);
  });
