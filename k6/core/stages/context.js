import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

let stageState = {
  definitions: [],
  metrics: new Map(),
  fallbackStartMs: null,
};

function metricId(stageId) {
  return String(stageId).replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

function scenarioStartMs() {
  const configured = exec.scenario?.startTime;
  if (configured !== undefined && configured !== null) {
    const value = new Date(configured).getTime();
    if (Number.isFinite(value)) return value;
  }
  if (stageState.fallbackStartMs === null) stageState.fallbackStartMs = Date.now();
  return stageState.fallbackStartMs;
}

function activeDefinition(nowMs = Date.now()) {
  const elapsedSeconds = (nowMs - scenarioStartMs()) / 1000;
  return stageState.definitions.find((stage) => elapsedSeconds >= stage.start_seconds && elapsedSeconds < stage.end_seconds) || null;
}

export function configureStages(profile) {
  const definitions = profile.stageDefinitions || [];
  const metrics = new Map();

  definitions.forEach((stage) => {
    const id = metricId(stage.id);
    metrics.set(stage.id, {
      iterations: new Counter(`stage_${id}_iterations`),
      requests: new Counter(`stage_${id}_requests`),
      checks: new Counter(`stage_${id}_checks`),
      requestErrors: new Rate(`stage_${id}_request_errors`),
      requestDuration: new Trend(`stage_${id}_request_duration`, true),
      iterationDuration: new Trend(`stage_${id}_iteration_duration`, true),
      vus: new Trend(`stage_${id}_vus`, false),
    });
  });

  stageState = { definitions, metrics, fallbackStartMs: null };
}

export function getStageDefinitions() {
  return stageState.definitions;
}

export function currentStage() {
  const stage = activeDefinition();
  if (!stage) return null;
  return {
    id: stage.id,
    type: stage.type,
    target_rate: stage.target,
    load_stage: stage.id,
    stage_type: stage.type,
  };
}

export function stageTags(tags = {}) {
  const stage = currentStage();
  return stage ? { ...tags, load_stage: stage.load_stage, stage_type: stage.stage_type } : tags;
}

function stageMetric() {
  const stage = activeDefinition();
  return stage ? stageState.metrics.get(stage.id) : null;
}

function activeVus() {
  const value = Number(exec.instance?.vusActive);
  return Number.isFinite(value) ? value : 0;
}

export function recordStageRequest(durationMs, failed) {
  const metric = stageMetric();
  if (!metric) return;
  metric.requests.add(1);
  metric.requestDuration.add(durationMs);
  metric.requestErrors.add(Boolean(failed));
  metric.vus.add(activeVus());
}

export function recordStageCheck(passed) {
  const metric = stageMetric();
  if (metric) metric.checks.add(1);
  return passed;
}

export function recordStageIteration(failed, durationMs) {
  const metric = stageMetric();
  if (!metric) return;
  metric.iterations.add(1);
  metric.vus.add(activeVus());
  if (durationMs !== undefined) metric.iterationDuration.add(durationMs);
}

export function stageMetricName(stageId, metricName) {
  return `stage_${metricId(stageId)}_${metricName}`;
}
