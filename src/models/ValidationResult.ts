/**
 * ValidationResult - Result of field or state validation
 * 
 * Used by the ValidationService to report validation errors.
 * Errors are displayed inline in the UI next to the corresponding fields.
 */

/**
 * A field-level validation error
 */
export interface FieldError {
  /** ID of the endpoint containing the invalid field */
  endpointId: string;
  
  /** Name of the invalid field (e.g., "url", "headersText", "stages") */
  field: string;
  
  /** Human-readable error message */
  message: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /** Whether the validation passed (true = no errors) */
  valid: boolean;
  
  /** Array of field errors (empty if valid) */
  errors: FieldError[];
}
