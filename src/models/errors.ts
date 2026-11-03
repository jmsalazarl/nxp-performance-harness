/**
 * Tipos de error para parsing y validación de JSON K6 Summary
 */

export type ParseErrorType = "INVALID_JSON" | "MISSING_METRICS";

export interface ParseError {
  type: ParseErrorType;
  message: string;
}

/**
 * Tipo Result para manejo funcional de errores
 * Basado en el patrón Result/Either común en programación funcional
 */
export type Result<T, E> = 
  | { ok: true; data: T }
  | { ok: false; error: E };
