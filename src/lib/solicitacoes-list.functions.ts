import { createServerFn } from "@tanstack/react-start";

type AuthData = { _accessToken: string };

export const listarSolicitacoesFn = createServerFn({ method: "POST" })
  .validator((input: AuthData) => input)
  .handler(async ({ data }) => {
    const authModule = await import("./admin-action-auth.server");
    const context = await authModule.contextFromAdminAccessToken(data._accessToken);
    const m = await import("./solicitacoes.server");
    await m.assertAdmin(context as any);
    const db = await m.adminDb();
    const { data: rows, error } = await db
      .from(m.TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error("Não foi possível carregar as solicitações financeiras.");
    return Array.isArray(rows) ? rows : [];
  });
