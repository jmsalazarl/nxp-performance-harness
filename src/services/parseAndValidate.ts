/**
 * Servicio de parsing y validación de archivos JSON de K6 Summary
 * 
 * Responsabilidades:
 * - Parsear texto JSON de forma segura
 * - Validar estructura mínima requerida (presencia de 'metrics')
 * - Retornar Result type para manejo funcional de errores
 */

import { Result, ParseError } from "../models/errors";
import { RawSummary } from "../models/metrics";

/**
 * Parsea y valida un texto JSON de K6 Summary
 * 
 * @param fileText - Contenido del archivo JSON como string
 * @returns Result con RawSummary si válido, o ParseError si hay problemas
 * 
 * @example
 * ```typescript
 * const result = parseAndValidate(jsonText);
 * if (result.ok) {
 *   console.log(result.data.metrics);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function parseAndValidate(fileText: string): Result<RawSummary, ParseError> {
  // Paso 1: Intentar parsear JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch (error) {
    return {
      ok: false,
      error: {
        type: "INVALID_JSON",
        message: error instanceof Error 
          ? `Invalid JSON format: ${error.message}` 
          : "Invalid JSON format"
      }
    };
  }

  // Paso 2: Validar que el resultado sea un objeto
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      error: {
        type: "INVALID_JSON",
        message: "JSON must be an object"
      }
    };
  }

  // Paso 3: Validar presencia de propiedad 'metrics'
  const rawSummary = parsed as Record<string, unknown>;
  if (!("metrics" in rawSummary)) {
    return {
      ok: false,
      error: {
        type: "MISSING_METRICS",
        message: "JSON does not contain 'metrics' property. This does not appear to be a valid K6 summary file."
      }
    };
  }

  // Paso 4: Validar que 'metrics' sea un objeto
  if (typeof rawSummary.metrics !== "object" || rawSummary.metrics === null || Array.isArray(rawSummary.metrics)) {
    return {
      ok: false,
      error: {
        type: "MISSING_METRICS",
        message: "'metrics' property must be an object"
      }
    };
  }

  // Validación exitosa
  return {
    ok: true,
    data: rawSummary as RawSummary
  };
}
