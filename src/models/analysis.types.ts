export const ANALYSIS_SCHEMA_VERSION = 1 as const;

export type AnalysisStatus = "draft" | "approved" | "obsolete";
export type AnalysisSource = "user" | "derived" | "reference" | "default";
export type ConfidenceLevel = "high" | "medium" | "low";
export type TestObjective = "capacity" | "load" | "stress" | "soak" | "regression" | "growth";
export type JourneyType = "synchronous" | "asynchronous" | "batch";
export type JourneyPriority = "critical" | "high" | "normal";
export type JourneyOperationType = "read" | "write";

export type AnalysisValue =
  | string
  | number
  | boolean
  | null
  | AnalysisValue[]
  | { [key: string]: AnalysisValue };

export interface AnalysisHorizon {
  current?: number;
  threeMonths?: number;
  sixMonths?: number;
  twelveMonths?: number;
  unit: string;
}

export interface AnalysisAnswer {
  path: string;
  value: AnalysisValue;
  unit?: string;
  source: AnalysisSource;
  confidence: ConfidenceLevel;
}

export interface AnalysisReference {
  title: string;
  url: string;
  consultedAt: string;
  context: string;
  supportedValue: string;
}

export interface AnalysisAssumption {
  path: string;
  description: string;
  source: AnalysisSource;
  confidence: ConfidenceLevel;
  impact?: string;
}

export interface JourneyOperation {
  name: string;
  count: number;
  type: JourneyOperationType;
}

export interface JourneySlo {
  latencyP95Ms?: number;
  errorRatePercent?: number;
  availabilityPercent?: number;
}

export interface BusinessJourney {
  id: string;
  name: string;
  type: JourneyType;
  priority: JourneyPriority;
  shareOfUsersPercent: number;
  frequencyPerUserPerDay: number;
  averageDurationSeconds: number;
  operations: JourneyOperation[];
  slo?: JourneySlo;
}

export interface AnalysisInput {
  schemaVersion: typeof ANALYSIS_SCHEMA_VERSION;
  analysisId: string;
  version: number;
  status: AnalysisStatus;
  applicationType: string;
  testObjectives: TestObjective[];
  horizon?: AnalysisHorizon;
  journeys?: BusinessJourney[];
  answers: AnalysisAnswer[];
  references: AnalysisReference[];
  assumptions?: AnalysisAssumption[];
  createdAt: string;
  updatedAt?: string;
}

export interface AnalysisValidationError {
  path: string;
  rule: string;
  message: string;
}

export interface AnalysisValidationResult {
  valid: boolean;
  errors: AnalysisValidationError[];
}
