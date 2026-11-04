import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../src/models/analysis.types.js";
import { generateTestPlan } from "../../src/services/generateTestPlan.js";

const validAnalysis: AnalysisInput = {
  schemaVersion: 1,
  analysisId: "analysis-plan",
  version: 1,
  status: "draft",
  applicationType: "web",
  testObjectives: ["capacity", "stress"],
  answers: [
    { path: "demand.dailyActiveUsers", value: 1000, source: "user", confidence: "high" },
    { path: "behavior.peakSharePercent", value: 25, source: "user", confidence: "high" },
    { path: "behavior.peakWindowMinutes", value: 60, source: "user", confidence: "high" },
    { path: "behavior.stressMultiplier", value: 2, source: "user", confidence: "high" },
    { path: "slo.latencyP95Ms", value: 500, source: "user", confidence: "high" },
    { path: "slo.errorRatePercent", value: 1, source: "user", confidence: "high" },
  ],
  journeys: [{
    id: "catalog",
    name: "Catalogo",
    type: "synchronous",
    priority: "high",
    shareOfUsersPercent: 100,
    frequencyPerUserPerDay: 2,
    averageDurationSeconds: 30,
    operations: [{ name: "list_products", count: 2, type: "read" }],
  }],
  references: [],
  createdAt: "2026-11-04T00:00:00Z",
};

describe("generateTestPlan", () => {
  it("genera stages y criterios de aceptacion", () => {
    const plan = generateTestPlan(validAnalysis);

    expect(plan.canApprove).toBe(true);
    expect(plan.profile).toBe("capacity-stepped");
    expect(plan.stages.map((stage) => stage.type)).toEqual([
      "warmup", "measurement", "transition", "measurement", "transition", "measurement",
    ]);
    expect(plan.acceptanceCriteria).toEqual(expect.arrayContaining([
      "El p95 debe ser menor o igual a 500 ms",
      "La tasa de errores debe ser menor o igual a 1%",
    ]));
  });

  it("bloquea aprobacion si faltan datos minimos", () => {
    const plan = generateTestPlan({ ...validAnalysis, answers: [], journeys: [] });

    expect(plan.canApprove).toBe(false);
    expect(plan.stages).toHaveLength(0);
    expect(plan.missingData).toEqual(expect.arrayContaining(["journeys", "demand.dailyActiveUsers"]));
  });
});
