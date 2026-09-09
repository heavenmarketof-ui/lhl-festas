import { describe, expect, it } from "vitest";
import { extractLinkedLeadId, leadMarker, matchingLeadId } from "@/lib/journey-link";

describe("journey link", () => {
  it("vincula somente quando telefone e data da festa conferem", () => {
    const ctx = { leadId: "LEAD-2026-0001", whatsapp: "(11) 99999-0000", dataFesta: "2026-10-10" };
    expect(matchingLeadId(ctx, "11 99999-0000", "2026-10-10")).toBe("LEAD-2026-0001");
    expect(matchingLeadId(ctx, "11 98888-0000", "2026-10-10")).toBe("");
    expect(matchingLeadId(ctx, "11 99999-0000", "2026-10-11")).toBe("");
  });

  it("gera e recupera marcador sanitizado", () => {
    const marker = leadMarker("LEAD-2026-0001");
    expect(marker).toBe("Lead CRM vinculado: LEAD-2026-0001");
    expect(extractLinkedLeadId(`Origem: instagram\n${marker}\nCampanha: festa`)).toBe("LEAD-2026-0001");
  });
});
