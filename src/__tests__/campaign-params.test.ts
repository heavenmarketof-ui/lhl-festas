import { describe, expect, it } from "vitest";
import { mergeCampaignParams, sanitizeCampaignParams } from "@/lib/campaign-params";

describe("campaign params", () => {
  it("mantem apenas chaves permitidas", () => {
    expect(sanitizeCampaignParams({ utm_source: "meta", fbclid: "abc", estranho: "x" })).toEqual({
      utm_source: "meta",
      fbclid: "abc",
    });
  });

  it("preserva campanha anterior quando a navegacao atual nao sobrescreve", () => {
    expect(mergeCampaignParams(
      { utm_source: "instagram", utm_campaign: "setembro" },
      { utm_medium: "cpc" },
    )).toEqual({
      utm_source: "instagram",
      utm_campaign: "setembro",
      utm_medium: "cpc",
    });
  });

  it("a navegacao atual sobrescreve a chave correspondente", () => {
    expect(mergeCampaignParams(
      { utm_source: "instagram", gclid: "antigo" },
      { utm_source: "google", gclid: "novo" },
    )).toEqual({
      utm_source: "google",
      gclid: "novo",
    });
  });
});
