import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../src/models/analysis.types";
import { generateTestPlan } from "../../src/services/generateTestPlan";
import { createApprovedWorkloadContract, createNextAnalysisVersion } from "../../src/services/workloadContract.service";
import { exportForResourceProfileSizing, exportForSteppedCapacity, validateWorkloadRunCompatibility } from "../../src/services/workloadContract.export.service";

const analysis: AnalysisInput = {
  schemaVersion: 1,
  analysisId: "analysis-contract",
  version: 1,
  status: "draft",
  applicationType: "api",
  testObjectives: ["capacity"],
  answers: [
    { path: "demand.dailyActiveUsers", value: 1000, source: "user", confidence: "high" },
    { path: "behavior.peakSharePercent", value: 20, source: "user", confidence: "high" },
    { path: "behavior.peakWindowMinutes", value: 60, source: "user", confidence: "high" },
    { path: "behavior.stressMultiplier", value: 2, source: "user", confidence: "high" },
    { path: "slo.latencyP95Ms", value: 500, source: "user", confidence: "high" },
    { path: "slo.errorRatePercent", value: 1, source: "user", confidence: "high" },
  ],
  journeys: [{
    id: "search",
    name: "Busqueda",
    type: "synchronous",
    priority: "high",
    shareOfUsersPercent: 100,
    frequencyPerUserPerDay: 2,
    averageDurationSeconds: 5,
    operations: [{ name: "search", count: 2, type: "read" }],
  }],
  references: [],
  createdAt: "2026-11-04T00:00:00Z",
};

describe("workload contract", () => {
  it("congela el snapshot y genera un digest reproducible", async () => {
    const plan = generateTestPlan(analysis);
    const first = await createApprovedWorkloadContract(analysis, plan, "2026-11-04T01:00:00Z");
    const second = await createApprovedWorkloadContract(analysis, plan, "2026-11-04T01:00:00Z");

    expect(first.contractDigest).toBe(second.contractDigest);
    expect(first.analysisSnapshot.status).toBe("approved");
    expect(first.analysisSnapshot).not.toBe(analysis);
    expect(first.stages.length).toBeGreaterThan(0);
  });

  it("crea una version de borrador sin modificar la version aprobada", () => {
    const next = createNextAnalysisVersion(analysis, { applicationType: "web" }, "2026-11-04T02:00:00Z");

    expect(next.version).toBe(2);
    expect(next.status).toBe("draft");
    expect(next.applicationType).toBe("web");
    expect(analysis.version).toBe(1);
    expect(analysis.status).toBe("draft");
  });

  it("exporta contratos compatibles con los dos consumidores", async () => {
    const contract = await createApprovedWorkloadContract(analysis, generateTestPlan(analysis), "2026-11-04T01:00:00Z");
    const stepped = exportForSteppedCapacity(contract);
    const sizing = exportForResourceProfileSizing(contract);

    expect(stepped.stagePlan[0]).toMatchObject({ id: "warmup", type: "warmup" });
    expect(stepped.thresholds.http_req_duration).toEqual(["p(95) < 500"]);
    expect(stepped.thresholds.http_req_failed).toEqual(["rate < 0.01"]);
    expect(sizing).toMatchObject({ analysisId: analysis.analysisId, analysisVersion: 1, scenarioId: "peak" });
  });

  it("impide comparar runs de otro contrato", async () => {
    const contract = await createApprovedWorkloadContract(analysis, generateTestPlan(analysis), "2026-11-04T01:00:00Z");
    const valid = validateWorkloadRunCompatibility(contract, {
      analysisId: contract.analysisId,
      analysisVersion: contract.analysisVersion,
      contractDigest: contract.contractDigest,
    });
    const invalid = validateWorkloadRunCompatibility(contract, {
      analysisId: contract.analysisId,
      analysisVersion: 2,
      contractDigest: "sha256:otro",
    });

    expect(valid).toEqual({ comparable: true, reasons: [] });
    expect(invalid.comparable).toBe(false);
    expect(invalid.reasons).toEqual(expect.arrayContaining(["La version del analisis no coincide", "El digest del contrato no coincide"]));
  });
});
