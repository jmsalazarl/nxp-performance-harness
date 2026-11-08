export type MetricSource = "measured" | "derived" | "missing";
export type ResourceClassification = "SAFE" | "RESOURCE_PRESSURE" | "NEAR_SATURATION" | "SATURATION" | "BREAKING_POINT" | "NOT_TESTED";

export interface ResourceMetricValue {
  value: number | null;
  source: MetricSource;
}

export interface NormalizedResourceMetrics {
  cpuRawPercent: { avg: ResourceMetricValue; p95: ResourceMetricValue; max: ResourceMetricValue };
  cpuLimitUtilizationPercent: { avg: ResourceMetricValue; p95: ResourceMetricValue; max: ResourceMetricValue };
  memoryLimitMiB: ResourceMetricValue;
  memoryMiB: { avg: ResourceMetricValue; p95: ResourceMetricValue; max: ResourceMetricValue };
  memoryUtilizationPercent: { avg: ResourceMetricValue; p95: ResourceMetricValue; max: ResourceMetricValue };
  memoryHeadroomMiB: ResourceMetricValue;
}

export interface ResourceTargetEvidence {
  targetRate: number;
  sustained: boolean;
  droppedIterations: number | null;
  errorRatePercent: number | null;
  latencyDegraded: boolean;
  latencyP95Ms: number | null;
  restarted: boolean;
  oomKilled: boolean;
  databasePressure: boolean | null;
  hostContamination: boolean;
  metrics: Record<string, NormalizedResourceMetrics>;
  classification: ResourceClassification;
  reasons: string[];
}
