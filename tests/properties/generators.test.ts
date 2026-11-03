import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  arbConfig,
  arbEndpoint,
  arbTestProfile,
  arbStage,
  arbThresholds,
  arbInvalidConfig
} from "./generators.js";

/**
 * Tests de verificación de generadores
 *
 * Estos tests verifican que los generadores fast-check producen
 * valores con la forma esperada.
 */
describe("Generadores fast-check para k6-config-contract", () => {
  it("arbConfig genera configuraciones con endpoints array", () => {
    fc.assert(
      fc.property(arbConfig, (config) => {
        expect(config).toHaveProperty("endpoints");
        expect(Array.isArray(config.endpoints)).toBe(true);
        expect(config.endpoints.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 }
    );
  });

  it("arbEndpoint genera endpoints con campos requeridos", () => {
    fc.assert(
      fc.property(arbEndpoint, (endpoint) => {
        expect(endpoint).toHaveProperty("url");
        expect(endpoint).toHaveProperty("method");
        expect(endpoint).toHaveProperty("expectedStatus");
        expect(endpoint).toHaveProperty("maxRetries");
        expect(endpoint).toHaveProperty("thinkTimeSeconds");
        
        // Verificar tipos básicos
        expect(typeof endpoint.url).toBe("string");
        expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(endpoint.method);
        expect(typeof endpoint.expectedStatus).toBe("number");
        expect(endpoint.expectedStatus).toBeGreaterThanOrEqual(100);
        expect(endpoint.expectedStatus).toBeLessThanOrEqual(599);
      }),
      { numRuns: 10 }
    );
  });

  it("arbTestProfile genera perfiles con stages no vacíos", () => {
    fc.assert(
      fc.property(arbTestProfile, (profile) => {
        expect(profile).toHaveProperty("stages");
        expect(Array.isArray(profile.stages)).toBe(true);
        expect(profile.stages.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 }
    );
  });

  it("arbStage genera stages válidos", () => {
    fc.assert(
      fc.property(arbStage, (stage) => {
        expect(stage).toHaveProperty("duration");
        expect(stage).toHaveProperty("target");
        expect(typeof stage.duration).toBe("string");
        expect(stage.duration.length).toBeGreaterThan(0);
        expect(typeof stage.target).toBe("number");
        expect(stage.target).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 10 }
    );
  });

  it("arbThresholds genera objetos de thresholds", () => {
    fc.assert(
      fc.property(arbThresholds, (thresholds) => {
        expect(typeof thresholds).toBe("object");
        const keys = Object.keys(thresholds);
        expect(keys.length).toBeGreaterThan(0);
        
        // Verificar que cada valor es un array no vacío de strings
        for (const key of keys) {
          expect(Array.isArray(thresholds[key])).toBe(true);
          expect(thresholds[key].length).toBeGreaterThan(0);
          for (const expr of thresholds[key]) {
            expect(typeof expr).toBe("string");
            expect(expr.length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 10 }
    );
  });

  it("arbInvalidConfig genera configuraciones con al menos una violación", () => {
    fc.assert(
      fc.property(arbInvalidConfig, (config) => {
        expect(config).toHaveProperty("endpoints");
        expect(Array.isArray(config.endpoints)).toBe(true);
        
        // Este test solo verifica que se genera algo con la forma correcta
        // La validación de que realmente es inválido se hará en los tests de propiedades
        expect(config.endpoints.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 }
    );
  });
});
