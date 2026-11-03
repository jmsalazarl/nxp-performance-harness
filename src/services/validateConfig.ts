/**
 * Configuration validation service
 * 
 * Validates K6 config objects against the contract rules before serialization.
 * Accumulates all validation errors instead of failing fast.
 */

import type {
  Config,
  Endpoint,
  TestProfile,
  Stage,
  ProfileName,
  ValidationError,
  ValidationResult,
  HttpMethod,
} from "../models/config.types.js";

/**
 * Validates a complete configuration
 * 
 * @param config - The configuration to validate
 * @returns Validation result with all accumulated errors
 */
export function validateConfig(config: Config): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate each endpoint
  config.endpoints.forEach((endpoint, index) => {
    errors.push(...validateEndpoint(endpoint, index));
    
    // Validate test profiles if present
    const profiles: ProfileName[] = ["loadtest", "stresstest", "capacitytest", "stabilitytest"];
    profiles.forEach((profileName) => {
      const profile = endpoint[profileName];
      if (profile) {
        errors.push(...validateTestProfile(profile, profileName, index));
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single endpoint
 * 
 * Validates:
 * - url: non-empty and absolute URL (Req 5.1)
 * - method: one of GET, POST, PUT, PATCH, DELETE (Req 5.2)
 * - headers: plain JSON object when present (Req 5.3)
 * - payload: valid JSON when present (Req 5.4)
 * - expectedStatus: between 100 and 599 (Req 5.5)
 * 
 * @param endpoint - The endpoint to validate
 * @param index - The endpoint's index in the endpoints array
 * @returns Array of validation errors (empty if valid)
 */
export function validateEndpoint(endpoint: Endpoint, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `endpoints[${index}]`;

  // Validate url (Req 5.1)
  if (!endpoint.url || endpoint.url.trim() === "") {
    errors.push({
      path: `${basePath}.url`,
      rule: "required",
      message: "URL is required and cannot be empty",
    });
  } else if (!isAbsoluteUrl(endpoint.url)) {
    errors.push({
      path: `${basePath}.url`,
      rule: "invalid_url",
      message: "URL must be an absolute URL (e.g., https://example.com/path)",
    });
  }

  // Validate method (Req 5.2)
  const validMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  if (!validMethods.includes(endpoint.method)) {
    errors.push({
      path: `${basePath}.method`,
      rule: "invalid_method",
      message: `Method must be one of: ${validMethods.join(", ")}`,
    });
  }

  // Validate headers (Req 5.3)
  if (endpoint.headers !== undefined) {
    if (!isPlainJsonObject(endpoint.headers)) {
      errors.push({
        path: `${basePath}.headers`,
        rule: "invalid_headers",
        message: "Headers must be a plain JSON object with string keys and string values",
      });
    }
  }

  // Validate payload (Req 5.4)
  if (endpoint.payload !== undefined) {
    if (!isValidJson(endpoint.payload)) {
      errors.push({
        path: `${basePath}.payload`,
        rule: "invalid_payload",
        message: "Payload must be valid JSON",
      });
    }
  }

  // Validate expectedStatus (Req 5.5)
  if (endpoint.expectedStatus < 100 || endpoint.expectedStatus > 599) {
    errors.push({
      path: `${basePath}.expectedStatus`,
      rule: "invalid_status",
      message: "Expected status must be between 100 and 599",
    });
  }

  return errors;
}

/**
 * Validates a test profile
 * 
 * @param profile - The test profile to validate
 * @param profileName - The name of the profile (loadtest, stresstest, etc.)
 * @param endpointIndex - The endpoint's index in the endpoints array
 * @returns Array of validation errors (empty if valid)
 */
export function validateTestProfile(
  profile: TestProfile,
  profileName: ProfileName,
  endpointIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `endpoints[${endpointIndex}].${profileName}`;

  // Validate stages (Req 5.6)
  if (!profile.stages || profile.stages.length === 0) {
    errors.push({
      path: `${basePath}.stages`,
      rule: "required",
      message: "Test profile must have at least one stage",
    });
  } else {
    profile.stages.forEach((stage, stageIndex) => {
      errors.push(...validateStage(stage, stageIndex, basePath));
    });
  }

  // Validate thresholds (Req 5.8)
  if (profile.thresholds) {
    Object.entries(profile.thresholds).forEach(([metricKey, expressions]) => {
      if (!Array.isArray(expressions)) {
        errors.push({
          path: `${basePath}.thresholds.${metricKey}`,
          rule: "invalid_threshold",
          message: "Threshold expressions must be an array",
        });
      } else {
        expressions.forEach((expr, exprIndex) => {
          if (!expr || expr.trim() === "") {
            errors.push({
              path: `${basePath}.thresholds.${metricKey}[${exprIndex}]`,
              rule: "empty_threshold",
              message: "Threshold expression cannot be empty",
            });
          }
        });
      }
    });
  }

  return errors;
}

/**
 * Validates a stage
 * 
 * @param stage - The stage to validate
 * @param stageIndex - The stage's index in the stages array
 * @param profilePath - The JSONPath to the parent profile
 * @returns Array of validation errors (empty if valid)
 */
export function validateStage(stage: Stage, stageIndex: number, profilePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `${profilePath}.stages[${stageIndex}]`;

  // Validate duration (Req 5.7)
  if (!stage.duration || stage.duration.trim() === "") {
    errors.push({
      path: `${basePath}.duration`,
      rule: "required",
      message: "Stage duration is required and cannot be empty",
    });
  }

  // Validate target (Req 5.7)
  if (stage.target < 0) {
    errors.push({
      path: `${basePath}.target`,
      rule: "invalid_target",
      message: "Stage target must be greater than or equal to 0",
    });
  }

  return errors;
}

/**
 * Checks if a string is an absolute URL
 * 
 * @param url - The string to check
 * @returns true if the string is an absolute URL
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must have a protocol (http: or https:) and a host
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host !== "";
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a plain JSON object (not an array, not null)
 * 
 * @param value - The value to check
 * @returns true if the value is a plain object
 */
function isPlainJsonObject(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Checks if a value is valid JSON (can be serialized and deserialized)
 * 
 * @param value - The value to check
 * @returns true if the value is valid JSON
 */
function isValidJson(value: unknown): boolean {
  try {
    // Try to serialize and deserialize
    JSON.parse(JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
