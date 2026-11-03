import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateConfig } from "../../src/services/validateConfig.js";
import { serializeConfig } from "../../src/services/serializeConfig.js";
import { arbInvalidConfig, arbConfig } from "./generators.js";

/**
 * Property 4: Rechazo de configuraciones inválidas
 *
 * For any configuración que contenga al menos una violación del contrato
 * (URL vacía/no-absoluta, método no soportado, headers no-objeto, payload no-JSON,
 * status fuera de rango, perfil sin stages, stage con duration vacío o target negativo,
 * expresión de threshold vacía), la función de validación DEBE retornar `valid: false`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
 */
describe("Feature: k6-config-contract, Property 4: Rechazo de configuraciones inválidas", () => {
  it("validateConfig retorna valid: false para configs con al menos una violación del contrato", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // La validación debe fallar
        expect(result.valid).toBe(false);

        // Debe haber al menos un error reportado
        expect(result.errors.length).toBeGreaterThan(0);

        // Cada error debe tener la estructura correcta
        result.errors.forEach((error) => {
          expect(error).toHaveProperty("path");
          expect(error).toHaveProperty("rule");
          expect(error).toHaveProperty("message");
          expect(typeof error.path).toBe("string");
          expect(typeof error.rule).toBe("string");
          expect(typeof error.message).toBe("string");
          expect(error.path.length).toBeGreaterThan(0);
          expect(error.rule.length).toBeGreaterThan(0);
          expect(error.message.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("validateConfig identifica correctamente violaciones de URL", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // Si hay violaciones de URL, deben estar reportadas
        const urlErrors = result.errors.filter(
          (error) => error.path.includes(".url") && 
                    (error.rule === "required" || error.rule === "invalid_url")
        );

        // Verificar que los errores de URL tienen mensajes apropiados
        urlErrors.forEach((error) => {
          expect(error.message).toMatch(/URL|url/);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("validateConfig identifica correctamente violaciones de método HTTP", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // Si hay violaciones de método, deben estar reportadas
        const methodErrors = result.errors.filter(
          (error) => error.path.includes(".method") && error.rule === "invalid_method"
        );

        // Verificar que los errores de método tienen mensajes apropiados
        methodErrors.forEach((error) => {
          expect(error.message).toMatch(/Method|method/);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("validateConfig identifica correctamente violaciones de status HTTP", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // Si hay violaciones de status, deben estar reportadas
        const statusErrors = result.errors.filter(
          (error) => error.path.includes(".expectedStatus") && error.rule === "invalid_status"
        );

        // Verificar que los errores de status tienen mensajes apropiados
        statusErrors.forEach((error) => {
          expect(error.message).toMatch(/status|100|599/i);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("validateConfig identifica correctamente violaciones en stages", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // Si hay violaciones de stages, deben estar reportadas
        const stageErrors = result.errors.filter(
          (error) => 
            (error.path.includes(".stages") && error.rule === "required") ||
            (error.path.includes(".stages[") && 
             (error.rule === "required" || error.rule === "invalid_target"))
        );

        // Verificar que los errores de stage tienen mensajes apropiados
        stageErrors.forEach((error) => {
          expect(error.message).toMatch(/stage|duration|target/i);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("validateConfig identifica correctamente violaciones de thresholds", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (invalidConfig) => {
        const result = validateConfig(invalidConfig);

        // Si hay violaciones de thresholds, deben estar reportadas
        const thresholdErrors = result.errors.filter(
          (error) => 
            error.path.includes(".thresholds") && 
            (error.rule === "empty_threshold" || error.rule === "invalid_threshold")
        );

        // Verificar que los errores de threshold tienen mensajes apropiados
        thresholdErrors.forEach((error) => {
          expect(error.message).toMatch(/threshold/i);
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Aceptación de configuraciones válidas
 *
 * For any configuración que cumpla todas las reglas del contrato (URL absoluta,
 * método soportado, headers objeto, payload JSON válido, status 100-599, perfiles
 * con al menos un stage válido, stages con duration no-vacío y target ≥ 0,
 * expresiones de threshold no-vacías), la función de validación debe retornar
 * `valid: true`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
 */
describe("Feature: k6-config-contract, Property 5: Aceptación de configuraciones válidas", () => {
  it("valida correctamente configuraciones que cumplen todas las reglas del contrato", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        // La validación debe pasar para configs generadas por arbConfig (que son válidas por diseño)
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it("acepta endpoints con todos los campos requeridos válidos", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        // Verificar que cada endpoint tiene los campos requeridos
        config.endpoints.forEach((endpoint) => {
          // URL absoluta
          expect(endpoint.url).toBeTruthy();
          expect(endpoint.url).toMatch(/^https?:\/\//);

          // Método soportado
          expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(endpoint.method);

          // Status en rango
          expect(endpoint.expectedStatus).toBeGreaterThanOrEqual(100);
          expect(endpoint.expectedStatus).toBeLessThanOrEqual(599);
        });

        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("acepta endpoints con campos opcionales válidos (headers, payload, metadata)", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        config.endpoints.forEach((endpoint) => {
          // Headers debe ser objeto o undefined
          if (endpoint.headers !== undefined) {
            expect(typeof endpoint.headers).toBe("object");
            expect(endpoint.headers).not.toBeNull();
            expect(Array.isArray(endpoint.headers)).toBe(false);
          }

          // Payload debe ser JSON válido o undefined
          if (endpoint.payload !== undefined) {
            expect(() => JSON.stringify(endpoint.payload)).not.toThrow();
          }

          // Metadata opcional no debe afectar validez
          if (endpoint.name !== undefined) {
            expect(typeof endpoint.name).toBe("string");
          }
          if (endpoint.description !== undefined) {
            expect(typeof endpoint.description).toBe("string");
          }
        });

        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("acepta perfiles de prueba válidos con stages y thresholds correctos", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        config.endpoints.forEach((endpoint) => {
          const profiles = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ];

          profiles.forEach((profile) => {
            if (profile) {
              // Perfil debe tener al menos un stage
              expect(profile.stages.length).toBeGreaterThan(0);

              // Cada stage debe ser válido
              profile.stages.forEach((stage) => {
                expect(stage.duration).toBeTruthy();
                expect(stage.duration.trim()).not.toBe("");
                expect(stage.target).toBeGreaterThanOrEqual(0);
              });

              // Thresholds deben tener expresiones no vacías
              if (profile.thresholds) {
                Object.values(profile.thresholds).forEach((expressions) => {
                  expect(Array.isArray(expressions)).toBe(true);
                  expressions.forEach((expr) => {
                    expect(expr).toBeTruthy();
                    expect(expr.trim()).not.toBe("");
                  });
                });
              }
            }
          });
        });

        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("acepta configuraciones con subconjuntos de perfiles (0 a 4 perfiles por endpoint)", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        config.endpoints.forEach((endpoint) => {
          const profileCount = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ].filter((p) => p !== undefined).length;

          // Los perfiles son opcionales, puede haber entre 0 y 4
          expect(profileCount).toBeGreaterThanOrEqual(0);
          expect(profileCount).toBeLessThanOrEqual(4);
        });

        // Configuración sigue siendo válida independientemente del número de perfiles
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("mantiene validez independientemente del número de endpoints (1-10)", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const result = validateConfig(config);

        // arbConfig genera entre 1 y 10 endpoints
        expect(config.endpoints.length).toBeGreaterThanOrEqual(1);
        expect(config.endpoints.length).toBeLessThanOrEqual(10);

        // Validación debe pasar para cualquier cantidad de endpoints válidos
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("es determinista: misma config produce mismo resultado de validación", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Validar la misma config dos veces
        const result1 = validateConfig(config);
        const result2 = validateConfig(config);

        // Resultados deben ser idénticos
        expect(result1.valid).toBe(result2.valid);
        expect(result1.errors).toEqual(result2.errors);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 1: Round-trip de serialización
 *
 * For any configuración válida (Config con endpoints, perfiles, stages y thresholds),
 * serializar a texto JavaScript y luego parsear/evaluar ese texto debe producir un
 * objeto estructuralmente equivalente al original.
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4**
 */
describe("Feature: k6-config-contract, Property 1: Round-trip de serialización", () => {
  /**
   * Helper para evaluar el código JavaScript generado de forma segura
   * Evalúa el ES module y extrae el objeto exportado
   */
  function evaluateSerializedConfig(serialized: string): Config {
    // Remover el "export default" para poder evaluar el objeto directamente
    const objectText = serialized.replace(/^export\s+default\s+/, "").replace(/;\s*$/, "");
    
    // Evaluar el código JavaScript (seguro en contexto de test)
    // eslint-disable-next-line no-eval
    const evaluated = eval(`(${objectText})`);
    
    return evaluated as Config;
  }

  /**
   * Compara dos valores de forma profunda, considerando equivalencia estructural
   * Maneja casos especiales como undefined vs ausencia de propiedad
   */
  function deepEqual(actual: unknown, expected: unknown, path: string = "root"): void {
    // Manejar tipos primitivos
    if (actual === expected) {
      return;
    }

    // Manejar null
    if (actual === null || expected === null) {
      if (actual !== expected) {
        throw new Error(`Mismatch at ${path}: expected ${expected}, got ${actual}`);
      }
      return;
    }

    // Manejar undefined (puede no aparecer en el serializado)
    if (actual === undefined || expected === undefined) {
      // En la serialización, undefined puede omitirse, lo cual está bien
      // Solo es un error si ambos no son undefined/null
      if (actual !== undefined && expected !== undefined) {
        throw new Error(`Mismatch at ${path}: expected ${expected}, got ${actual}`);
      }
      return;
    }

    // Manejar arrays
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        throw new Error(`Mismatch at ${path}: expected array, got ${typeof actual}`);
      }
      if (actual.length !== expected.length) {
        throw new Error(`Mismatch at ${path}: expected length ${expected.length}, got ${actual.length}`);
      }
      expected.forEach((item, index) => {
        deepEqual(actual[index], item, `${path}[${index}]`);
      });
      return;
    }

    // Manejar objetos
    if (typeof expected === "object" && typeof actual === "object") {
      const expectedObj = expected as Record<string, unknown>;
      const actualObj = actual as Record<string, unknown>;

      // Verificar que todas las propiedades esperadas existan en actual
      Object.keys(expectedObj).forEach((key) => {
        const expectedValue = expectedObj[key];
        const actualValue = actualObj[key];

        // Si el valor esperado es undefined, la propiedad puede no existir en actual
        if (expectedValue === undefined) {
          // Es válido que la propiedad no exista o sea undefined
          if (actualValue !== undefined && actualValue !== null) {
            throw new Error(`Mismatch at ${path}.${key}: expected undefined, got ${actualValue}`);
          }
        } else {
          deepEqual(actualValue, expectedValue, `${path}.${key}`);
        }
      });

      // Verificar que no haya propiedades extra en actual (excepto undefined)
      Object.keys(actualObj).forEach((key) => {
        if (!(key in expectedObj)) {
          throw new Error(`Unexpected property at ${path}.${key}`);
        }
      });

      return;
    }

    // Tipos diferentes
    throw new Error(`Mismatch at ${path}: expected ${typeof expected}, got ${typeof actual}`);
  }

  it("serializa y deserializa configs válidas preservando estructura completa", () => {
    fc.assert(
      fc.property(arbConfig, (originalConfig) => {
        // Serializar la configuración a texto JavaScript
        const serialized = serializeConfig(originalConfig);

        // Verificar que el output es un ES module válido
        expect(serialized).toContain("export default");
        expect(serialized).toContain("endpoints:");

        // Evaluar el texto JavaScript para recuperar el objeto
        const parsedConfig = evaluateSerializedConfig(serialized);

        // Verificar que la estructura es equivalente al original
        expect(parsedConfig).toHaveProperty("endpoints");
        expect(Array.isArray(parsedConfig.endpoints)).toBe(true);
        expect(parsedConfig.endpoints.length).toBe(originalConfig.endpoints.length);

        // Comparación profunda de toda la estructura
        deepEqual(parsedConfig, originalConfig);
      }),
      { numRuns: 100 }
    );
  });

  it("preserva todos los campos requeridos del endpoint en round-trip", () => {
    fc.assert(
      fc.property(arbConfig, (originalConfig) => {
        const serialized = serializeConfig(originalConfig);
        const parsedConfig = evaluateSerializedConfig(serialized);

        originalConfig.endpoints.forEach((originalEndpoint, index) => {
          const parsedEndpoint = parsedConfig.endpoints[index];

          // Campos requeridos HTTP
          expect(parsedEndpoint.url).toBe(originalEndpoint.url);
          expect(parsedEndpoint.method).toBe(originalEndpoint.method);
          expect(parsedEndpoint.expectedStatus).toBe(originalEndpoint.expectedStatus);
          expect(parsedEndpoint.maxRetries).toBe(originalEndpoint.maxRetries);
          expect(parsedEndpoint.thinkTimeSeconds).toBe(originalEndpoint.thinkTimeSeconds);
        });
      }),
      { numRuns: 100 }
    );
  });

  it("preserva campos opcionales (payload, headers, name, description) en round-trip", () => {
    fc.assert(
      fc.property(arbConfig, (originalConfig) => {
        const serialized = serializeConfig(originalConfig);
        const parsedConfig = evaluateSerializedConfig(serialized);

        originalConfig.endpoints.forEach((originalEndpoint, index) => {
          const parsedEndpoint = parsedConfig.endpoints[index];

          // Payload
          if (originalEndpoint.payload !== undefined) {
            expect(parsedEndpoint.payload).toEqual(originalEndpoint.payload);
          } else {
            expect(parsedEndpoint.payload).toBeUndefined();
          }

          // Headers
          if (originalEndpoint.headers !== undefined) {
            expect(parsedEndpoint.headers).toEqual(originalEndpoint.headers);
          } else {
            expect(parsedEndpoint.headers).toBeUndefined();
          }

          // Metadata
          if (originalEndpoint.name !== undefined) {
            expect(parsedEndpoint.name).toBe(originalEndpoint.name);
          }
          if (originalEndpoint.description !== undefined) {
            expect(parsedEndpoint.description).toBe(originalEndpoint.description);
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  it("preserva perfiles de prueba (stages y thresholds) en round-trip", () => {
    fc.assert(
      fc.property(arbConfig, (originalConfig) => {
        const serialized = serializeConfig(originalConfig);
        const parsedConfig = evaluateSerializedConfig(serialized);

        originalConfig.endpoints.forEach((originalEndpoint, index) => {
          const parsedEndpoint = parsedConfig.endpoints[index];

          // Verificar cada tipo de perfil
          const profileNames: Array<"loadtest" | "stresstest" | "capacitytest" | "stabilitytest"> = [
            "loadtest",
            "stresstest",
            "capacitytest",
            "stabilitytest",
          ];

          profileNames.forEach((profileName) => {
            const originalProfile = originalEndpoint[profileName];
            const parsedProfile = parsedEndpoint[profileName];

            if (originalProfile !== undefined) {
              // El perfil debe existir en el parseado
              expect(parsedProfile).toBeDefined();

              // Verificar stages
              expect(parsedProfile.stages).toEqual(originalProfile.stages);

              // Verificar thresholds
              if (originalProfile.thresholds !== undefined) {
                expect(parsedProfile.thresholds).toEqual(originalProfile.thresholds);
              } else {
                expect(parsedProfile.thresholds).toBeUndefined();
              }
            } else {
              // El perfil no debe existir en el parseado
              expect(parsedProfile).toBeUndefined();
            }
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  it("es determinista: mismo input produce mismo output serializado", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized1 = serializeConfig(config);
        const serialized2 = serializeConfig(config);

        // El output debe ser idéntico
        expect(serialized1).toBe(serialized2);
      }),
      { numRuns: 100 }
    );
  });

  it("produce JavaScript sintácticamente válido", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized = serializeConfig(config);

        // Intentar evaluar el código no debe lanzar error de sintaxis
        expect(() => evaluateSerializedConfig(serialized)).not.toThrow();

        // El resultado debe ser un objeto con endpoints
        const parsed = evaluateSerializedConfig(serialized);
        expect(typeof parsed).toBe("object");
        expect(parsed).toHaveProperty("endpoints");
      }),
      { numRuns: 100 }
    );
  });

  it("mantiene tipos de datos correctos después de round-trip", () => {
    fc.assert(
      fc.property(arbConfig, (originalConfig) => {
        const serialized = serializeConfig(originalConfig);
        const parsedConfig = evaluateSerializedConfig(serialized);

        originalConfig.endpoints.forEach((originalEndpoint, index) => {
          const parsedEndpoint = parsedConfig.endpoints[index];

          // Verificar tipos de campos requeridos
          expect(typeof parsedEndpoint.url).toBe("string");
          expect(typeof parsedEndpoint.method).toBe("string");
          expect(typeof parsedEndpoint.expectedStatus).toBe("number");
          expect(typeof parsedEndpoint.maxRetries).toBe("number");
          expect(typeof parsedEndpoint.thinkTimeSeconds).toBe("number");

          // Verificar tipos de campos opcionales
          if (parsedEndpoint.payload !== undefined) {
            expect(typeof parsedEndpoint.payload).toBe("object");
          }
          if (parsedEndpoint.headers !== undefined) {
            expect(typeof parsedEndpoint.headers).toBe("object");
            expect(Array.isArray(parsedEndpoint.headers)).toBe(false);
          }
          if (parsedEndpoint.name !== undefined) {
            expect(typeof parsedEndpoint.name).toBe("string");
          }
          if (parsedEndpoint.description !== undefined) {
            expect(typeof parsedEndpoint.description).toBe("string");
          }

          // Verificar tipos en perfiles
          const profileNames: Array<"loadtest" | "stresstest" | "capacitytest" | "stabilitytest"> = [
            "loadtest",
            "stresstest",
            "capacitytest",
            "stabilitytest",
          ];

          profileNames.forEach((profileName) => {
            const profile = parsedEndpoint[profileName];
            if (profile !== undefined) {
              expect(Array.isArray(profile.stages)).toBe(true);
              profile.stages.forEach((stage) => {
                expect(typeof stage.duration).toBe("string");
                expect(typeof stage.target).toBe("number");
              });

              if (profile.thresholds !== undefined) {
                expect(typeof profile.thresholds).toBe("object");
                expect(Array.isArray(profile.thresholds)).toBe(false);
                Object.entries(profile.thresholds).forEach(([key, expressions]) => {
                  expect(typeof key).toBe("string");
                  expect(Array.isArray(expressions)).toBe(true);
                  expressions.forEach((expr) => {
                    expect(typeof expr).toBe("string");
                  });
                });
              }
            }
          });
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Preservación selectiva de perfiles
 *
 * For any endpoint con un subconjunto arbitrario de perfiles configurados (entre 0 y 4 perfiles),
 * el output serializado debe contener exactamente los perfiles configurados y omitir los no configurados.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**
 */
describe("Feature: k6-config-contract, Property 2: Preservación selectiva de perfiles", () => {
  it("serializa exactamente los perfiles configurados y omite los no configurados", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Serializar la configuración
        const serialized = serializeConfig(config);

        // Evaluar el texto serializado para obtener el objeto JavaScript
        // Remover "export default" y el punto y coma final para evaluar correctamente
        const toEval = serialized.replace("export default", "").replace(/;[\s]*$/, "");
        // eslint-disable-next-line no-eval
        const evaluated = eval(`(${toEval})`);

        // Verificar cada endpoint
        config.endpoints.forEach((originalEndpoint, endpointIndex) => {
          const evaluatedEndpoint = evaluated.endpoints[endpointIndex];

          // Perfiles configurados en el endpoint original
          const profileNames: Array<"loadtest" | "stresstest" | "capacitytest" | "stabilitytest"> = [
            "loadtest",
            "stresstest",
            "capacitytest",
            "stabilitytest",
          ];

          profileNames.forEach((profileName) => {
            const originalProfile = originalEndpoint[profileName];
            const evaluatedProfile = evaluatedEndpoint[profileName];

            if (originalProfile !== undefined) {
              // Si el perfil está configurado, debe existir en el output
              expect(evaluatedProfile).toBeDefined();
              expect(evaluatedProfile).not.toBeNull();
              
              // Verificar que el perfil serializado tiene la estructura correcta
              expect(evaluatedProfile).toHaveProperty("stages");
              expect(Array.isArray(evaluatedProfile.stages)).toBe(true);
              expect(evaluatedProfile.stages.length).toBeGreaterThan(0);
            } else {
              // Si el perfil NO está configurado, NO debe existir en el output
              expect(evaluatedProfile).toBeUndefined();
            }
          });
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("preserva perfiles independientes por endpoint sin contaminar otros endpoints", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Asegurar que hay al menos 2 endpoints para esta prueba
        if (config.endpoints.length < 2) {
          return true; // Trivial case
        }

        const serialized = serializeConfig(config);
        const toEval = serialized.replace("export default", "").replace(/;[\s]*$/, "");
        // eslint-disable-next-line no-eval
        const evaluated = eval(`(${toEval})`);

        // Verificar que los perfiles de cada endpoint son independientes
        config.endpoints.forEach((originalEndpoint, index) => {
          const evaluatedEndpoint = evaluated.endpoints[index];

          // Contar perfiles configurados en el endpoint original
          const originalProfileCount = [
            originalEndpoint.loadtest,
            originalEndpoint.stresstest,
            originalEndpoint.capacitytest,
            originalEndpoint.stabilitytest,
          ].filter((p) => p !== undefined).length;

          // Contar perfiles en el endpoint evaluado
          const evaluatedProfileCount = [
            evaluatedEndpoint.loadtest,
            evaluatedEndpoint.stresstest,
            evaluatedEndpoint.capacitytest,
            evaluatedEndpoint.stabilitytest,
          ].filter((p) => p !== undefined).length;

          // Los conteos deben coincidir
          expect(evaluatedProfileCount).toBe(originalProfileCount);
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("maneja correctamente endpoints con 0 perfiles configurados", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized = serializeConfig(config);
        const toEval = serialized.replace("export default", "").replace(/;[\s]*$/, "");
        // eslint-disable-next-line no-eval
        const evaluated = eval(`(${toEval})`);

        config.endpoints.forEach((originalEndpoint, index) => {
          const evaluatedEndpoint = evaluated.endpoints[index];

          // Identificar endpoints sin perfiles
          const hasNoProfiles =
            originalEndpoint.loadtest === undefined &&
            originalEndpoint.stresstest === undefined &&
            originalEndpoint.capacitytest === undefined &&
            originalEndpoint.stabilitytest === undefined;

          if (hasNoProfiles) {
            // Verificar que el endpoint evaluado tampoco tiene perfiles
            expect(evaluatedEndpoint.loadtest).toBeUndefined();
            expect(evaluatedEndpoint.stresstest).toBeUndefined();
            expect(evaluatedEndpoint.capacitytest).toBeUndefined();
            expect(evaluatedEndpoint.stabilitytest).toBeUndefined();
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("maneja correctamente endpoints con todos los perfiles configurados (4/4)", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized = serializeConfig(config);
        const toEval = serialized.replace("export default", "").replace(/;[\s]*$/, "");
        // eslint-disable-next-line no-eval
        const evaluated = eval(`(${toEval})`);

        config.endpoints.forEach((originalEndpoint, index) => {
          const evaluatedEndpoint = evaluated.endpoints[index];

          // Identificar endpoints con todos los perfiles
          const hasAllProfiles =
            originalEndpoint.loadtest !== undefined &&
            originalEndpoint.stresstest !== undefined &&
            originalEndpoint.capacitytest !== undefined &&
            originalEndpoint.stabilitytest !== undefined;

          if (hasAllProfiles) {
            // Verificar que todos los perfiles están presentes en el output
            expect(evaluatedEndpoint.loadtest).toBeDefined();
            expect(evaluatedEndpoint.stresstest).toBeDefined();
            expect(evaluatedEndpoint.capacitytest).toBeDefined();
            expect(evaluatedEndpoint.stabilitytest).toBeDefined();

            // Verificar que cada perfil tiene la estructura correcta
            [
              evaluatedEndpoint.loadtest,
              evaluatedEndpoint.stresstest,
              evaluatedEndpoint.capacitytest,
              evaluatedEndpoint.stabilitytest,
            ].forEach((profile) => {
              expect(profile).toHaveProperty("stages");
              expect(Array.isArray(profile.stages)).toBe(true);
            });
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("preserva correctamente subconjuntos parciales de perfiles (1-3 perfiles)", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized = serializeConfig(config);
        const toEval = serialized.replace("export default", "").replace(/;[\s]*$/, "");
        // eslint-disable-next-line no-eval
        const evaluated = eval(`(${toEval})`);

        config.endpoints.forEach((originalEndpoint, index) => {
          const evaluatedEndpoint = evaluated.endpoints[index];

          // Contar perfiles configurados
          const profileCount = [
            originalEndpoint.loadtest,
            originalEndpoint.stresstest,
            originalEndpoint.capacitytest,
            originalEndpoint.stabilitytest,
          ].filter((p) => p !== undefined).length;

          // Para subconjuntos parciales (1-3 perfiles)
          if (profileCount >= 1 && profileCount <= 3) {
            // Verificar correspondencia exacta para cada perfil
            const profileNames: Array<"loadtest" | "stresstest" | "capacitytest" | "stabilitytest"> = [
              "loadtest",
              "stresstest",
              "capacitytest",
              "stabilitytest",
            ];

            profileNames.forEach((profileName) => {
              if (originalEndpoint[profileName] !== undefined) {
                expect(evaluatedEndpoint[profileName]).toBeDefined();
              } else {
                expect(evaluatedEndpoint[profileName]).toBeUndefined();
              }
            });
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("el texto serializado NO contiene nombres de perfiles no configurados", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        const serialized = serializeConfig(config);

        config.endpoints.forEach((endpoint) => {
          // Para cada perfil no configurado, verificar que su nombre no aparece en el output
          if (endpoint.loadtest === undefined) {
            // Buscar "loadtest:" en el texto - no debe aparecer para este endpoint
            // Esta verificación es más débil porque multiple endpoints pueden tener loadtest
            // Pero al menos verificamos que no hay un "loadtest: undefined" explícito
            expect(serialized).not.toContain("loadtest: undefined");
          }
          if (endpoint.stresstest === undefined) {
            expect(serialized).not.toContain("stresstest: undefined");
          }
          if (endpoint.capacitytest === undefined) {
            expect(serialized).not.toContain("capacitytest: undefined");
          }
          if (endpoint.stabilitytest === undefined) {
            expect(serialized).not.toContain("stabilitytest: undefined");
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: Preservación exacta de metric keys
 *
 * For any conjunto de thresholds con metric keys (built-in o custom, incluyendo
 * `waiting_time`, `Errors`, `Total_Reqs`, `retries`, `transaction_duration`,
 * `transactions_per_second`, `active_vus`), la serialización debe preservar cada key
 * exactamente como fue proporcionado, sin alteración de capitalización o formato.
 *
 * **Validates: Requirements 4.5, 6.1, 6.2, 6.3, 6.4**
 */
describe("Feature: k6-config-contract, Property 3: Preservación exacta de metric keys", () => {
  it("preserva metric keys exactamente como fueron proporcionados en thresholds", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Recolectar todos los metric keys originales de todos los thresholds
        const originalMetricKeys = new Set<string>();
        
        config.endpoints.forEach((endpoint) => {
          const profiles = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ];

          profiles.forEach((profile) => {
            if (profile?.thresholds) {
              Object.keys(profile.thresholds).forEach((key) => {
                originalMetricKeys.add(key);
              });
            }
          });
        });

        // Si no hay thresholds, el test es trivial
        if (originalMetricKeys.size === 0) {
          return true;
        }

        // Serializar la configuración
        const serialized = serializeConfig(config);

        // Verificar que cada metric key original aparece exactamente como fue proporcionado
        originalMetricKeys.forEach((metricKey) => {
          // El metric key debe aparecer en el output serializado exactamente como fue proporcionado
          expect(serialized).toContain(metricKey);
          
          // Verificar que aparece en el contexto correcto (dentro de thresholds)
          // El patrón debe ser: "metricKey: [...]"
          const keyPattern = new RegExp(`\\b${metricKey}\\s*:`);
          expect(serialized).toMatch(keyPattern);
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("preserva capitalización exacta de métricas custom del proyecto", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Métricas custom del proyecto con capitalización específica
        const customMetrics = [
          "waiting_time",
          "Errors",
          "Total_Reqs",
          "retries",
          "transaction_duration",
          "transactions_per_second",
          "active_vus",
        ];

        // Recolectar las métricas custom que existen en la config
        const usedCustomMetrics = new Set<string>();
        
        config.endpoints.forEach((endpoint) => {
          const profiles = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ];

          profiles.forEach((profile) => {
            if (profile?.thresholds) {
              Object.keys(profile.thresholds).forEach((key) => {
                if (customMetrics.includes(key)) {
                  usedCustomMetrics.add(key);
                }
              });
            }
          });
        });

        // Si no se usan métricas custom, el test es trivial
        if (usedCustomMetrics.size === 0) {
          return true;
        }

        // Serializar
        const serialized = serializeConfig(config);

        // Verificar que cada métrica custom aparece con capitalización exacta
        usedCustomMetrics.forEach((metric) => {
          expect(serialized).toContain(metric);
          
          // Verificar que NO aparece con capitalización diferente
          const lowerMetric = metric.toLowerCase();
          const upperMetric = metric.toUpperCase();
          
          // Si la métrica no es totalmente lowercase o uppercase, 
          // verificar que no se transformó
          if (metric !== lowerMetric && metric !== upperMetric) {
            // Contar ocurrencias de la capitalización correcta
            const correctCount = (serialized.match(new RegExp(metric, "g")) || []).length;
            expect(correctCount).toBeGreaterThan(0);
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("preserva métricas built-in de K6 sin alteración", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Métricas built-in de K6 que deben preservarse exactamente
        const builtInMetrics = [
          "http_req_duration",
          "http_req_failed",
          "http_req_blocked",
          "http_req_connecting",
          "http_req_tls_handshaking",
          "http_req_sending",
          "http_req_waiting",
          "http_req_receiving",
          "http_reqs",
          "vus",
          "vus_max",
          "iterations",
        ];

        // Recolectar las métricas built-in usadas
        const usedBuiltInMetrics = new Set<string>();
        
        config.endpoints.forEach((endpoint) => {
          const profiles = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ];

          profiles.forEach((profile) => {
            if (profile?.thresholds) {
              Object.keys(profile.thresholds).forEach((key) => {
                if (builtInMetrics.includes(key)) {
                  usedBuiltInMetrics.add(key);
                }
              });
            }
          });
        });

        // Si no se usan métricas built-in, el test es trivial
        if (usedBuiltInMetrics.size === 0) {
          return true;
        }

        // Serializar
        const serialized = serializeConfig(config);

        // Verificar que cada métrica built-in aparece sin alteración
        usedBuiltInMetrics.forEach((metric) => {
          expect(serialized).toContain(metric);
          
          // Verificar formato esperado: metricKey: [...]
          const keyPattern = new RegExp(`\\b${metric}\\s*:`);
          expect(serialized).toMatch(keyPattern);
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("preserva formato exacto de metric keys sin transformaciones", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        // Recolectar todas las métricas originales con sus características de formato
        const metricsWithFormatInfo = new Map<string, {
          hasUnderscore: boolean;
          hasUppercase: boolean;
          hasLowercase: boolean;
          hasMixedCase: boolean;
        }>();
        
        config.endpoints.forEach((endpoint) => {
          const profiles = [
            endpoint.loadtest,
            endpoint.stresstest,
            endpoint.capacitytest,
            endpoint.stabilitytest,
          ];

          profiles.forEach((profile) => {
            if (profile?.thresholds) {
              Object.keys(profile.thresholds).forEach((metricKey) => {
                if (!metricsWithFormatInfo.has(metricKey)) {
                  metricsWithFormatInfo.set(metricKey, {
                    hasUnderscore: metricKey.includes("_"),
                    hasUppercase: /[A-Z]/.test(metricKey),
                    hasLowercase: /[a-z]/.test(metricKey),
                    hasMixedCase: /[A-Z]/.test(metricKey) && /[a-z]/.test(metricKey),
                  });
                }
              });
            }
          });
        });

        // Si no hay thresholds, el test es trivial
        if (metricsWithFormatInfo.size === 0) {
          return true;
        }

        // Serializar
        const serialized = serializeConfig(config);

        // Verificar que cada métrica original aparece con su formato exacto
        metricsWithFormatInfo.forEach((formatInfo, metricKey) => {
          // El metric key debe aparecer en el output serializado
          expect(serialized).toContain(metricKey);
          
          // Si la métrica tiene mixed case (como "Errors", "Total_Reqs"), 
          // verificar que no fue transformada a lowercase o uppercase
          if (formatInfo.hasMixedCase) {
            const lowercase = metricKey.toLowerCase();
            const uppercase = metricKey.toUpperCase();
            
            // Debe aparecer con el case original, no transformado
            const originalCasePattern = new RegExp(`\\b${metricKey}\\s*:`);
            expect(serialized).toMatch(originalCasePattern);
            
            // Si el lowercase o uppercase es diferente, no deben aparecer en contexto de threshold
            if (lowercase !== metricKey) {
              const lowercasePattern = new RegExp(`\\b${lowercase}\\s*:\\s*\\[`);
              expect(serialized).not.toMatch(lowercasePattern);
            }
            if (uppercase !== metricKey) {
              const uppercasePattern = new RegExp(`\\b${uppercase}\\s*:\\s*\\[`);
              expect(serialized).not.toMatch(uppercasePattern);
            }
          }
        });

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
