import { stageMetricName } from "./context.js";

function values(data, name) {
  return data.metrics?.[name]?.values || null;
}

function metricValue(data, stageId, metricName, key) {
  return values(data, stageMetricName(stageId, metricName))?.[key] ?? null;
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function stageMetrics(data, stage) {
  const duration = Number(stage.duration_seconds);
  const iterations = metricValue(data, stage.id, "iterations", "count");
  const requests = metricValue(data, stage.id, "requests", "count");
  const checks = metricValue(data, stage.id, "checks", "count");
  const actualIterations = iterations === null ? null : numberOrZero(iterations) / duration;
  const expectedIterations = stage.type === "measurement" ? stage.target * duration : null;
  const dropped = expectedIterations === null || iterations === null
    ? null
    : Math.max(0, expectedIterations - numberOrZero(iterations));

  return {
    target_iterations_per_second: stage.target,
    actual_iterations_per_second: actualIterations,
    requests_per_second: requests === null ? null : numberOrZero(requests) / duration,
    iterations,
    requests,
    checks,
    dropped_iterations: dropped,
    dropped_iterations_source: dropped === null ? "unavailable" : "derived_from_expected_minus_recorded",
    vus_average: metricValue(data, stage.id, "vus", "avg"),
    vus_peak: metricValue(data, stage.id, "vus", "max"),
    http_error_rate: metricValue(data, stage.id, "request_errors", "rate"),
    latency_ms: {
      p50: metricValue(data, stage.id, "request_duration", "med"),
      p90: metricValue(data, stage.id, "request_duration", "p(90)"),
      p95: metricValue(data, stage.id, "request_duration", "p(95)"),
      p99: metricValue(data, stage.id, "request_duration", "p(99)"),
      max: metricValue(data, stage.id, "request_duration", "max"),
    },
  };
}

export function createStageSummary(data, profile, metadata = {}) {
  const stages = (profile.stageDefinitions || []).map((stage) => ({
    id: stage.id,
    type: stage.type,
    target_rate: stage.target,
    duration_seconds: stage.duration_seconds,
    window: {
      start_seconds: stage.start_seconds,
      end_seconds: stage.end_seconds,
    },
    metrics: stageMetrics(data, stage),
  }));

  return {
    profile: profile.name,
    execution_type: profile.executionType,
    run_id: metadata.runId || null,
    project_id: metadata.projectId || null,
    run_started_at: metadata.runStartedAt || null,
    measurement_stages: stages.filter((stage) => stage.type === "measurement").map((stage) => stage.id),
    stages,
  };
}
