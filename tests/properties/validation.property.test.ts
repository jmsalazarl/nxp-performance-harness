/**
 * Property-based tests for validation.service.ts
 * Tests universal properties of validation functions using fast-check
 * 
 * Feature: config-builder-ui
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateJson,
  validateDuration,
  validateMetricName,
  validateExportReady,
} from "../../src/services/validation.service.js";

/**
 * Property-Based Tests para Validación de Config Builder UI
 * 
 * Tests de propiedades universales del servicio de validación,
 * cubriendo validación JSON, formato de duración K6 y nombres de métricas personalizadas.
 */

describe("Property 2: Validación JSON de headers y payload", () => {
  /**
   * **Validates: Requirements 3.3, 3.4**
   * 
   * Para cualquier string de entrada, la validación de headers debe aceptar el string
   * si y solo si es JSON parseable a un objeto (no array, no primitivo, no malformado).
   * La validación de payload debe aceptar el string si y solo si es JSON válido de cualquier tipo.
   */

  // Generador: JSON válido de cualquier tipo (objeto, array, primitivo)
  const arbValidJsonValue = fc.oneof(
    // Objetos
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(
        fc.string({ maxLength: 50 }),
        fc.integer(),
        fc.boolean(),
        fc.constant(null)
      ),
      { maxKeys: 10 }
    ),
    // Arrays
    fc.array(
      fc.oneof(
        fc.string({ maxLength: 30 }),
        fc.integer(),
        fc.boolean(),
        fc.constant(null)
      ),
      { maxLength: 10 }
    ),
    // Primitivos
    fc.string({ maxLength: 100 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  );

  // Generador: JSON string válido
  const arbValidJsonString = arbValidJsonValue.map((value) => JSON.stringify(value));

  // Generador: JSON object válido (solo objetos, no arrays ni primitivos)
  const arbValidJsonObject = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(
      fc.string({ maxLength: 50 }),
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    ),
    { maxKeys: 10 }
  );

  // Generador: JSON string de objeto válido
  const arbValidJsonObjectString = arbValidJsonObject.map((obj) => JSON.stringify(obj));

  // Generador: JSON string inválido (malformado)
  const arbInvalidJsonString = fc.oneof(
    // JSON incompleto
    fc.constant("{"),
    fc.constant("["),
    fc.constant("{key: value}"), // Sin comillas
    fc.constant("{'key': 'value'}"), // Comillas simples
    fc.constant('{"key": value}'), // Valor sin comillas
    fc.constant('{"key": "value",}'), // Coma final
    fc.constant('{"key"}'), // Sin valor
    // JSON con caracteres inválidos
    fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => {
        if (s.trim() === "") {
          return false;
        }

        try {
          JSON.parse(s);
          return false; // Si parsea exitosamente, no es inválido
        } catch {
          return true; // Si falla al parsear, es inválido
        }
      })
  );

  // Generador: JSON string válido pero no objeto (array o primitivo)
  const arbNonObjectJsonString = fc.oneof(
    // Arrays
    fc
      .array(
        fc.oneof(fc.string({ maxLength: 30 }), fc.integer(), fc.boolean(), fc.constant(null)),
        { maxLength: 10 }
      )
      .map((arr) => JSON.stringify(arr)),
    // Primitivos
    fc.string({ maxLength: 100 }).map((s) => JSON.stringify(s)),
    fc.integer().map((n) => JSON.stringify(n)),
    fc.boolean().map((b) => JSON.stringify(b)),
    fc.constant("null")
  );

  it("should accept any valid JSON string for payload validation", () => {
    fc.assert(
      fc.property(arbValidJsonString, (jsonString) => {
        const result = validateJson(jsonString, false);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("should reject malformed JSON strings", () => {
    fc.assert(
      fc.property(arbInvalidJsonString, (invalidJson) => {
        const result = validateJson(invalidJson, false);
        expect(result).not.toBeNull();
        expect(result).toContain("Invalid JSON");
      }),
      { numRuns: 100 }
    );
  });

  it("should accept only JSON objects when requireObject is true (headers validation)", () => {
    fc.assert(
      fc.property(arbValidJsonObjectString, (objectString) => {
        const result = validateJson(objectString, true);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("should reject arrays and primitives when requireObject is true", () => {
    fc.assert(
      fc.property(arbNonObjectJsonString, (nonObjectString) => {
        const result = validateJson(nonObjectString, true);
        expect(result).not.toBeNull();
        expect(result).toContain("must be an object");
      }),
      { numRuns: 100 }
    );
  });

  it("should reject empty or whitespace-only strings", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.constant("   "),
          fc.constant("\t"),
          fc.constant("\n"),
          fc.string({ maxLength: 10 }).filter((s) => s.trim() === "")
        ),
        (emptyString) => {
          const result = validateJson(emptyString, false);
          expect(result).toBe("JSON cannot be empty");
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test de ida y vuelta: JSON válido -> stringify -> validate -> debería pasar
  it("should accept round-trip JSON (value -> stringify -> validate)", () => {
    fc.assert(
      fc.property(arbValidJsonValue, (value) => {
        const jsonString = JSON.stringify(value);
        const result = validateJson(jsonString, false);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  // Test de consistencia: si validateJson acepta con requireObject=false, debe parsear
  it("should be consistent: accepted strings must be parseable", () => {
    fc.assert(
      fc.property(arbValidJsonString, (jsonString) => {
        const validationResult = validateJson(jsonString, false);

        if (validationResult === null) {
          // Si la validación pasa, debe poder parsearse
          expect(() => JSON.parse(jsonString)).not.toThrow();
        }
      }),
      { numRuns: 100 }
    );
  });

  // Test de consistencia: si validateJson acepta con requireObject=true, debe parsear a objeto
  it("should be consistent: accepted object strings must parse to objects", () => {
    fc.assert(
      fc.property(arbValidJsonObjectString, (objectString) => {
        const validationResult = validateJson(objectString, true);

        if (validationResult === null) {
          // Si la validación pasa, debe parsear a un objeto
          const parsed = JSON.parse(objectString);
          expect(typeof parsed).toBe("object");
          expect(parsed).not.toBeNull();
          expect(Array.isArray(parsed)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 7: Export-readiness bloquea estados inválidos", () => {
  /**
   * **Validates: Requirements 6.3, 2.5, 4.7, 4.8, 5.4, 5.6, 7.8, 7.9**
   * 
   * Para cualquier estado de configuración, la acción de exportar/descargar debe estar
   * bloqueada si se cumple al menos una de estas condiciones:
   * - No hay endpoints
   * - Algún endpoint tiene URL vacía o inválida
   * - Algún campo numérico está fuera de rango
   * - Headers no son objeto JSON
   * - Payload no es JSON válido
   * - Ningún perfil está habilitado en algún endpoint
   * - Un perfil habilitado tiene 0 stages
   * - Alguna expresión de threshold está vacía
   * - Alguna métrica agregada no tiene expresiones
   */

  // Helper: Generador de endpoint válido
  const arbValidEndpoint = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    url: fc.oneof(
      fc.constant("https://api.example.com/test"),
      fc.constant("http://localhost:8080/api"),
      fc.webUrl({ validSchemes: ["https"] })
    ),
    method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
    headersText: fc.constant('{"Content-Type": "application/json"}'),
    payloadText: fc.constant("{}"),
    expectedStatus: fc.integer({ min: 100, max: 599 }),
    maxRetries: fc.integer({ min: 0, max: 10 }),
    thinkTimeSeconds: fc.integer({ min: 0, max: 60 }),
    profiles: fc.array(
      fc.record({
        type: fc.constantFrom("loadtest", "stresstest", "capacitytest", "stabilitytest"),
        enabled: fc.boolean(),
        stages: fc.array(
          fc.record({
            duration: fc.oneof(
              fc.nat({ max: 300 }).map((n) => `${n}s`),
              fc.nat({ max: 60 }).map((n) => `${n}m`),
              fc.nat({ max: 24 }).map((n) => `${n}h`)
            ),
            target: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        thresholds: fc.array(
          fc.record({
            metric: fc.constantFrom(
              "http_req_duration",
              "http_req_failed",
              "http_reqs",
              "iteration_duration"
            ),
            expressions: fc.array(
              fc.constantFrom("p(95) < 2000", "avg < 500", "max < 5000", "count > 0"),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          { maxLength: 3 }
        ),
      }),
      { minLength: 4, maxLength: 4 }
    ),
  });

  it("debe rechazar estado sin endpoints", () => {
    const arbEmptyState = fc.constant({
      endpoints: [],
      activeEndpointId: null,
    });

    fc.assert(
      fc.property(arbEmptyState, (state) => {
        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.message.includes("endpoint"))).toBe(true);
      }),
      { numRuns: 10 }
    );
  });

  it("debe rechazar estados con URL vacía o inválida", () => {
    const arbInvalidUrlEndpoint = arbValidEndpoint.chain((endpoint) =>
      fc.constantFrom("", "   ", "ftp://invalid.com", "not-a-url", "http:/missing-slash").map((invalidUrl) => ({
        ...endpoint,
        url: invalidUrl,
        profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
      }))
    );

    fc.assert(
      fc.property(arbInvalidUrlEndpoint, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === "url")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con campos numéricos fuera de rango", () => {
    const arbOutOfRangeEndpoint = arbValidEndpoint.chain((endpoint) =>
      fc.oneof(
        // expectedStatus fuera de rango
        fc.constantFrom(99, 600, 1000, -1).map((status) => ({
          ...endpoint,
          expectedStatus: status,
          profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
        })),
        // maxRetries fuera de rango
        fc.constantFrom(-1, 11, 100).map((retries) => ({
          ...endpoint,
          maxRetries: retries,
          profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
        })),
        // thinkTimeSeconds fuera de rango
        fc.constantFrom(-1, 61, 1000).map((thinkTime) => ({
          ...endpoint,
          thinkTimeSeconds: thinkTime,
          profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
        }))
      )
    );

    fc.assert(
      fc.property(arbOutOfRangeEndpoint, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con headers no-objeto JSON", () => {
    const arbNonObjectHeaders = arbValidEndpoint.chain((endpoint) =>
      fc.oneof(
        fc.constant('["array", "not", "object"]'),
        fc.constant('"string primitive"'),
        fc.constant("123"),
        fc.constant("true"),
        fc.constant("null")
      ).map((invalidHeaders) => ({
        ...endpoint,
        headersText: invalidHeaders,
        profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
      }))
    );

    fc.assert(
      fc.property(arbNonObjectHeaders, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === "headers")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con payload JSON inválido", () => {
    const arbInvalidJsonPayload = arbValidEndpoint.chain((endpoint) =>
      fc.constantFrom("{invalid", "[unclosed", '{"key": value}', "{,}").map((invalidJson) => ({
        ...endpoint,
        payloadText: invalidJson,
        profiles: endpoint.profiles.map((p) => ({ ...p, enabled: p.type === "loadtest" })),
      }))
    );

    fc.assert(
      fc.property(arbInvalidJsonPayload, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === "payload")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados sin perfiles habilitados", () => {
    const arbNoEnabledProfiles = arbValidEndpoint.map((endpoint) => ({
      ...endpoint,
      profiles: endpoint.profiles.map((p) => ({ ...p, enabled: false })),
    }));

    fc.assert(
      fc.property(arbNoEnabledProfiles, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === "profiles")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con perfil habilitado sin stages", () => {
    const arbEnabledProfileNoStages = arbValidEndpoint.map((endpoint) => ({
      ...endpoint,
      profiles: endpoint.profiles.map((p, index) =>
        index === 0
          ? { ...p, enabled: true, stages: [] } // Primer perfil habilitado sin stages
          : { ...p, enabled: false }
      ),
    }));

    fc.assert(
      fc.property(arbEnabledProfileNoStages, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field.includes("stages"))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con expresiones de threshold vacías", () => {
    const arbEmptyThresholdExpression = arbValidEndpoint.map((endpoint) => ({
      ...endpoint,
      profiles: endpoint.profiles.map((p, index) =>
        index === 0
          ? {
              ...p,
              enabled: true,
              thresholds: [
                {
                  metric: "http_req_duration",
                  expressions: ["", "  ", "\t"], // Expresiones vacías o solo whitespace
                },
              ],
            }
          : { ...p, enabled: false }
      ),
    }));

    fc.assert(
      fc.property(arbEmptyThresholdExpression, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field.includes("thresholds"))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con métrica sin expresiones", () => {
    const arbMetricNoExpressions = arbValidEndpoint.map((endpoint) => ({
      ...endpoint,
      profiles: endpoint.profiles.map((p, index) =>
        index === 0
          ? {
              ...p,
              enabled: true,
              thresholds: [
                {
                  metric: "http_req_duration",
                  expressions: [], // Métrica agregada pero sin expresiones
                },
              ],
            }
          : { ...p, enabled: false }
      ),
    }));

    fc.assert(
      fc.property(arbMetricNoExpressions, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field.includes("thresholds"))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("debe aceptar estados completamente válidos", () => {
    const arbValidState = arbValidEndpoint.map((endpoint) => ({
      endpoints: [
        {
          ...endpoint,
          // Asegurar que al menos un perfil esté habilitado con stages y thresholds válidos
          profiles: endpoint.profiles.map((p, index) =>
            index === 0
              ? {
                  ...p,
                  enabled: true,
                  stages: p.stages.length > 0 ? p.stages : [{ duration: "30s", target: 10 }],
                  thresholds: p.thresholds.length > 0 ? p.thresholds : [
                    { metric: "http_req_duration", expressions: ["p(95) < 2000"] }
                  ],
                }
              : { ...p, enabled: false }
          ),
        },
      ],
      activeEndpointId: endpoint.id,
    }));

    fc.assert(
      fc.property(arbValidState, (state) => {
        const result = validateExportReady(state);

        // Un estado completamente válido debe pasar la validación
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it("debe rechazar estados con múltiples errores combinados", () => {
    const arbMultipleErrors = arbValidEndpoint.chain((endpoint) =>
      fc.tuple(
        fc.constantFrom("", "invalid-url"),
        fc.constantFrom(99, 600),
        fc.constantFrom('["array"]', "{invalid"),
        fc.boolean()
      ).map(([invalidUrl, invalidStatus, invalidHeaders, disableProfiles]) => ({
        ...endpoint,
        url: invalidUrl,
        expectedStatus: invalidStatus,
        headersText: invalidHeaders,
        profiles: endpoint.profiles.map((p) => ({ ...p, enabled: !disableProfiles && p.type === "loadtest" })),
      }))
    );

    fc.assert(
      fc.property(arbMultipleErrors, (endpoint) => {
        const state = {
          endpoints: [endpoint],
          activeEndpointId: endpoint.id,
        };

        const result = validateExportReady(state);

        // Debe rechazar y reportar múltiples errores
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("debe validar consistentemente el mismo estado", () => {
    fc.assert(
      fc.property(arbValidEndpoint, (endpoint) => {
        const state = {
          endpoints: [
            {
              ...endpoint,
              profiles: endpoint.profiles.map((p, index) =>
                index === 0 ? { ...p, enabled: true } : { ...p, enabled: false }
              ),
            },
          ],
          activeEndpointId: endpoint.id,
        };

        // Validar el mismo estado dos veces
        const result1 = validateExportReady(state);
        const result2 = validateExportReady(state);

        // Los resultados deben ser idénticos
        expect(result1.valid).toBe(result2.valid);
        expect(result1.errors.length).toBe(result2.errors.length);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 3: Validación de formato de duración K6 y nombre de métrica", () => {
  /**
   * Validates: Requirements 4.3, 4.4, 5.3
   * 
   * Para cualquier string de duración, el validador debe aceptarlo si y solo si
   * coincide con el formato de tiempo K6 (ej., "30s", "2m", "1h").
   */
  describe("Validación de duración K6", () => {
    it("debe aceptar duraciones K6 válidas generadas aleatoriamente", () => {
      // Generador de duraciones K6 válidas (incluye decimales y ms)
      const arbValidDuration = fc.oneof(
        // Segundos (enteros y decimales)
        fc.nat({ max: 3600 }).map((n) => `${n}s`),
        fc.double({ min: 0.1, max: 3600, noDefaultInfinity: true, noNaN: true }).map((n) => `${n.toFixed(2)}s`),
        // Minutos (enteros y decimales)
        fc.nat({ max: 1440 }).map((n) => `${n}m`),
        fc.double({ min: 0.1, max: 1440, noDefaultInfinity: true, noNaN: true }).map((n) => `${n.toFixed(2)}m`),
        // Horas (enteros y decimales)
        fc.nat({ max: 168 }).map((n) => `${n}h`),
        fc.double({ min: 0.1, max: 168, noDefaultInfinity: true, noNaN: true }).map((n) => `${n.toFixed(2)}h`),
        // Milisegundos (enteros y decimales)
        fc.nat({ max: 10000 }).map((n) => `${n}ms`),
        fc.double({ min: 0.1, max: 10000, noDefaultInfinity: true, noNaN: true }).map((n) => `${n.toFixed(2)}ms`),
        // Combinaciones (ej: "1h30m", "2m30s")
        fc.tuple(fc.nat({ max: 24 }), fc.nat({ max: 60 })).map(([h, m]) => `${h}h${m}m`),
        fc.tuple(fc.nat({ max: 60 }), fc.nat({ max: 60 })).map(([m, s]) => `${m}m${s}s`)
      );

      fc.assert(
        fc.property(arbValidDuration, (duration) => {
          const result = validateDuration(duration);
          
          // Una duración K6 válida debe pasar la validación (retornar null)
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("debe rechazar duraciones con formato incorrecto", () => {
      // Generador de duraciones inválidas
      const arbInvalidDuration = fc.oneof(
        // Sin unidad de tiempo
        fc.nat({ min: 1 }).map(String),
        // Unidad inválida (K6 soporta ms, s, m, h - no d, w, etc.)
        fc.nat({ max: 100 }).chain((n) =>
          fc.constantFrom("d", "w", "us", "ns", "S", "M", "H", "x", "min", "sec", "hr").map((unit) => `${n}${unit}`)
        ),
        // Sin número
        fc.constantFrom("s", "m", "h", "ms", "xs", "ym", "zh"),
        // Con espacios (K6 no acepta espacios en duraciones)
        fc.nat({ max: 100 }).chain((n) =>
          fc.constantFrom("s", "m", "h", "ms").map((unit) => `${n} ${unit}`)
        ),
        // Números negativos
        fc.integer({ max: -1 }).chain((n) =>
          fc.constantFrom("s", "m", "h", "ms").map((unit) => `${n}${unit}`)
        ),
        // Formato con caracteres especiales inválidos
        fc.constantFrom("30-s", "2+m", "1/h", "10@s", "5#m"),
        // Formatos malformados
        fc.constantFrom("s30", "m2", "h1", ".5s", "s.5", "1.s", "1..5s")
      );

      fc.assert(
        fc.property(arbInvalidDuration, (duration) => {
          const result = validateDuration(duration);
          
          // Una duración inválida debe fallar la validación (retornar mensaje de error)
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
        }),
        { numRuns: 100 }
      );
    });

    it("debe rechazar duraciones vacías o solo whitespace", () => {
      const arbEmptyDuration = fc.oneof(
        fc.constant(""),
        fc.constant("   "),
        fc.constant("\t"),
        fc.constant("\n"),
        fc.constant("  \t\n  ")
      );

      fc.assert(
        fc.property(arbEmptyDuration, (duration) => {
          const result = validateDuration(duration);
          
          expect(result).not.toBeNull();
          expect(result).toContain("empty");
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Validates: Requirements 4.3, 4.4, 5.3
   * 
   * Para cualquier string de nombre de métrica personalizada, debe aceptarse
   * si y solo si tiene entre 1 y 128 caracteres compuestos exclusivamente
   * de letras, dígitos y guiones bajos.
   */
  describe("Validación de nombres de métricas personalizadas", () => {
    it("debe aceptar nombres de métricas válidos generados aleatoriamente", () => {
      // Generador de nombres de métricas válidos
      const arbValidMetricName = fc
        .array(
          fc.oneof(
            fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))),
            fc.constantFrom(...("0123456789".split(""))),
            fc.constant("_")
          ),
          { minLength: 1, maxLength: 128 }
        )
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(arbValidMetricName, (metricName) => {
          const result = validateMetricName(metricName);
          
          // Un nombre de métrica válido debe pasar la validación (retornar null)
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("debe rechazar nombres de métricas con caracteres inválidos", () => {
      // Generador de nombres con caracteres no permitidos
      const arbInvalidMetricName = fc.oneof(
        // Con caracteres especiales
        fc
          .tuple(
            fc.string({ minLength: 0, maxLength: 60 }),
            fc.constantFrom("-", ".", " ", ":", "/", "\\", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "=", "[", "]", "{", "}", "|", ";", "'", '"', "<", ">", ",", "?", "!", "~", "`"),
            fc.string({ minLength: 0, maxLength: 60 })
          )
          .map(([prefix, special, suffix]) => prefix + special + suffix),
        // Con espacios
        fc.string({ minLength: 1, maxLength: 50 }).map((s) => `metric ${s}`),
        // Demasiado largo (> 128 caracteres)
        fc
          .array(
            fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".split(""))),
            { minLength: 129, maxLength: 200 }
          )
          .map((chars) => chars.join(""))
      );

      fc.assert(
        fc.property(arbInvalidMetricName, (metricName) => {
          const result = validateMetricName(metricName);
          
          // Un nombre de métrica inválido debe fallar la validación
          expect(result).not.toBeNull();
          expect(typeof result).toBe("string");
        }),
        { numRuns: 100 }
      );
    });

    it("debe rechazar nombres vacíos o solo whitespace", () => {
      const arbEmptyMetricName = fc.oneof(
        fc.constant(""),
        fc.constant("   "),
        fc.constant("\t"),
        fc.constant("\n"),
        fc.constant("  \t\n  "),
        fc.string({ minLength: 1, maxLength: 20 })
          .map((s) => " ".repeat(s.length))
      );

      fc.assert(
        fc.property(arbEmptyMetricName, (metricName) => {
          const result = validateMetricName(metricName);
          
          expect(result).not.toBeNull();
          expect(result).toMatch(/empty|whitespace/i);
        }),
        { numRuns: 20 }
      );
    });

    it("debe aceptar nombres en el límite de longitud (128 caracteres)", () => {
      const arbBoundaryMetricName = fc
        .array(
          fc.oneof(
            fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".split("")))
          ),
          { minLength: 128, maxLength: 128 }
        )
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(arbBoundaryMetricName, (metricName) => {
          const result = validateMetricName(metricName);
          
          // 128 caracteres exactos debe ser válido
          expect(result).toBeNull();
        }),
        { numRuns: 50 }
      );
    });

    it("debe rechazar nombres que excedan 128 caracteres", () => {
      const arbTooLongMetricName = fc
        .array(
          fc.oneof(
            fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".split("")))
          ),
          { minLength: 129, maxLength: 200 }
        )
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(arbTooLongMetricName, (metricName) => {
          const result = validateMetricName(metricName);
          
          // Más de 128 caracteres debe ser inválido
          expect(result).not.toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Test de propiedad combinada: duraciones y métricas juntas
   * Valida que ambas validaciones son independientes y pueden
   * usarse en paralelo sin afectarse mutuamente
   */
  describe("Validación combinada de duración y métrica", () => {
    it("debe validar independientemente duraciones y métricas", () => {
      const arbValidDuration = fc.oneof(
        fc.nat({ max: 300 }).map((n) => `${n}s`),
        fc.nat({ max: 60 }).map((n) => `${n}m`),
        fc.nat({ max: 24 }).map((n) => `${n}h`),
        fc.nat({ max: 1000 }).map((n) => `${n}ms`),
        fc.double({ min: 0.1, max: 100, noDefaultInfinity: true, noNaN: true }).map((n) => `${n.toFixed(1)}s`)
      );

      const arbValidMetricName = fc
        .array(
          fc.oneof(
            fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_".split("")))
          ),
          { minLength: 1, maxLength: 128 }
        )
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(arbValidDuration, arbValidMetricName, (duration, metricName) => {
          const durationResult = validateDuration(duration);
          const metricResult = validateMetricName(metricName);
          
          // Ambas validaciones deben pasar independientemente
          expect(durationResult).toBeNull();
          expect(metricResult).toBeNull();
          
          // Las validaciones no deben interferir entre sí
          expect(validateDuration(duration)).toBeNull();
          expect(validateMetricName(metricName)).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });
});
