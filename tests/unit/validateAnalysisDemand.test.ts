import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../src/models/analysis.types.js";
import { validateAnalysisDemand } from "../../src/services/validateAnalysisDemand.js";

const createAnalysis = (answers: AnalysisInput["answers"]): AnalysisInput => ({
  schemaVersion: 1,
  analysisId: "analysis-demand",
  version: 1,
  status: "draft",
  applicationType: "web",
  testObjectives: ["capacity"],
  answers,
  references: [],
  createdAt: "2026-11-04T00:00:00Z",
});

describe("validateAnalysisDemand", () => {
  it("identifica datos faltantes sin marcar el borrador como invalido", () => {
    const result = validateAnalysisDemand(createAnalysis([]));

    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual(expect.arrayContaining([
      "demand.dailyActiveUsers",
      "behavior.sessionsPerUserPerDay",
      "behavior.peakSharePercent",
      "behavior.peakWindowMinutes",
    ]));
  });

  it("rechaza porcentajes fuera de rango y valores negativos", () => {
    const result = validateAnalysisDemand(createAnalysis([
      { path: "demand.currentCustomers", value: -1, source: "user", confidence: "medium" },
      { path: "behavior.peakSharePercent", value: 101, source: "user", confidence: "medium" },
      { path: "behavior.peakWindowMinutes", value: 0, source: "user", confidence: "medium" },
    ]));

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: "negative_number" }),
      expect.objectContaining({ rule: "invalid_percentage" }),
      expect.objectContaining({ rule: "non_positive_number" }),
    ]));
  });

  it("rechaza usuarios activos por encima de los clientes actuales", () => {
    const result = validateAnalysisDemand(createAnalysis([
      { path: "demand.currentCustomers", value: 100, source: "user", confidence: "medium" },
      { path: "demand.dailyActiveUsers", value: 101, source: "user", confidence: "medium" },
    ]));

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ rule: "greater_than_population" }));
  });
});
