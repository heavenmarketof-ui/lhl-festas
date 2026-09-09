import { describe, expect, it } from "vitest";
import { deriveCampaignAttribution } from "../campaign-attribution";

describe("atribuição de campanha LHL", () => {
  it("mantém acesso orgânico como Site", () => {
    expect(deriveCampaignAttribution({})).toEqual({
      origemCliente: "Site",
      veioAnuncio: "Não",
      observacao: "",
    });
  });

  it("identifica Google Ads pelo gclid", () => {
    const r = deriveCampaignAttribution({ gclid: "abc123" });
    expect(r.origemCliente).toBe("Google Ads");
    expect(r.veioAnuncio).toBe("Sim");
    expect(r.observacao).toContain("gclid=presente");
    expect(r.observacao).not.toContain("abc123");
  });

  it("identifica Meta Ads pelo fbclid", () => {
    const r = deriveCampaignAttribution({ fbclid: "xyz" });
    expect(r.origemCliente).toBe("Meta Ads");
    expect(r.veioAnuncio).toBe("Sim");
  });

  it("preserva source, medium e campanha UTM", () => {
    const r = deriveCampaignAttribution({
      utm_source: "instagram",
      utm_medium: "paid_social",
      utm_campaign: "festa_com_montagem",
    });
    expect(r.origemCliente).toBe("instagram");
    expect(r.veioAnuncio).toBe("Sim");
    expect(r.observacao).toContain("utm_source=instagram");
    expect(r.observacao).toContain("utm_campaign=festa_com_montagem");
  });

  it("não classifica UTM orgânica como anúncio", () => {
    const r = deriveCampaignAttribution({ utm_source: "instagram", utm_medium: "organic" });
    expect(r.origemCliente).toBe("instagram");
    expect(r.veioAnuncio).toBe("Não");
  });
});
