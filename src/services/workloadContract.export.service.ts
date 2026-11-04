import type { TestPlanSlo } from "../models/testPlan.types";
import type { WorkloadContract } from "../models/workloadContract.types";

export interface SteppedCapacityWorkloadContract {
  contractSchemaVersion: number;
  analysisId: string;
  analysisVersion: number;
  contractDigest: string;
  profile: "capacity-stepped";
  stagePlan: Array<{ id: string; type: string; target: number; duration: string; from_target?: number }>;
  thresholds: Record<string, string[]>;
}

export interface ResourceProfileSizingWorkload {
  analysisId: string;
  analysisVersion: number;
  contractDigest: string;
  scenarioId: string;
  targetRate: number;
  requestRate: number;
  concurrency: number;
  duration: string;
  slo: TestPlanSlo;
  assumptions: string[];
  confidence: WorkloadContract["confidence"];
}

export interface WorkloadRunIdentity {
  analysisId: string;
  analysisVersion: number;
  contractDigest: string;
}

export interface CompatibilityResult {
  comparable: boolean;
  reasons: string[];
}

export function exportForSteppedCapacity(contract: WorkloadContract): SteppedCapacityWorkloadContract {
  assertApproved(contract);
  return {
    contractSchemaVersion: contract.schemaVersion,
    analysisId: contract.analysisId,
    analysisVersion: contract.analysisVersion,
    contractDigest: contract.contractDigest,
    profile: contract.profile,
    stagePlan: contract.stages.map((stage) => ({
      id: stage.id,
      type: stage.type,
      target: stage.targetRate,
      duration: stage.duration,
      ...(stage.fromRate === undefined ? {} : { from_target: stage.fromRate }),
    })),
    thresholds: toThresholds(contract.slo),
  };
}

export function exportForResourceProfileSizing(contract: WorkloadContract, scenarioId = "peak"): ResourceProfileSizingWorkload {
  assertApproved(contract);
  const scenario = contract.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`El escenario ${scenarioId} no existe en el contrato`);
  return {
    analysisId: contract.analysisId,
    analysisVersion: contract.analysisVersion,
    contractDigest: contract.contractDigest,
    scenarioId: scenario.id,
    targetRate: scenario.targetRate,
    requestRate: scenario.requestRate,
    concurrency: scenario.concurrency,
    duration: scenario.duration,
    slo: { ...contract.slo },
    assumptions: [...contract.assumptions],
    confidence: contract.confidence,
  };
}

export function validateWorkloadRunCompatibility(contract: WorkloadContract, run: WorkloadRunIdentity): CompatibilityResult {
  const reasons: string[] = [];
  if (contract.status !== "approved") reasons.push("El contrato no esta aprobado");
  if (contract.analysisId !== run.analysisId) reasons.push("El analysis ID no coincide");
  if (contract.analysisVersion !== run.analysisVersion) reasons.push("La version del analisis no coincide");
  if (contract.contractDigest !== run.contractDigest) reasons.push("El digest del contrato no coincide");
  return { comparable: reasons.length === 0, reasons };
}

function toThresholds(slo: TestPlanSlo): Record<string, string[]> {
  const thresholds: Record<string, string[]> = {};
  if (slo.errorRatePercent !== undefined) thresholds.http_req_failed = [`rate < ${slo.errorRatePercent / 100}`];
  if (slo.latencyP95Ms !== undefined) thresholds.http_req_duration = [`p(95) < ${slo.latencyP95Ms}`];
  return thresholds;
}

function assertApproved(contract: WorkloadContract): void {
  if (contract.status !== "approved") throw new Error("Solo se pueden exportar contratos aprobados");
}
