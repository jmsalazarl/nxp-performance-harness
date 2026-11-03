/**
 * Tests unitarios para parseAndValidate service
 */

import { describe, it, expect } from "vitest";
import { parseAndValidate } from "../../src/services/parseAndValidate";

describe("parseAndValidate", () => {
  describe("JSON válido con metrics", () => {
    it("debe parsear y validar correctamente un K6 summary válido", () => {
      const validJson = JSON.stringify({
        metrics: {
          http_reqs: { values: { count: 100 } }
        }
      });

      const result = parseAndValidate(validJson);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.metrics).toBeDefined();
        expect(typeof result.data.metrics).toBe("object");
      }
    });

    it("debe aceptar JSON con metrics vacío", () => {
      const validJson = JSON.stringify({
        metrics: {}
      });

      const result = parseAndValidate(validJson);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.metrics).toEqual({});
      }
    });

    it("debe preservar propiedades adicionales del summary", () => {
      const validJson = JSON.stringify({
        metrics: { test: "data" },
        state: { isFinished: true },
        root_group: { name: "test" }
      });

      const result = parseAndValidate(validJson);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.metrics).toBeDefined();
        expect(result.data.state).toBeDefined();
        expect(result.data.root_group).toBeDefined();
      }
    });
  });

  describe("JSON inválido", () => {
    it("debe rechazar texto que no es JSON", () => {
      const invalidJson = "esto no es json";

      const result = parseAndValidate(invalidJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
        expect(result.error.message).toContain("Invalid JSON");
      }
    });

    it("debe rechazar JSON mal formado", () => {
      const invalidJson = '{ "metrics": { invalid }';

      const result = parseAndValidate(invalidJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
      }
    });

    it("debe rechazar string vacío", () => {
      const result = parseAndValidate("");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
      }
    });

    it("debe rechazar JSON que es un array", () => {
      const invalidJson = JSON.stringify([1, 2, 3]);

      const result = parseAndValidate(invalidJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
        expect(result.error.message).toContain("must be an object");
      }
    });

    it("debe rechazar JSON que es null", () => {
      const invalidJson = "null";

      const result = parseAndValidate(invalidJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
      }
    });

    it("debe rechazar JSON que es un primitivo", () => {
      const invalidJson = "123";

      const result = parseAndValidate(invalidJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("INVALID_JSON");
      }
    });
  });

  describe("JSON sin metrics", () => {
    it("debe rechazar objeto sin propiedad metrics", () => {
      const jsonWithoutMetrics = JSON.stringify({
        data: "some data",
        state: { isFinished: true }
      });

      const result = parseAndValidate(jsonWithoutMetrics);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("MISSING_METRICS");
        expect(result.error.message).toContain("metrics");
      }
    });

    it("debe rechazar objeto vacío", () => {
      const emptyJson = JSON.stringify({});

      const result = parseAndValidate(emptyJson);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("MISSING_METRICS");
      }
    });

    it("debe rechazar cuando metrics es null", () => {
      const jsonWithNullMetrics = JSON.stringify({
        metrics: null
      });

      const result = parseAndValidate(jsonWithNullMetrics);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("MISSING_METRICS");
        expect(result.error.message).toContain("must be an object");
      }
    });

    it("debe rechazar cuando metrics es un array", () => {
      const jsonWithArrayMetrics = JSON.stringify({
        metrics: []
      });

      const result = parseAndValidate(jsonWithArrayMetrics);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("MISSING_METRICS");
        expect(result.error.message).toContain("must be an object");
      }
    });

    it("debe rechazar cuando metrics es un string", () => {
      const jsonWithStringMetrics = JSON.stringify({
        metrics: "not an object"
      });

      const result = parseAndValidate(jsonWithStringMetrics);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("MISSING_METRICS");
      }
    });
  });

  describe("Edge cases", () => {
    it("debe manejar JSON con caracteres especiales", () => {
      const jsonWithSpecialChars = JSON.stringify({
        metrics: {
          "http_req_duration{expected_response:true}": { values: { avg: 123 } }
        }
      });

      const result = parseAndValidate(jsonWithSpecialChars);

      expect(result.ok).toBe(true);
    });

    it("debe manejar JSON con valores numéricos grandes", () => {
      const jsonWithLargeNumbers = JSON.stringify({
        metrics: {
          http_reqs: { values: { count: 9007199254740991 } } // Number.MAX_SAFE_INTEGER
        }
      });

      const result = parseAndValidate(jsonWithLargeNumbers);

      expect(result.ok).toBe(true);
    });

    it("debe manejar JSON con estructuras anidadas profundas", () => {
      const deepJson = JSON.stringify({
        metrics: {
          nested: {
            level1: {
              level2: {
                level3: { value: 42 }
              }
            }
          }
        }
      });

      const result = parseAndValidate(deepJson);

      expect(result.ok).toBe(true);
    });
  });
});
