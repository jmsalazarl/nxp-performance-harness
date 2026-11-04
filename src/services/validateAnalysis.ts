import {
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisValidationError,
  type AnalysisValidationResult,
  type AnalysisValue,
  type AnalysisSource,
  type ConfidenceLevel,
  type AnalysisStatus,
  type TestObjective,
} from "../models/analysis.types";
import { validateBusinessJourneys } from "./validateBusinessJourneys";

const statuses: AnalysisStatus[] = ["draft", "approved", "obsolete"];
const sources: AnalysisSource[] = ["user", "derived", "reference", "default"];
const confidenceLevels: ConfidenceLevel[] = ["high", "medium", "low"];
const objectives: TestObjective[] = ["capacity", "load", "stress", "soak", "regression", "growth"];
const forbiddenKeyPattern = /(password|passwd|secret|token|api.?key|access.?key|private.?key|cvv|card.?number)/i;

export function validateAnalysisInput(value: unknown): AnalysisValidationResult {
  const errors: AnalysisValidationError[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [error("analysis", "invalid_type", "El analisis debe ser un objeto JSON")],
    };
  }

  validateSchemaVersion(value, errors);
  validateRequiredString(value, "analysisId", errors);
  validatePositiveInteger(value, "version", errors);
  validateEnum(value, "status", statuses, errors);
  validateRequiredString(value, "applicationType", errors);
  validateObjectives(value.testObjectives, errors);
  validateHorizon(value.horizon, errors);
  if (value.journeys !== undefined) errors.push(...validateBusinessJourneys(value.journeys).errors);
  validateAnswers(value.answers, errors);
  validateReferences(value.references, errors);
  validateAssumptions(value.assumptions, errors);
  validateDate(value.createdAt, "createdAt", errors);
  validateOptionalDate(value.updatedAt, "updatedAt", errors);
  validateNoSensitiveKeys(value, "analysis", errors);

  return { valid: errors.length === 0, errors };
}

function validateSchemaVersion(value: Record<string, unknown>, errors: AnalysisValidationError[]): void {
  if (value.schemaVersion !== ANALYSIS_SCHEMA_VERSION) {
    errors.push(error("schemaVersion", "invalid_version", `La version de esquema debe ser ${ANALYSIS_SCHEMA_VERSION}`));
  }
}

function validateRequiredString(
  value: Record<string, unknown>,
  field: string,
  errors: AnalysisValidationError[]
): void {
  if (typeof value[field] !== "string" || value[field].trim() === "") {
    errors.push(error(field, "required", "El campo es obligatorio y debe contener texto"));
  }
}

function validatePositiveInteger(
  value: Record<string, unknown>,
  field: string,
  errors: AnalysisValidationError[]
): void {
  if (!Number.isInteger(value[field]) || Number(value[field]) < 1) {
    errors.push(error(field, "invalid_number", "El valor debe ser un entero positivo"));
  }
}

function validateEnum<T extends string>(
  value: Record<string, unknown>,
  field: string,
  allowed: T[],
  errors: AnalysisValidationError[]
): void {
  if (!allowed.includes(value[field] as T)) {
    errors.push(error(field, "invalid_value", `El valor debe ser uno de: ${allowed.join(", ")}`));
  }
}

function validateObjectives(value: unknown, errors: AnalysisValidationError[]): void {
  if (!Array.isArray(value)) {
    errors.push(error("testObjectives", "invalid_type", "Los objetivos deben ser un arreglo"));
    return;
  }

  value.forEach((objective, index) => {
    if (!objectives.includes(objective as TestObjective)) {
      errors.push(error(`testObjectives[${index}]`, "invalid_value", `El objetivo debe ser uno de: ${objectives.join(", ")}`));
    }
  });
}

function validateHorizon(value: unknown, errors: AnalysisValidationError[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push(error("horizon", "invalid_type", "El horizonte debe ser un objeto"));
    return;
  }

  validateRequiredString(value, "unit", errorsFor("horizon", errors));
  ["current", "threeMonths", "sixMonths", "twelveMonths"].forEach((field) => {
    const metric = value[field];
    if (metric !== undefined && (!isFiniteNonNegativeNumber(metric))) {
      errors.push(error(`horizon.${field}`, "invalid_number", "El valor debe ser un numero finito no negativo"));
    }
  });
}

