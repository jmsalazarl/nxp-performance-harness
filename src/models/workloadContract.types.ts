import type { AnalysisInput, ConfidenceLevel } from "./analysis.types";
import type { TestPlanSlo, TestPlanStage } from "./testPlan.types";
import type { WorkloadScenario } from "./workload.types";

export const WORKLOAD_CONTRACT_SCHEMA_VERSION = 1 as const;
export type WorkloadContractStatus = "approved";

export interface WorkloadContract {
  schemaVersion: typeof WORKLOAD_CONTRACT_SCHEMA_VERSION;
  analysisId: string;
  analysisVersion: number;
  contractDigest: string;
  status: WorkloadContractStatus;
  profile: "capacity-stepped";
  approvedAt: string;
  scenarios: WorkloadScenario[];
  stages: TestPlanStage[];
  slo: TestPlanSlo;
  acceptanceCriteria: string[];
  assumptions: string[];
  missingData: string[];
  confidence: ConfidenceLevel;
  analysisSnapshot: AnalysisInput;
}
