import type { ResourceClassification, ResourceTargetEvidence } from "./resourceMetrics.types";
import type { ResourceProfile } from "./resourceProfile.types";

export interface ResourceProfileRun {
  profile: ResourceProfile;
  maxTestedRate: number | null;
  maxSustainedRate: number | null;
  maxSafeRate: number | null;
  firstPressure: number | null;
  firstDegradation: number | null;
  saturation: number | null;
  breakingPoint: number | null;
  targets: ResourceTargetEvidence[];
}

export interface ResourceComparisonResult {
  targets: number[];
  matrix: Record<string, Record<string, ResourceClassification>>;
  runs: ResourceProfileRun[];
  minimumWorkingProfileByTarget: Record<string, string | null>;
  recommendedProfileByTarget: Record<string, string | null>;
  ratios: Record<string, number | null>;
  scopeStatus: {
    backend: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT";
    database: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT";
    frontend: "NOT_VALIDATED";
    objectStorage: "NOT_VALIDATED";
  };
  productionTrafficTargetDefined: boolean;
}