function validateAnswers(value: unknown, errors: AnalysisValidationError[]): void {
  if (!Array.isArray(value)) {
    errors.push(error("answers", "invalid_type", "Las respuestas deben ser un arreglo"));
    return;
  }

  value.forEach((answer, index) => {
    const path = `answers[${index}]`;
    if (!isRecord(answer)) {
      errors.push(error(path, "invalid_type", "La respuesta debe ser un objeto"));
      return;
    }

    validateRequiredString(answer, "path", errorsFor(path, errors));
    validateEnum(answer, "source", sources, errorsFor(path, errors));
    validateEnum(answer, "confidence", confidenceLevels, errorsFor(path, errors));
    if (typeof answer.path === "string" && forbiddenKeyPattern.test(answer.path)) {
      errors.push(error(`${path}.path`, "sensitive_field", "No se permiten secretos ni datos sensibles"));
    }
    if (!("value" in answer) || !isAnalysisValue(answer.value)) {
      errors.push(error(`${path}.value`, "invalid_value", "El valor debe ser JSON valido"));
    }
  });
}

function validateReferences(value: unknown, errors: AnalysisValidationError[]): void {
  if (!Array.isArray(value)) {
    errors.push(error("references", "invalid_type", "Las referencias deben ser un arreglo"));
    return;
  }

  value.forEach((reference, index) => {
    const path = `references[${index}]`;
    if (!isRecord(reference)) {
      errors.push(error(path, "invalid_type", "La referencia debe ser un objeto"));
      return;
    }

    ["title", "url", "consultedAt", "context", "supportedValue"].forEach((field) => {
      validateRequiredString(reference, field, errorsFor(path, errors));
    });
    if (typeof reference.url === "string" && !isHttpUrl(reference.url)) {
      errors.push(error(`${path}.url`, "invalid_url", "La URL debe usar http o https"));
    }
    validateDate(reference.consultedAt, `${path}.consultedAt`, errors);
  });
}

function validateAssumptions(value: unknown, errors: AnalysisValidationError[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(error("assumptions", "invalid_type", "Los supuestos deben ser un arreglo"));
    return;
  }

  value.forEach((assumption, index) => {
    const path = `assumptions[${index}]`;
    if (!isRecord(assumption)) {
      errors.push(error(path, "invalid_type", "El supuesto debe ser un objeto"));
      return;
    }
    ["path", "description", "source", "confidence"].forEach((field) => validateRequiredString(assumption, field, errorsFor(path, errors)));
    validateEnum(assumption, "source", sources, errorsFor(path, errors));
    validateEnum(assumption, "confidence", confidenceLevels, errorsFor(path, errors));
  });
}

function validateDate(value: unknown, path: string, errors: AnalysisValidationError[]): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(error(path, "invalid_date", "La fecha debe usar un formato ISO valido"));
  }
}

function validateOptionalDate(value: unknown, path: string, errors: AnalysisValidationError[]): void {
  if (value !== undefined) validateDate(value, path, errors);
}

function validateNoSensitiveKeys(value: unknown, path: string, errors: AnalysisValidationError[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoSensitiveKeys(item, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;

  Object.entries(value).forEach(([key, nestedValue]) => {
    const nestedPath = `${path}.${key}`;
    if (forbiddenKeyPattern.test(key)) {
      errors.push(error(nestedPath, "sensitive_field", "No se permiten secretos ni datos sensibles"));
    }
    validateNoSensitiveKeys(nestedValue, nestedPath, errors);
  });
}

function isAnalysisValue(value: unknown): value is AnalysisValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isAnalysisValue);
  if (isRecord(value)) return Object.entries(value).every(([key, nested]) => !forbiddenKeyPattern.test(key) && isAnalysisValue(nested));
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function errorsFor(path: string, errors: AnalysisValidationError[]): AnalysisValidationError[] {
  return new Proxy(errors, {
    get(target, property, receiver) {
      if (property === "push") {
        return (...items: AnalysisValidationError[]) => target.push(...items.map((item) => ({ ...item, path: `${path}.${item.path}` })));
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function error(path: string, rule: string, message: string): AnalysisValidationError {
  return { path, rule, message };
}
