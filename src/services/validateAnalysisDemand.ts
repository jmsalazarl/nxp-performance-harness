import type { AnalysisInput, AnalysisValidationError } from "../models/analysis.types";

export interface DemandValidationResult {
  valid: boolean;
  errors: AnalysisValidationError[];
  missingFields: string[];
}

const numericPaths = [
  "demand.currentCustomers",
  "demand.customersSixMonths",
  "demand.customersTwelveMonths",
  "demand.dailyActiveUsers",
  "behavior.sessionsPerUserPerDay",
  "behavior.peakSharePercent",
  "behavior.peakWindowMinutes",
];

export function validateAnalysisDemand(analysis: AnalysisInput): DemandValidationResult {
  const errors: AnalysisValidationError[] = [];
  const values = new Map(analysis.answers.map((answer) => [answer.path, answer.value]));
  const missingFields: string[] = [];

  numericPaths.forEach((path) => {
    const value = values.get(path);
    if (value !== undefined && toNumber(value) === undefined) {
      errors.push({
        path: `answers.${path}`,
        rule: "invalid_number",
        message: "El valor debe ser un numero finito",
      });
    }
  });

  validateNonNegative(values, "demand.currentCustomers", errors);
  validateNonNegative(values, "demand.customersSixMonths", errors);
  validateNonNegative(values, "demand.customersTwelveMonths", errors);
  validateNonNegative(values, "demand.dailyActiveUsers", errors);
  validatePositive(values, "behavior.sessionsPerUserPerDay", errors);
  validatePercentage(values, "behavior.peakSharePercent", errors);
  validatePositive(values, "behavior.peakWindowMinutes", errors);

  const currentCustomers = toNumber(values.get("demand.currentCustomers"));
  const dailyActiveUsers = toNumber(values.get("demand.dailyActiveUsers"));
  if (currentCustomers !== undefined && dailyActiveUsers !== undefined && dailyActiveUsers > currentCustomers) {
    errors.push({
      path: "answers.demand.dailyActiveUsers",
      rule: "greater_than_population",
      message: "Los usuarios activos diarios no pueden superar a los clientes actuales",
    });
  }

  addMissing(values, "demand.dailyActiveUsers", missingFields);
  addMissing(values, "behavior.sessionsPerUserPerDay", missingFields);
  addMissing(values, "behavior.peakSharePercent", missingFields);
  addMissing(values, "behavior.peakWindowMinutes", missingFields);

  const hasProjection = ["demand.customersSixMonths", "demand.customersTwelveMonths"]
    .some((path) => values.has(path));
  if (hasProjection && !values.has("demand.currentCustomers")) {
    missingFields.push("demand.currentCustomers");
  }

  if (analysis.horizon) {
    const horizonFields = ["current", "threeMonths", "sixMonths", "twelveMonths"] as const;
    horizonFields.forEach((field) => {
      const value = analysis.horizon?.[field];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        errors.push({
          path: `horizon.${field}`,
          rule: "invalid_number",
          message: "El horizonte debe contener numeros no negativos",
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields: [...new Set(missingFields)],
  };
}

function validateNonNegative(
  values: Map<string, unknown>,
  path: string,
  errors: AnalysisValidationError[]
): void {
  const value = toNumber(values.get(path));
  if (value !== undefined && value < 0) {
    errors.push({ path: `answers.${path}`, rule: "negative_number", message: "El valor no puede ser negativo" });
  }
}

function validatePositive(
  values: Map<string, unknown>,
  path: string,
  errors: AnalysisValidationError[]
): void {
  const value = toNumber(values.get(path));
  if (value !== undefined && value <= 0) {
    errors.push({ path: `answers.${path}`, rule: "non_positive_number", message: "El valor debe ser mayor que cero" });
  }
}

function validatePercentage(
  values: Map<string, unknown>,
  path: string,
  errors: AnalysisValidationError[]
): void {
  const value = toNumber(values.get(path));
  if (value !== undefined && (value <= 0 || value > 100)) {
    errors.push({ path: `answers.${path}`, rule: "invalid_percentage", message: "El porcentaje debe ser mayor que cero y maximo 100" });
  }
}

function addMissing(values: Map<string, unknown>, path: string, missingFields: string[]): void {
  const value = values.get(path);
  if (value === undefined || value === "") missingFields.push(path);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
