import type { ResourceClassification, ResourceTargetEvidence } from "../models/resourceMetrics.types";

export function classifyResourceTarget(evidence: Omit<ResourceTargetEvidence, "classification" | "reasons">): ResourceTargetEvidence {
  const reasons: string[] = [];
  if (!evidence.sustained) reasons.push("El target no fue sostenido");
  if (evidence.droppedIterations !== 0) reasons.push("Existen dropped iterations");
  if (evidence.errorRatePercent === null) reasons.push("Tasa de errores no disponible");
  else if (evidence.errorRatePercent > 0) reasons.push("La tasa de errores supera cero");
  if (evidence.restarted) reasons.push("El container se reinicio");
  if (evidence.oomKilled) reasons.push("El container termino por OOMKilled");
  if (evidence.databasePressure === true) reasons.push("Existe presion operacional de database");
  if (evidence.hostContamination) reasons.push("Existe contaminacion del host");
  const cpuP95 = Object.values(evidence.metrics).map((metric) => metric.cpuLimitUtilizationPercent.p95.value).filter((value): value is number => value !== null);
  const memoryP95 = Object.values(evidence.metrics).map((metric) => metric.memoryUtilizationPercent.p95.value).filter((value): value is number => value !== null);
  const pressure = cpuP95.some((value) => value >= 80) || memoryP95.some((value) => value >= 80);
  const saturation = cpuP95.some((value) => value >= 100) || memoryP95.some((value) => value >= 100);
  const degraded = evidence.latencyDegraded || (evidence.errorRatePercent ?? 0) > 0;
  let classification: ResourceClassification = "SAFE";
  if (reasons.length > 0 && saturation && degraded) classification = "SATURATION";
  else if (reasons.length > 0) classification = "BREAKING_POINT";
  else if (saturation) classification = "NEAR_SATURATION";
  else if (pressure) classification = "RESOURCE_PRESSURE";
  return { ...evidence, classification, reasons };
}
