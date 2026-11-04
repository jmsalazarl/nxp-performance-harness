import type { AnalysisValidationError, ConfidenceLevel } from "./analysis.types";

export type WorkloadScenarioType = "normal" | "peak" | "stress" | "soak";

export interface WorkloadMetric {
  journeyId: string;
  dailySessions: number;
  dailyRequestRate: number;
  peakSessions: number;
  arrivalRate: number;
  requestRate: number;
  concurrency: number;
}

export interface WorkloadScenario {
  id: WorkloadScenarioType;
  type: WorkloadScenarioType;
  targetRate: number;
  requestRate: number;
  concurrency: number;
  duration: string;
  peakMultiplier: number;
  confidence: ConfidenceLevel;
}

export interface WorkloadCalculationResult {
  valid: boolean;
  metrics: WorkloadMetric[];
  scenarios: WorkloadScenario[];
  missingData: string[];
  assumptions: string[];
  errors: AnalysisValidationError[];
  confidence: ConfidenceLevel;
}
