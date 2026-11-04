import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../src/models/analysis.types.js";
import { analyzeAnalysisEvidence } from "../../src/services/analyzeAnalysisEvidence.js";

const baseAnalysis: AnalysisInput = {
  schemaVersion: 1,
  analysisId: "analysis-evidence",
  version: 1,
  status: "draft",
  applicationType: "web",
  testObjectives: ["capacity"],
  answers: [],
  references: [],
  createdAt: "2026-11-04T00:00:00Z",
};

describe("analyzeAnalysisEvidence", () => {
  it("clasifica un valor derivado como supuesto", () => {
    const result = analyzeAnalysisEvidence({
      ...baseAnalysis,
      answers: [{ path: "workload.arrivalRate", value: 10, source: "derived", confidence: "medium" }],
    });

    expect(result.confidence).toBe("medium");
    expect(result.assumptions).toContainEqual(expect.objectContaining({
      path: "workload.arrivalRate",
      source: "derived",
    }));
  });

  it("reduce la confianza ante respuestas contradictorias", () => {
    const result = analyzeAnalysisEvidence({
      ...baseAnalysis,
      answers: [
        { path: "demand.dailyActiveUsers", value: 100, source: "user", confidence: "high" },
        { path: "demand.dailyActiveUsers", value: 200, source: "user", confidence: "high" },
      ],
    });

    expect(result.confidence).toBe("low");
    expect(result.contradictions).toEqual(["demand.dailyActiveUsers"]);
    expect(result.errors).toContainEqual(expect.objectContaining({ rule: "contradictory_values" }));
  });

  it("mantiene confianza alta cuando no hay supuestos ni contradicciones", () => {
    const result = analyzeAnalysisEvidence({
      ...baseAnalysis,
      answers: [{ path: "demand.dailyActiveUsers", value: 100, source: "user", confidence: "high" }],
    });

    expect(result.confidence).toBe("high");
    expect(result.errors).toHaveLength(0);
  });
});
