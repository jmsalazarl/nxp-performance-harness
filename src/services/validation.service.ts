/**
 * Validation service for Config Builder UI
 * 
 * Provides field-level validation for the UI editor.
 * Validates individual fields, endpoints, and export-readiness state.
 * All validation functions return error messages or null for valid inputs.
 */

/**
 * Interface for field constraints used in validateField
 */
export interface FieldConstraints {
  min?: number;
  max?: number;
  type?: 'number' | 'string';
}

/**
 * Field error with endpoint context
 */
export interface FieldError {
  endpointId: string;
  field: string;
  message: string;
}

/**
 * Validation result with errors
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}

/**
 * Draft endpoint interface (minimal for validation purposes)
 */
export interface EndpointDraft {
  id: string;
  name: string;
  url: string;
  method: string;
  headersText: string;
  payloadText: string;
  expectedStatus: number;
  maxRetries: number;
  thinkTimeSeconds: number;
  profiles: ProfileDraft[];
}

/**
 * Profile draft interface
 */
export interface ProfileDraft {
  type: string;
  enabled: boolean;
  stages: StageDraft[];
  thresholds: ThresholdDraft[];
}

/**
 * Stage draft interface
 */
export interface StageDraft {
  duration: string;
  target: number;
}

/**
 * Threshold draft interface
 */
export interface ThresholdDraft {
  metric: string;
  expressions: string[];
}

/**
 * Application state interface (minimal for validation)
 */
export interface AppState {
  endpoints: EndpointDraft[];
  activeEndpointId: string | null;
}

/**
 * Validates a URL string
 * Accepts URLs that begin with http:// or https:// and are not empty
 * 
 * @param url - The URL string to validate
 * @returns Error message or null if valid
 * 
 * Requirements: 3.1, 3.7
 */
export function validateUrl(url: string): string | null {
  if (!url || url.trim() === "") {
    return "URL is required and cannot be empty";
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "URL must start with http:// or https://";
  }

  return null;
}

/**
 * Validates a field value against constraints
 * 
 * Supports validation for:
 * - expectedStatus: 100-599
 * - maxRetries: 0-10
 * - thinkTimeSeconds: 0-60
 * - target: 0-10000
 * 
 * @param fieldName - Name of the field being validated
 * @param value - Value to validate
 * @param constraints - Validation constraints (min, max, type)
 * @returns Error message or null if valid
 * 
 * Requirements: 3.1, 3.2, 3.7, 3.8, 4.3
 */
