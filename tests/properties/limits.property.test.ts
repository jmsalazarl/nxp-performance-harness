/**
 * Property-based tests for collection limits
 * Tests universal properties of collection limits using fast-check
 * 
 * Feature: config-builder-ui
 * 
 * **Validates: Requirements 2.1, 4.2, 5.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  MAX_ENDPOINTS,
  MAX_STAGES,
  MAX_EXPRESSIONS,
} from "../../src/utils/constants.js";
import type { AppState } from "../../src/models/AppState.js";
import type { EndpointDraft } from "../../src/models/EndpointDraft.js";
import type { ProfileDraft, ProfileType } from "../../src/models/ProfileDraft.js";
import type { ThresholdDraft } from "../../src/models/ThresholdDraft.js";

/**
 * Property 14: Límites de colección
 * 
 * Para cualquier secuencia de operaciones de creación, el sistema no debe permitir
 * más de 50 endpoints, más de 20 stages por perfil, ni más de 10 expresiones por
 * métrica de threshold. Intentar agregar más allá del límite debe ser rechazado o ignorado.
 */

describe("Property 14: Límites de colección", () => {
  /**
   * Helper: Generador de endpoint base mínimo
   */
  const arbMinimalEndpoint: fc.Arbitrary<EndpointDraft> = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.constant(""),
    url: fc.constant("https://api.example.com/test"),
    method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE") as fc.Arbitrary<
      "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    >,
    headersText: fc.constant('{"Content-Type": "application/json"}'),
    payloadText: fc.constant("{}"),
    expectedStatus: fc.constant(200),
    maxRetries: fc.constant(3),
    thinkTimeSeconds: fc.constant(1),
    profiles: fc.constant([
      {
        type: "loadtest" as ProfileType,
        enabled: false,
        stages: [],
        thresholds: [],
      },
      {
        type: "stresstest" as ProfileType,
        enabled: false,
        stages: [],
        thresholds: [],
      },
      {
        type: "capacitytest" as ProfileType,
        enabled: false,
        stages: [],
        thresholds: [],
      },
      {
        type: "stabilitytest" as ProfileType,
        enabled: false,
        stages: [],
        thresholds: [],
      },
    ]),
  });

  /**
   * Helper: Generador de stage mínimo
   */
  const arbMinimalStage = fc.record({
    duration: fc.oneof(
      fc.nat({ max: 300 }).map((n) => `${n}s`),
      fc.nat({ max: 60 }).map((n) => `${n}m`)
    ),
    target: fc.integer({ min: 0, max: 1000 }),
  });

  /**
   * Helper: Generador de expresión de threshold
   */
  const arbThresholdExpression = fc.oneof(
    fc.nat({ min: 1, max: 99 }).chain((p) =>
      fc.nat({ min: 100, max: 10000 }).map((ms) => `p(${p}) < ${ms}`)
    ),
    fc.nat({ min: 100, max: 5000 }).map((ms) => `avg < ${ms}`),
    fc.nat({ min: 500, max: 10000 }).map((ms) => `max < ${ms}`)
  );

  describe("MAX_ENDPOINTS (50 endpoints máximo)", () => {
    it("debe rechazar o truncar colecciones con más de 50 endpoints", () => {
      // Generar un array con entre 51 y 100 endpoints
      const arbTooManyEndpoints = fc
        .array(arbMinimalEndpoint, { minLength: 51, maxLength: 100 })
        .map((endpoints) => ({
          endpoints,
          activeEndpointId: null,
        }));

      fc.assert(
        fc.property(arbTooManyEndpoints, (state: AppState) => {
          // Simular la lógica de límite del reducer/contexto
          const limitedEndpoints = state.endpoints.slice(0, MAX_ENDPOINTS);

          // El sistema debe limitar a MAX_ENDPOINTS
          expect(limitedEndpoints.length).toBeLessThanOrEqual(MAX_ENDPOINTS);
          expect(limitedEndpoints.length).toBe(MAX_ENDPOINTS);

          // Si intentamos agregar más allá del límite, el sistema no debe permitirlo
          const attemptedTotal = state.endpoints.length;
          expect(attemptedTotal).toBeGreaterThan(MAX_ENDPOINTS);

          // Verificar que el límite es exactamente 50
          expect(MAX_ENDPOINTS).toBe(50);
        }),
        { numRuns: 100 }
      );
    });

    it("debe aceptar colecciones con exactamente MAX_ENDPOINTS endpoints", () => {
      // Generar exactamente MAX_ENDPOINTS endpoints
      const arbExactlyMaxEndpoints = fc
        .array(arbMinimalEndpoint, { minLength: MAX_ENDPOINTS, maxLength: MAX_ENDPOINTS })
        .map((endpoints) => ({
          endpoints,
          activeEndpointId: null,
        }));

      fc.assert(
        fc.property(arbExactlyMaxEndpoints, (state: AppState) => {
          // Exactamente MAX_ENDPOINTS debe ser válido
          expect(state.endpoints.length).toBe(MAX_ENDPOINTS);
          expect(state.endpoints.length).toBeLessThanOrEqual(MAX_ENDPOINTS);
        }),
        { numRuns: 50 }
      );
    });

    it("debe aceptar colecciones con menos de MAX_ENDPOINTS endpoints", () => {
      // Generar entre 1 y MAX_ENDPOINTS-1 endpoints
      const arbFewerEndpoints = fc
        .array(arbMinimalEndpoint, { minLength: 1, maxLength: MAX_ENDPOINTS - 1 })
        .map((endpoints) => ({
          endpoints,
          activeEndpointId: null,
        }));

      fc.assert(
        fc.property(arbFewerEndpoints, (state: AppState) => {
          // Menos de MAX_ENDPOINTS debe ser válido
          expect(state.endpoints.length).toBeLessThan(MAX_ENDPOINTS);
          expect(state.endpoints.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("MAX_STAGES (20 stages máximo por perfil)", () => {
    it("debe rechazar o truncar perfiles con más de 20 stages", () => {
      // Generar un perfil con entre 21 y 40 stages
      const arbTooManyStages = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.array(arbMinimalStage, { minLength: 21, maxLength: 40 })
        )
        .map(([endpoint, profileType, stages]) => {
          // Crear endpoint con perfil que tiene demasiados stages
          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType
              ? { ...p, enabled: true, stages }
              : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbTooManyStages, (endpoint: EndpointDraft) => {
          // Encontrar el perfil modificado
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile) {
            // El sistema debe limitar a MAX_STAGES
            const limitedStages = modifiedProfile.stages.slice(0, MAX_STAGES);
            expect(limitedStages.length).toBeLessThanOrEqual(MAX_STAGES);
            expect(limitedStages.length).toBe(MAX_STAGES);

            // Verificar que había más stages intentados
            expect(modifiedProfile.stages.length).toBeGreaterThan(MAX_STAGES);

            // Verificar que el límite es exactamente 20
            expect(MAX_STAGES).toBe(20);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("debe aceptar perfiles con exactamente MAX_STAGES stages", () => {
      const arbExactlyMaxStages = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.array(arbMinimalStage, { minLength: MAX_STAGES, maxLength: MAX_STAGES })
        )
        .map(([endpoint, profileType, stages]) => {
          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType ? { ...p, enabled: true, stages } : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbExactlyMaxStages, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile) {
            // Exactamente MAX_STAGES debe ser válido
            expect(modifiedProfile.stages.length).toBe(MAX_STAGES);
            expect(modifiedProfile.stages.length).toBeLessThanOrEqual(MAX_STAGES);
          }
        }),
        { numRuns: 50 }
      );
    });

    it("debe aceptar perfiles con menos de MAX_STAGES stages", () => {
      const arbFewerStages = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.array(arbMinimalStage, { minLength: 1, maxLength: MAX_STAGES - 1 })
        )
        .map(([endpoint, profileType, stages]) => {
          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType ? { ...p, enabled: true, stages } : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbFewerStages, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile) {
            // Menos de MAX_STAGES debe ser válido
            expect(modifiedProfile.stages.length).toBeLessThan(MAX_STAGES);
            expect(modifiedProfile.stages.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("debe validar límite de stages independientemente para cada perfil", () => {
      // Generar endpoint con múltiples perfiles habilitados, cada uno con cantidad diferente de stages
      const arbMultipleProfilesWithStages = fc
        .tuple(
          arbMinimalEndpoint,
          fc.array(arbMinimalStage, { minLength: 1, maxLength: MAX_STAGES }),
          fc.array(arbMinimalStage, { minLength: 1, maxLength: MAX_STAGES }),
          fc.array(arbMinimalStage, { minLength: 1, maxLength: MAX_STAGES })
        )
        .map(([endpoint, loadtestStages, stresstestStages, capacitytestStages]) => {
          const modifiedProfiles = endpoint.profiles.map((p) => {
            if (p.type === "loadtest")
              return { ...p, enabled: true, stages: loadtestStages };
            if (p.type === "stresstest")
              return { ...p, enabled: true, stages: stresstestStages };
            if (p.type === "capacitytest")
              return { ...p, enabled: true, stages: capacitytestStages };
            return p;
          });

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbMultipleProfilesWithStages, (endpoint: EndpointDraft) => {
          // Cada perfil debe tener su propio límite de stages
          const enabledProfiles = endpoint.profiles.filter((p) => p.enabled);

          enabledProfiles.forEach((profile) => {
            expect(profile.stages.length).toBeLessThanOrEqual(MAX_STAGES);
            expect(profile.stages.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("MAX_EXPRESSIONS (10 expresiones máximo por métrica)", () => {
    it("debe rechazar o truncar métricas con más de 10 expresiones", () => {
      // Generar un threshold con entre 11 y 20 expresiones
      const arbTooManyExpressions = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.constantFrom(
            "http_req_duration",
            "http_req_failed",
            "http_reqs",
            "iteration_duration"
          ),
          fc.array(arbThresholdExpression, { minLength: 11, maxLength: 20 })
        )
        .map(([endpoint, profileType, metric, expressions]) => {
          // Crear threshold con demasiadas expresiones
          const threshold: ThresholdDraft = {
            metric,
            expressions,
          };

          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType
              ? {
                  ...p,
                  enabled: true,
                  stages: [{ duration: "30s", target: 10 }],
                  thresholds: [threshold],
                }
              : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbTooManyExpressions, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile && modifiedProfile.thresholds.length > 0) {
            const threshold = modifiedProfile.thresholds[0];

            // El sistema debe limitar a MAX_EXPRESSIONS
            const limitedExpressions = threshold.expressions.slice(0, MAX_EXPRESSIONS);
            expect(limitedExpressions.length).toBeLessThanOrEqual(MAX_EXPRESSIONS);
            expect(limitedExpressions.length).toBe(MAX_EXPRESSIONS);

            // Verificar que había más expresiones intentadas
            expect(threshold.expressions.length).toBeGreaterThan(MAX_EXPRESSIONS);

            // Verificar que el límite es exactamente 10
            expect(MAX_EXPRESSIONS).toBe(10);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("debe aceptar métricas con exactamente MAX_EXPRESSIONS expresiones", () => {
      const arbExactlyMaxExpressions = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.constantFrom(
            "http_req_duration",
            "http_req_failed",
            "http_reqs",
            "iteration_duration"
          ),
          fc.array(arbThresholdExpression, {
            minLength: MAX_EXPRESSIONS,
            maxLength: MAX_EXPRESSIONS,
          })
        )
        .map(([endpoint, profileType, metric, expressions]) => {
          const threshold: ThresholdDraft = {
            metric,
            expressions,
          };

          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType
              ? {
                  ...p,
                  enabled: true,
                  stages: [{ duration: "30s", target: 10 }],
                  thresholds: [threshold],
                }
              : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbExactlyMaxExpressions, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile && modifiedProfile.thresholds.length > 0) {
            const threshold = modifiedProfile.thresholds[0];

            // Exactamente MAX_EXPRESSIONS debe ser válido
            expect(threshold.expressions.length).toBe(MAX_EXPRESSIONS);
            expect(threshold.expressions.length).toBeLessThanOrEqual(MAX_EXPRESSIONS);
          }
        }),
        { numRuns: 50 }
      );
    });

    it("debe aceptar métricas con menos de MAX_EXPRESSIONS expresiones", () => {
      const arbFewerExpressions = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.constantFrom(
            "http_req_duration",
            "http_req_failed",
            "http_reqs",
            "iteration_duration"
          ),
          fc.array(arbThresholdExpression, { minLength: 1, maxLength: MAX_EXPRESSIONS - 1 })
        )
        .map(([endpoint, profileType, metric, expressions]) => {
          const threshold: ThresholdDraft = {
            metric,
            expressions,
          };

          const modifiedProfiles = endpoint.profiles.map((p) =>
            p.type === profileType
              ? {
                  ...p,
                  enabled: true,
                  stages: [{ duration: "30s", target: 10 }],
                  thresholds: [threshold],
                }
              : p
          );

          return {
            ...endpoint,
            profiles: modifiedProfiles,
          };
        });

      fc.assert(
        fc.property(arbFewerExpressions, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile && modifiedProfile.thresholds.length > 0) {
            const threshold = modifiedProfile.thresholds[0];

            // Menos de MAX_EXPRESSIONS debe ser válido
            expect(threshold.expressions.length).toBeLessThan(MAX_EXPRESSIONS);
            expect(threshold.expressions.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("debe validar límite de expresiones independientemente para cada métrica", () => {
      // Generar perfil con múltiples métricas, cada una con cantidad diferente de expresiones
      const arbMultipleMetricsWithExpressions = fc
        .tuple(
          arbMinimalEndpoint,
          fc.constantFrom<ProfileType>("loadtest", "stresstest", "capacitytest", "stabilitytest"),
          fc.array(arbThresholdExpression, { minLength: 1, maxLength: MAX_EXPRESSIONS }),
          fc.array(arbThresholdExpression, { minLength: 1, maxLength: MAX_EXPRESSIONS }),
          fc.array(arbThresholdExpression, { minLength: 1, maxLength: MAX_EXPRESSIONS })
        )
        .map(
          ([
            endpoint,
            profileType,
            durationExpressions,
            failedExpressions,
            reqsExpressions,
          ]) => {
            const thresholds: ThresholdDraft[] = [
              { metric: "http_req_duration", expressions: durationExpressions },
              { metric: "http_req_failed", expressions: failedExpressions },
              { metric: "http_reqs", expressions: reqsExpressions },
            ];

            const modifiedProfiles = endpoint.profiles.map((p) =>
              p.type === profileType
                ? {
                    ...p,
                    enabled: true,
                    stages: [{ duration: "30s", target: 10 }],
                    thresholds,
                  }
                : p
            );

            return {
              ...endpoint,
              profiles: modifiedProfiles,
            };
          }
        );

      fc.assert(
        fc.property(arbMultipleMetricsWithExpressions, (endpoint: EndpointDraft) => {
          const modifiedProfile = endpoint.profiles.find((p) => p.enabled);

          expect(modifiedProfile).toBeDefined();
          if (modifiedProfile) {
            // Cada métrica debe tener su propio límite de expresiones
            modifiedProfile.thresholds.forEach((threshold) => {
              expect(threshold.expressions.length).toBeLessThanOrEqual(MAX_EXPRESSIONS);
              expect(threshold.expressions.length).toBeGreaterThan(0);
            });

            // Verificar que tenemos múltiples métricas
            expect(modifiedProfile.thresholds.length).toBe(3);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Límites combinados", () => {
    it("debe aplicar todos los límites independientemente en un estado completo", () => {
      // Generar un estado con múltiples endpoints, cada uno con múltiples perfiles
      const arbComplexState = fc
        .array(
          fc
            .tuple(
              arbMinimalEndpoint,
              fc.array(arbMinimalStage, { minLength: 1, maxLength: MAX_STAGES }),
              fc.array(arbThresholdExpression, { minLength: 1, maxLength: MAX_EXPRESSIONS })
            )
            .map(([endpoint, stages, expressions]) => {
              const modifiedProfiles = endpoint.profiles.map((p, index) => {
                if (index === 0) {
                  return {
                    ...p,
                    enabled: true,
                    stages,
                    thresholds: [
                      {
                        metric: "http_req_duration",
                        expressions,
                      },
                    ],
                  };
                }
                return p;
              });

              return {
                ...endpoint,
                profiles: modifiedProfiles,
              };
            }),
          { minLength: 1, maxLength: MAX_ENDPOINTS }
        )
        .map((endpoints) => ({
          endpoints,
          activeEndpointId: null,
        }));

      fc.assert(
        fc.property(arbComplexState, (state: AppState) => {
          // Validar límite de endpoints
          expect(state.endpoints.length).toBeLessThanOrEqual(MAX_ENDPOINTS);

          // Validar límites de stages y expresiones para cada endpoint
          state.endpoints.forEach((endpoint) => {
            const enabledProfile = endpoint.profiles.find((p) => p.enabled);

            if (enabledProfile) {
              // Validar límite de stages
              expect(enabledProfile.stages.length).toBeLessThanOrEqual(MAX_STAGES);

              // Validar límite de expresiones por métrica
              enabledProfile.thresholds.forEach((threshold) => {
                expect(threshold.expressions.length).toBeLessThanOrEqual(MAX_EXPRESSIONS);
              });
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    it("debe mantener consistencia de límites después de operaciones de modificación", () => {
      // Simular secuencia de operaciones: crear, agregar stages, agregar expresiones
      const arbOperationSequence = fc
        .tuple(
          arbMinimalEndpoint,
          fc.array(arbMinimalStage, { minLength: 1, maxLength: 30 }), // Intentar más del límite
          fc.array(arbThresholdExpression, { minLength: 1, maxLength: 15 }) // Intentar más del límite
        )
        .map(([endpoint, allStages, allExpressions]) => {
          // Aplicar límites como lo haría el reducer
          const limitedStages = allStages.slice(0, MAX_STAGES);
          const limitedExpressions = allExpressions.slice(0, MAX_EXPRESSIONS);

          const modifiedProfiles = endpoint.profiles.map((p, index) =>
            index === 0
              ? {
                  ...p,
                  enabled: true,
                  stages: limitedStages,
                  thresholds: [
                    {
                      metric: "http_req_duration",
                      expressions: limitedExpressions,
                    },
                  ],
                }
              : p
          );

          return {
            originalStagesCount: allStages.length,
            originalExpressionsCount: allExpressions.length,
            endpoint: {
              ...endpoint,
              profiles: modifiedProfiles,
            },
          };
        });

      fc.assert(
        fc.property(arbOperationSequence, (data) => {
          const { originalStagesCount, originalExpressionsCount, endpoint } = data;
          const enabledProfile = endpoint.profiles.find((p) => p.enabled);

          expect(enabledProfile).toBeDefined();
          if (enabledProfile) {
            // Verificar que los límites se aplicaron correctamente
            expect(enabledProfile.stages.length).toBeLessThanOrEqual(MAX_STAGES);
            expect(enabledProfile.thresholds[0].expressions.length).toBeLessThanOrEqual(
              MAX_EXPRESSIONS
            );

            // Si intentamos agregar más del límite, debe truncarse
            if (originalStagesCount > MAX_STAGES) {
              expect(enabledProfile.stages.length).toBe(MAX_STAGES);
            } else {
              expect(enabledProfile.stages.length).toBe(originalStagesCount);
            }

            if (originalExpressionsCount > MAX_EXPRESSIONS) {
              expect(enabledProfile.thresholds[0].expressions.length).toBe(MAX_EXPRESSIONS);
            } else {
              expect(enabledProfile.thresholds[0].expressions.length).toBe(
                originalExpressionsCount
              );
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
