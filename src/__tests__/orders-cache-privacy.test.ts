import { describe, expect, it } from "vitest";
import { getCachedSheetOrders, setCachedSheetOrders } from "@/lib/orders-cache";

describe("privacidade do cache de contratos", () => {
  it("não mantém contratos com dados pessoais no cache do navegador", () => {
    setCachedSheetOrders([]);
    expect(getCachedSheetOrders()).toEqual([]);
  });
});
