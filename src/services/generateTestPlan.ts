import type { AnalysisInput } from "../models/analysis.types";
import type { TestPlan, TestPlanSlo, TestPlanStage } from "../models/testPlan.types";
import { analyzeAnalysisEvidence } from "./analyzeAnalysisEvidence";
import { calculateWorkload } from "./calculateWorkload";

export function generateTestPlan(analysis: AnalysisInput): TestPlan {
  const workload = calculateWorkload(analysis);
  const evidence = analyzeAnalysisEvidence(analysis);
  const values = new Map(analysis.answers.map((answer) => [answer.path, answer.value]));
  const slo: TestPlanSlo = {
    latencyP95Ms: readNumber(values.get("slo.latencyP95Ms")),
    errorRatePercent: readNumber(values.get("slo.errorRatePercent")),
    availabilityPercent: readNumber(values.get("slo.availabilityPercent")),
  };
  const missingData = [...workload.missingData];
  const acceptanceCriteria: string[] = [];

  if (slo.latencyP95Ms === undefined) missingData.push("slo.latencyP95Ms");
  else acceptanceCriteria.push(`El p95 debe ser menor o igual a ${slo.latencyP95Ms} ms`);
  if (slo.errorRatePercent === undefined) missingData.push("slo.errorRatePercent");
  else acceptanceCriteria.push(`La tasa de errores debe ser menor o igual a ${slo.errorRatePercent}%`);
  if (slo.availabilityPercent !== undefined) acceptanceCriteria.push(`La disponibilidad debe ser mayor o igual a ${slo.availabilityPercent}%`);

  const stages = createStages(workload.scenarios);
  return {
    analysisId: analysis.analysisId,
    analysisVersion: analysis.version,
    status: "draft",
    profile: "capacity-stepped",
    scenarios: workload.scenarios,
    stages,
    slo,
    acceptanceCriteria,
    assumptions: evidence.assumptions.map((assumption) => assumption.description),
    missingData: [...new Set(missingData)],
    confidence: evidence.confidence,
    canApprove: workload.valid && evidence.errors.length === 0 && missingData.length === 0 && stages.length > 0,
  };
}

function createStages(scenarios: ReturnType<typeof calculateWorkload>["scenarios"]): TestPlanStage[] {
  if (scenarios.length === 0) return [];

  const stages: TestPlanStage[] = [];
  let previousRate = 0;
  scenarios.forEach((scenario, index) => {
    if (index === 0) {
      stages.push({ id: "warmup", type: "warmup", targetRate: scenario.targetRate, duration: "2m" });
    } else {
      stages.push({
        id: `transition_${scenario.id}`,
        type: "transition",
        targetRate: scenario.targetRate,
        fromRate: previousRate,
        duration: "30s",
      });
    }
    stages.push({ id: `hold_${scenario.id}`, type: "measurement", targetRate: scenario.targetRate, duration: scenario.duration });
    previousRate = scenario.targetRate;
  });
  return stages;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
