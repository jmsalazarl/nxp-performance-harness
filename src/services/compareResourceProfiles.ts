import type { ResourceComparisonResult, ResourceProfileRun } from "../models/resourceComparison.types";

export type HeadroomPolicy = "conservative" | "balanced" | "aggressive";

const cpuP95Limits: Record<HeadroomPolicy, number> = { conservative: 70, balanced: 80, aggressive: 90 };

export function compareResourceProfiles(runs: ResourceProfileRun[], productionTrafficTargetDefined = false, policy: HeadroomPolicy = "balanced"): ResourceComparisonResult {
  const targets = [...new Set(runs.flatMap((run) => run.targets.map((target) => target.targetRate)))].sort((left, right) => left - right);
  const sortedRuns = [...runs].sort((left, right) => totalCpu(left) - totalCpu(right) || totalMemory(left) - totalMemory(right));
  const matrix: ResourceComparisonResult["matrix"] = {};
  const minimumWorkingProfileByTarget: Record<string, string | null> = {};
  const recommendedProfileByTarget: Record<string, string | null> = {};

  targets.forEach((target) => {
    const key = String(target);
    const statuses: ResourceComparisonResult["matrix"][string] = {};
    sortedRuns.forEach((run) => {
      statuses[run.profile.id] = run.targets.find((item) => item.targetRate === target)?.classification ?? "NOT_TESTED";
    });
    matrix[key] = statuses;
    const safeRuns = sortedRuns.filter((run) => isSafeAt(run, target));
    minimumWorkingProfileByTarget[key] = safeRuns[0]?.profile.id ?? null;
    recommendedProfileByTarget[key] = safeRuns.find((run) => hasCpuHeadroom(run, target, cpuP95Limits[policy]))?.profile.id ?? null;
  });

  const maxSafeRun = sortedRuns.filter((run) => run.maxSafeRate !== null).sort((left, right) => (right.maxSafeRate ?? 0) - (left.maxSafeRate ?? 0))[0];
  const backendCpu = maxSafeRun ? maxSafeRun.profile.services.application?.cpu ?? null : null;
  return {
    targets,
    matrix,
    runs,
    minimumWorkingProfileByTarget,
    recommendedProfileByTarget,
    ratios: {
      safeIterationsPerBackendVcpu: maxSafeRun && backendCpu ? (maxSafeRun.maxSafeRate ?? 0) / backendCpu : null,
      safeRequestsPerBackendVcpu: null,
      safeThroughputPerGiB: null,
    },
    scopeStatus: {
      backend: runs.length > 0 ? "SUFFICIENT" : "INSUFFICIENT",
      database: runs.length > 0 ? "PARTIAL" : "INSUFFICIENT",
      frontend: "NOT_VALIDATED",
      objectStorage: "NOT_VALIDATED",
    },
    productionTrafficTargetDefined,
  };
}

function isSafeAt(run: ResourceProfileRun, target: number): boolean {
  return run.targets.some((item) => item.targetRate === target && item.classification === "SAFE");
}

function hasCpuHeadroom(run: ResourceProfileRun, target: number, limit: number): boolean {
  const result = run.targets.find((item) => item.targetRate === target);
  if (!result || result.classification !== "SAFE") return false;
  return Object.values(result.metrics).every((metric) => {
    const p95 = metric.cpuLimitUtilizationPercent.p95.value;
    return p95 === null || p95 <= limit;
  });
}

function totalCpu(run: ResourceProfileRun): number { return Object.values(run.profile.services).reduce((total, allocation) => total + (allocation?.cpu ?? 0), 0); }
function totalMemory(run: ResourceProfileRun): number { return Object.values(run.profile.services).reduce((total, allocation) => total + (allocation?.memoryMiB ?? 0), 0); }
