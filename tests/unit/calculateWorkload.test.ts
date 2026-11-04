import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../src/models/analysis.types.js";
import { calculateWorkload } from "../../src/services/calculateWorkload.js";

const analysis: AnalysisInput = {
  schemaVersion: 1,
  analysisId: "analysis-workload",
  version: 1,
  status: "draft",
  applicationType: "web",
  testObjectives: ["capacity", "stress", "soak"],
  answers: [
    { path: "demand.dailyActiveUsers", value: 1000, source: "user", confidence: "high" },
    { path: "behavior.peakSharePercent", value: 25, source: "user", confidence: "high" },
    { path: "behavior.peakWindowMinutes", value: 60, source: "user", confidence: "high" },
    { path: "behavior.stressMultiplier", value: 2, source: "user", confidence: "high" },
  ],
  journeys: [{
    id: "checkout",
    name: "Checkout",
    type: "synchronous",
    priority: "critical",
    shareOfUsersPercent: 50,
    frequencyPerUserPerDay: 2,
    averageDurationSeconds: 60,
    operations: [
      { name: "read_cart", count: 2, type: "read" },
      { name: "create_order", count: 1, type: "write" },
    ],
  }],
  references: [],
  createdAt: "2026-11-04T00:00:00Z",
};

describe("calculateWorkload", () => {
  it("calcula sesiones, tasas y concurrencia por journey", () => {
    const result = calculateWorkload(analysis);
    const metric = result.metrics[0];

    expect(result.valid).toBe(true);
    expect(metric).toMatchObject({
      dailySessions: 1000,
      peakSessions: 250,
      requestRate: 0.20833333333333334,
      concurrency: 4.166666666666667,
    });
  });

  it("genera escenarios normal, peak, stress y soak", () => {
    const result = calculateWorkload(analysis);

    expect(result.scenarios.map((scenario) => scenario.type)).toEqual(["normal", "peak", "stress", "soak"]);
    expect(result.scenarios.find((scenario) => scenario.type === "stress")?.targetRate).toBeCloseTo(0.1389, 3);
  });

  it("reporta datos faltantes sin inventar escenarios", () => {
    const result = calculateWorkload({ ...analysis, answers: [], journeys: [] });

    expect(result.valid).toBe(false);
    expect(result.scenarios).toHaveLength(0);
    expect(result.missingData).toEqual(expect.arrayContaining([
      "journeys",
      "demand.dailyActiveUsers",
      "behavior.peakSharePercent",
      "behavior.peakWindowMinutes",
    ]));
  });
});
