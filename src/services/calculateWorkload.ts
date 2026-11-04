import type { AnalysisInput, BusinessJourney, ConfidenceLevel } from "../models/analysis.types";
import type { WorkloadCalculationResult, WorkloadMetric, WorkloadScenario } from "../models/workload.types";
import { validateBusinessJourneys } from "./validateBusinessJourneys";
import { analyzeAnalysisEvidence } from "./analyzeAnalysisEvidence";

const DAY_SECONDS = 24 * 60 * 60;
const SOAK_DURATION = "30m";

export function calculateWorkload(analysis: AnalysisInput): WorkloadCalculationResult {
  const values = new Map(analysis.answers.map((answer) => [answer.path, answer.value]));
  const missingData: string[] = [];
  const assumptions: string[] = [];
  const errors = analysis.journeys ? validateBusinessJourneys(analysis.journeys).errors : [];
  const evidence = analyzeAnalysisEvidence(analysis);
  const journeys = analysis.journeys ?? [];

  if (journeys.length === 0) missingData.push("journeys");
  const dailyActiveUsers = readNumber(values, "demand.dailyActiveUsers", missingData);
  const peakSharePercent = readNumber(values, "behavior.peakSharePercent", missingData);
  const peakWindowMinutes = readNumber(values, "behavior.peakWindowMinutes", missingData);
  const stressMultiplier = readNumber(values, "behavior.stressMultiplier", missingData);

  if (stressMultiplier === undefined) assumptions.push("Se requiere un multiplicador de estres para generar ese escenario");
  if (peakWindowMinutes !== undefined && peakWindowMinutes > 1440) {
    errors.push({
      path: "answers.behavior.peakWindowMinutes",
      rule: "invalid_window",
      message: "La ventana pico no puede superar 1440 minutos",
    });
  }

  if (dailyActiveUsers === undefined || peakSharePercent === undefined || peakWindowMinutes === undefined || journeys.length === 0) {
    return result(false, [], [], missingData, assumptions, [...errors, ...evidence.errors], evidence.confidence);
  }

  const peakWindowSeconds = peakWindowMinutes * 60;
  if (peakWindowSeconds <= 0 || peakSharePercent <= 0 || peakSharePercent > 100 || stressMultiplier !== undefined && stressMultiplier <= 0) {
    errors.push({
      path: "workload",
      rule: "invalid_input",
      message: "Los valores de ventana pico, porcentaje pico y multiplicador deben ser positivos",
    });
    return result(false, [], [], missingData, assumptions, [...errors, ...evidence.errors], evidence.confidence);
  }

  const metrics = journeys.map((journey) => calculateJourneyMetric(journey, dailyActiveUsers, peakSharePercent, peakWindowSeconds));
  const totals = metrics.reduce((total, metric) => ({
    dailySessions: total.dailySessions + metric.dailySessions,
    dailyRequestRate: total.dailyRequestRate + metric.dailyRequestRate,
    peakSessions: total.peakSessions + metric.peakSessions,
    arrivalRate: total.arrivalRate + metric.arrivalRate,
    requestRate: total.requestRate + metric.requestRate,
    concurrency: total.concurrency + metric.concurrency,
  }), { dailySessions: 0, dailyRequestRate: 0, peakSessions: 0, arrivalRate: 0, requestRate: 0, concurrency: 0 });

  const scenarios: WorkloadScenario[] = [
    createScenario("normal", totals.dailySessions / DAY_SECONDS, totals.dailyRequestRate, totals.concurrency, "4m", 1, evidence.confidence),
    createScenario("peak", totals.arrivalRate, totals.requestRate, totals.concurrency, "4m", 1, evidence.confidence),
  ];
  if (stressMultiplier !== undefined) {
    scenarios.push(createScenario("stress", totals.arrivalRate * stressMultiplier, totals.requestRate * stressMultiplier, totals.concurrency * stressMultiplier, "2m", stressMultiplier, evidence.confidence));
  }
  if (analysis.testObjectives.includes("soak")) {
    scenarios.push(createScenario("soak", totals.arrivalRate, totals.requestRate, totals.concurrency, SOAK_DURATION, 1, evidence.confidence));
  }

  return result(errors.length === 0 && evidence.errors.length === 0, metrics, scenarios, missingData, assumptions, [...errors, ...evidence.errors], evidence.confidence);
}

function calculateJourneyMetric(journey: BusinessJourney, dailyActiveUsers: number, peakSharePercent: number, peakWindowSeconds: number): WorkloadMetric {
  const dailySessions = dailyActiveUsers * journey.shareOfUsersPercent / 100 * journey.frequencyPerUserPerDay;
  const peakSessions = dailySessions * peakSharePercent / 100;
  const arrivalRate = peakSessions / peakWindowSeconds;
  const operationsPerJourney = journey.operations.reduce((total, operation) => total + operation.count, 0);
  return {
    journeyId: journey.id,
    dailySessions,
    dailyRequestRate: dailySessions * operationsPerJourney / DAY_SECONDS,
    peakSessions,
    arrivalRate,
    requestRate: arrivalRate * operationsPerJourney,
    concurrency: arrivalRate * journey.averageDurationSeconds,
  };
}

function createScenario(
  id: WorkloadScenario["id"],
  targetRate: number,
  requestRate: number,
  concurrency: number,
  duration: string,
  peakMultiplier: number,
  confidence: ConfidenceLevel
): WorkloadScenario {
  return { id, type: id, targetRate, requestRate, concurrency, duration, peakMultiplier, confidence };
}

function readNumber(values: Map<string, unknown>, path: string, missingData: string[]): number | undefined {
  const value = values.get(path);
  if (value === undefined || value === "") {
    missingData.push(path);
    return undefined;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return undefined;
  return number;
}

function result(
  valid: boolean,
  metrics: WorkloadMetric[],
  scenarios: WorkloadScenario[],
  missingData: string[],
  assumptions: string[],
  errors: WorkloadCalculationResult["errors"],
  confidence: ConfidenceLevel
): WorkloadCalculationResult {
  return { valid, metrics, scenarios, missingData: [...new Set(missingData)], assumptions, errors, confidence };
}
