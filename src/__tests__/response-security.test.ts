import { describe, expect, it } from "vitest";
import { applyResponseSecurityHeaders, shouldDisableCache, shouldNoIndex } from "@/lib/response-security";

describe("response security", () => {
  it("marca áreas privadas e páginas de confirmação como noindex", () => {
    expect(shouldNoIndex("/admin")).toBe(true);
    expect(shouldNoIndex("/admin/financeiro")).toBe(true);
    expect(shouldNoIndex("/contract/abc")).toBe(true);
    expect(shouldNoIndex("/checklist/abc")).toBe(true);
    expect(shouldNoIndex("/obrigado")).toBe(true);
    expect(shouldNoIndex("/orcamento-obrigado")).toBe(true);
  });

  it("mantém páginas comerciais indexáveis e com cache permitido", () => {
    expect(shouldNoIndex("/")).toBe(false);
    expect(shouldNoIndex("/catalogo")).toBe(false);
    expect(shouldNoIndex("/orcamento")).toBe(false);
    expect(shouldDisableCache("/catalogo")).toBe(false);
  });

  it("desabilita cache em páginas que podem conter dados pessoais ou administrativos", () => {
    expect(shouldDisableCache("/admin/clientes")).toBe(true);
    expect(shouldDisableCache("/contract/abc")).toBe(true);
    expect(shouldDisableCache("/checklist/abc")).toBe(true);
    expect(shouldDisableCache("/auth")).toBe(true);
  });

  it("aplica cabeçalhos de segurança e sobrescreve cache inseguro em área privada", async () => {
    const request = new Request("https://www.lhlfestas.com.br/admin");
    const response = new Response("ok", {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });

    const secured = applyResponseSecurityHeaders(request, response);

    expect(secured.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(secured.headers.get("pragma")).toBe("no-cache");
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
    expect(secured.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(secured.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(secured.headers.get("permissions-policy")).toContain("camera=()");
    expect(secured.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(secured.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await secured.text()).toBe("ok");
  });
});
