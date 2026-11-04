import type {
  JourneyOperationType,
  JourneyPriority,
  JourneyType,
  AnalysisValidationError,
} from "../models/analysis.types";

export interface BusinessJourneyValidationResult {
  valid: boolean;
  errors: AnalysisValidationError[];
}

const journeyTypes: JourneyType[] = ["synchronous", "asynchronous", "batch"];
const priorities: JourneyPriority[] = ["critical", "high", "normal"];
const operationTypes: JourneyOperationType[] = ["read", "write"];

export function validateBusinessJourneys(journeys: unknown): BusinessJourneyValidationResult {
  const errors: AnalysisValidationError[] = [];

  if (!Array.isArray(journeys)) {
    return {
      valid: false,
      errors: [{ path: "journeys", rule: "invalid_type", message: "Los journeys deben ser un arreglo" }],
    };
  }

  journeys.forEach((journey, index) => {
    const path = `journeys[${index}]`;
    if (!isRecord(journey)) {
      errors.push({ path, rule: "invalid_type", message: "El journey debe ser un objeto" });
      return;
    }

    validateText(journey, "id", path, errors);
    validateText(journey, "name", path, errors);
    validateEnum(journey.type, journeyTypes, `${path}.type`, errors, "El tipo de journey no es valido");
    validateEnum(journey.priority, priorities, `${path}.priority`, errors, "La prioridad no es valida");
    validateRange(journey.shareOfUsersPercent, 0, 100, `${path}.shareOfUsersPercent`, errors, "El porcentaje debe estar entre 0 y 100");
    validatePositive(journey.frequencyPerUserPerDay, `${path}.frequencyPerUserPerDay`, errors, "La frecuencia debe ser mayor que cero");
    validatePositive(journey.averageDurationSeconds, `${path}.averageDurationSeconds`, errors, "La duracion debe ser mayor que cero");
    validateOperations(journey.operations, path, errors);
    validateSlo(journey.slo, path, errors);
  });

  return { valid: errors.length === 0, errors };
}

function validateOperations(value: unknown, journeyPath: string, errors: AnalysisValidationError[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push({ path: `${journeyPath}.operations`, rule: "required", message: "El journey debe tener al menos una operacion" });
    return;
  }

  value.forEach((operation, index) => {
    const path = `${journeyPath}.operations[${index}]`;
    if (!isRecord(operation)) {
      errors.push({ path, rule: "invalid_type", message: "La operacion debe ser un objeto" });
      return;
    }
    validateText(operation, "name", path, errors);
    if (!Number.isInteger(operation.count) || Number(operation.count) < 1) {
      errors.push({ path: `${path}.count`, rule: "invalid_count", message: "La cantidad debe ser un entero positivo" });
    }
    validateEnum(operation.type, operationTypes, `${path}.type`, errors, "El tipo de operacion no es valido");
  });
}

function validateSlo(value: unknown, journeyPath: string, errors: AnalysisValidationError[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push({ path: `${journeyPath}.slo`, rule: "invalid_type", message: "El SLO debe ser un objeto" });
    return;
  }
  if (value.latencyP95Ms !== undefined) validatePositive(value.latencyP95Ms, `${journeyPath}.slo.latencyP95Ms`, errors, "La latencia debe ser mayor que cero");
  if (value.errorRatePercent !== undefined) validateRange(value.errorRatePercent, 0, 100, `${journeyPath}.slo.errorRatePercent`, errors, "La tasa de errores debe estar entre 0 y 100");
  if (value.availabilityPercent !== undefined) validateRange(value.availabilityPercent, 0, 100, `${journeyPath}.slo.availabilityPercent`, errors, "La disponibilidad debe estar entre 0 y 100");
}

function validateText(value: Record<string, unknown>, field: string, path: string, errors: AnalysisValidationError[]): void {
  if (typeof value[field] !== "string" || value[field].trim() === "") {
    errors.push({ path: `${path}.${field}`, rule: "required", message: "El campo es obligatorio" });
  }
}

function validateEnum<T extends string>(value: unknown, allowed: T[], path: string, errors: AnalysisValidationError[], message: string): void {
  if (!allowed.includes(value as T)) errors.push({ path, rule: "invalid_value", message });
}

function validatePositive(value: unknown, path: string, errors: AnalysisValidationError[], message: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) errors.push({ path, rule: "invalid_number", message });
}

function validateRange(value: unknown, min: number, max: number, path: string, errors: AnalysisValidationError[], message: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) errors.push({ path, rule: "invalid_range", message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
