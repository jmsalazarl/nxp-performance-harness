import type { NormalizedResourceMetrics, ResourceMetricValue } from "../models/resourceMetrics.types";

export interface RawResourceMetrics {
  cpuPercent?: { avg?: number; p95?: number; max?: number };
  memoryMiB?: { avg?: number; p95?: number; max?: number };
  memoryLimitMiB?: number;
}

export function normalizeResourceMetrics(raw: RawResourceMetrics, cpuLimit: number): NormalizedResourceMetrics {
  const cpu = raw.cpuPercent ?? {};
  const memory = raw.memoryMiB ?? {};
  const memoryLimit = measured(raw.memoryLimitMiB);
  return {
    cpuRawPercent: { avg: measured(cpu.avg), p95: measured(cpu.p95), max: measured(cpu.max) },
    cpuLimitUtilizationPercent: {
      avg: normalizeCpu(cpu.avg, cpuLimit),
      p95: normalizeCpu(cpu.p95, cpuLimit),
      max: normalizeCpu(cpu.max, cpuLimit),
    },
    memoryLimitMiB: memoryLimit,
    memoryMiB: { avg: measured(memory.avg), p95: measured(memory.p95), max: measured(memory.max) },
    memoryUtilizationPercent: {
      avg: ratio(memory.avg, raw.memoryLimitMiB),
      p95: ratio(memory.p95, raw.memoryLimitMiB),
      max: ratio(memory.max, raw.memoryLimitMiB),
    },
    memoryHeadroomMiB: difference(raw.memoryLimitMiB, memory.max),
  };
}

function normalizeCpu(value: number | undefined, limit: number): ResourceMetricValue {
  return value === undefined || !Number.isFinite(value) || limit <= 0 ? missing() : measured(value / (limit * 100) * 100);
}
function ratio(value: number | undefined, limit: number | undefined): ResourceMetricValue {
  return value === undefined || limit === undefined || limit <= 0 ? missing() : measured(value / limit * 100);
}
function difference(limit: number | undefined, value: number | undefined): ResourceMetricValue {
  return limit === undefined || value === undefined ? missing() : measured(limit - value);
}
function measured(value: number | undefined): ResourceMetricValue { return value !== undefined && Number.isFinite(value) ? { value, source: "measured" } : missing(); }
function missing(): ResourceMetricValue { return { value: null, source: "missing" }; }
