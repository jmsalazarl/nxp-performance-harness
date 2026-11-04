import type { ConfidenceLevel } from "./analysis.types";
import type { WorkloadScenario } from "./workload.types";

export type TestPlanStatus = "draft" | "approved";
export type TestPlanStageType = "warmup" | "transition" | "measurement";

export interface TestPlanStage {
  id: string;
  type: TestPlanStageType;
  targetRate: number;
  duration: string;
  fromRate?: number;
}

export interface TestPlanSlo {
  latencyP95Ms?: number;
  errorRatePercent?: number;
  availabilityPercent?: number;
}

export interface TestPlan {
  analysisId: string;
  analysisVersion: number;
  status: TestPlanStatus;
  profile: "capacity-stepped";
  scenarios: WorkloadScenario[];
  stages: TestPlanStage[];
  slo: TestPlanSlo;
  acceptanceCriteria: string[];
  assumptions: string[];
  missingData: string[];
  confidence: ConfidenceLevel;
  canApprove: boolean;
}
