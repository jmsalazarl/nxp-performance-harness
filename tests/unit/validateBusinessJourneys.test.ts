import { describe, expect, it } from "vitest";
import { validateBusinessJourneys } from "../../src/services/validateBusinessJourneys.js";

const validJourney = {
  id: "checkout",
  name: "Checkout",
  type: "synchronous" as const,
  priority: "critical" as const,
  shareOfUsersPercent: 15,
  frequencyPerUserPerDay: 1,
  averageDurationSeconds: 120,
  operations: [
    { name: "create_order", count: 1, type: "write" as const },
    { name: "payment_status", count: 2, type: "read" as const },
  ],
  slo: {
    latencyP95Ms: 800,
    errorRatePercent: 1,
    availabilityPercent: 99.9,
  },
};

describe("validateBusinessJourneys", () => {
  it("acepta un journey estructurado valido", () => {
    expect(validateBusinessJourneys([validJourney])).toEqual({ valid: true, errors: [] });
  });

  it("rechaza journeys sin operaciones", () => {
    const result = validateBusinessJourneys([{ ...validJourney, operations: [] }]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: "journeys[0].operations",
      rule: "required",
    }));
  });

  it("rechaza porcentajes y cantidades invalidas", () => {
    const result = validateBusinessJourneys([{
      ...validJourney,
      shareOfUsersPercent: 101,
      operations: [{ name: "read", count: 0, type: "read" as const }],
    }]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "journeys[0].shareOfUsersPercent", rule: "invalid_range" }),
      expect.objectContaining({ path: "journeys[0].operations[0].count", rule: "invalid_count" }),
    ]));
  });
});