export function validateField(
  fieldName: string,
  value: unknown,
  constraints: FieldConstraints
): string | null {
  const { min, max, type } = constraints;

  // Type validation
  if (type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`;
    }

    // Range validation for numbers
    if (min !== undefined && value < min) {
      return `${fieldName} must be at least ${min}`;
    }

    if (max !== undefined && value > max) {
      return `${fieldName} must be at most ${max}`;
    }
  }

  if (type === 'string') {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
  }

  return null;
}

/**
 * Validates an HTTP method
 * Restricts to GET, POST, PUT, PATCH, DELETE
 * 
 * @param method - The HTTP method to validate
 * @returns Error message or null if valid
 * 
 * Requirements: 3.2
 */
export function validateMethod(method: string): string | null {
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!validMethods.includes(method)) {
    return `Method must be one of: ${validMethods.join(', ')}`;
  }

  return null;
}

/**
 * Validates a JSON string
 * 
 * @param text - The JSON string to validate
 * @param requireObject - If true, requires the JSON to be an object (not array or primitive)
 * @returns Error message or null if valid
 * 
 * Requirements: 3.3, 3.4
 */
export function validateJson(text: string, requireObject?: boolean): string | null {
  if (!text || text.trim() === "") {
    return "JSON cannot be empty";
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return `Invalid JSON: ${error instanceof Error ? error.message : 'parse error'}`;
  }

  if (requireObject) {
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return "JSON must be an object (not an array or primitive)";
    }
  }

  return null;
}

/**
 * Validates a K6 duration format string
 * Accepts formats like "30s", "2m", "1h", "1h30m", "90s", etc.
 * 
 * @param duration - The duration string to validate
 * @returns Error message or null if valid
 * 
 * Requirements: 4.3, 4.4
 */
export function validateDuration(duration: string): string | null {
  if (!duration || duration.trim() === "") {
    return "Duration cannot be empty";
  }

  // K6 duration format: number followed by time unit (ms, s, m, h)
  // Can be combined: "1h30m" or simple: "30s"
  const k6DurationRegex = /^(\d+(\.\d+)?(ms|s|m|h))+$/;

  if (!k6DurationRegex.test(duration.trim())) {
    return 'Duration must be in K6 format (e.g., "30s", "2m", "1h", "1h30m")';
  }

  return null;
}

/**
 * Validates a metric name
 * Accepts 1-128 characters consisting only of letters, digits, and underscores
 * Cannot be only whitespace
 * 
 * @param name - The metric name to validate
 * @returns Error message or null if valid
 * 
 * Requirements: 5.3
 */
export function validateMetricName(name: string): string | null {
  if (!name || name.trim() === "") {
    return "Metric name cannot be empty or whitespace only";
  }

  if (name.length > 128) {
    return "Metric name must be 128 characters or less";
  }

  const validNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!validNameRegex.test(name)) {
    return "Metric name must contain only letters, digits, and underscores";
  }

  return null;
}

/**
 * Validates a threshold expression
 * Must not be empty or only whitespace
 * 
 * @param expr - The threshold expression to validate
 * @returns Error message or null if valid
 * 
 * Requirements: 5.4, 5.6
 */
export function validateThresholdExpression(expr: string): string | null {
  if (!expr || expr.trim() === "") {
    return "Threshold expression cannot be empty or whitespace only";
  }

  return null;
}

/**
 * Validates a complete endpoint draft
 * Checks all fields and returns accumulated errors
 * 
 * @param draft - The endpoint draft to validate
 * @returns Validation result with all errors
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 4.3, 4.4, 5.3, 5.4, 5.6
 */
export function validateEndpoint(draft: EndpointDraft): ValidationResult {
  const errors: FieldError[] = [];

  // Validate URL
  const urlError = validateUrl(draft.url);
  if (urlError) {
    errors.push({
      endpointId: draft.id,
      field: 'url',
      message: urlError,
    });
  }

  // Validate method
  const methodError = validateMethod(draft.method);
  if (methodError) {
    errors.push({
      endpointId: draft.id,
      field: 'method',
      message: methodError,
    });
  }

  // Validate headers (must be object JSON)
  const headersError = validateJson(draft.headersText, true);
  if (headersError) {
    errors.push({
      endpointId: draft.id,
      field: 'headers',
      message: headersError,
    });
  }

  // Validate payload (any valid JSON)
  const payloadError = validateJson(draft.payloadText, false);
  if (payloadError) {
    errors.push({
      endpointId: draft.id,
      field: 'payload',
      message: payloadError,
    });
  }

  // Validate expectedStatus (100-599)
  const statusError = validateField('expectedStatus', draft.expectedStatus, {
    type: 'number',
    min: 100,
    max: 599,
  });
  if (statusError) {
    errors.push({
      endpointId: draft.id,
      field: 'expectedStatus',
      message: statusError,
    });
  }

  // Validate maxRetries (0-10)
  const retriesError = validateField('maxRetries', draft.maxRetries, {
    type: 'number',
    min: 0,
    max: 10,
  });
  if (retriesError) {
    errors.push({
      endpointId: draft.id,
      field: 'maxRetries',
      message: retriesError,
    });
  }

  // Validate thinkTimeSeconds (0-60)
  const thinkTimeError = validateField('thinkTimeSeconds', draft.thinkTimeSeconds, {
    type: 'number',
    min: 0,
    max: 60,
  });
  if (thinkTimeError) {
    errors.push({
      endpointId: draft.id,
      field: 'thinkTimeSeconds',
      message: thinkTimeError,
    });
  }

  // Validate profiles
  draft.profiles.forEach((profile) => {
    if (!profile.enabled) {
      return; // Skip disabled profiles
    }

    // Check that enabled profiles have at least one stage
    if (profile.stages.length === 0) {
      errors.push({
        endpointId: draft.id,
        field: `profile.${profile.type}.stages`,
        message: `Profile ${profile.type} must have at least one stage`,
      });
    }

    // Validate each stage
    profile.stages.forEach((stage, stageIndex) => {
      const durationError = validateDuration(stage.duration);
      if (durationError) {
        errors.push({
          endpointId: draft.id,
          field: `profile.${profile.type}.stages[${stageIndex}].duration`,
          message: durationError,
        });
      }

      const targetError = validateField('target', stage.target, {
        type: 'number',
        min: 0,
        max: 10000,
      });
      if (targetError) {
        errors.push({
          endpointId: draft.id,
          field: `profile.${profile.type}.stages[${stageIndex}].target`,
          message: targetError,
        });
      }
    });

    // Validate thresholds
    profile.thresholds.forEach((threshold) => {
      const metricError = validateMetricName(threshold.metric);
      if (metricError) {
        errors.push({
          endpointId: draft.id,
          field: `profile.${profile.type}.thresholds.${threshold.metric}`,
          message: metricError,
        });
      }

      // Check that metric has at least one expression
      if (threshold.expressions.length === 0) {
        errors.push({
          endpointId: draft.id,
          field: `profile.${profile.type}.thresholds.${threshold.metric}`,
          message: `Metric ${threshold.metric} must have at least one threshold expression`,
        });
      }

      // Validate each expression
      threshold.expressions.forEach((expr, exprIndex) => {
        const exprError = validateThresholdExpression(expr);
        if (exprError) {
          errors.push({
            endpointId: draft.id,
            field: `profile.${profile.type}.thresholds.${threshold.metric}[${exprIndex}]`,
            message: exprError,
          });
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that the application state is ready for export
 * 
 * Checks:
 * - At least one endpoint exists
 * - All endpoints are valid
 * - At least one profile is enabled in at least one endpoint
 * 
 * @param state - The application state to validate
 * @returns Validation result with all errors
 * 
 * Requirements: 2.5, 4.7, 4.8, 6.3, 7.9
 */
export function validateExportReady(state: AppState): ValidationResult {
  const errors: FieldError[] = [];

  // Check that at least one endpoint exists
  if (state.endpoints.length === 0) {
    errors.push({
      endpointId: '__global__',
      field: 'endpoints',
      message: 'At least one endpoint is required for export',
    });
    return {
      valid: false,
      errors,
    };
  }

  // Validate each endpoint
  let hasEnabledProfile = false;
  state.endpoints.forEach((endpoint) => {
    const endpointValidation = validateEndpoint(endpoint);
    errors.push(...endpointValidation.errors);

    // Check if this endpoint has at least one enabled profile
    const endpointHasProfile = endpoint.profiles.some((profile) => profile.enabled);
    if (endpointHasProfile) {
      hasEnabledProfile = true;
    } else {
      errors.push({
        endpointId: endpoint.id,
        field: 'profiles',
        message: `Endpoint "${endpoint.name}" must have at least one enabled profile`,
      });
    }
  });

  // Check that at least one endpoint has an enabled profile
  if (!hasEnabledProfile) {
    errors.push({
      endpointId: '__global__',
      field: 'profiles',
      message: 'At least one endpoint must have an enabled profile for export',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
