/**
 * Integration tests for serializeConfig
 * 
 * Validates that the serialized output can be evaluated as JavaScript
 * and produces structurally equivalent objects.
 */

import { describe, it, expect } from "vitest";
import { serializeConfig } from "../../src/services/serializeConfig.js";
import type { Config } from "../../src/models/config.types.js";

/**
 * Helper function to evaluate serialized config as JavaScript
 */
function evaluateSerializedConfig(serialized: string): any {
  // Eliminar "export default" y punto y coma final para evaluar como expresión
  const code = serialized.replace(/^export default /, "").replace(/;\s*$/, "");
  // eslint-disable-next-line no-eval
  return eval(`(${code})`);
}

describe("serializeConfig integration", () => {
  it("produce JavaScript sintácticamente válido que puede ser evaluado", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Test Endpoint",
          url: "https://example.com/api/test",
          method: "POST",
          payload: { key: "value" },
          headers: { "Content-Type": "application/json" },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "2m", target: 10 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 2000"],
              waiting_time: ["avg < 1600"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(config);

    // Intentar evaluar el código JavaScript generado
    expect(() => {
      const evaluated = evaluateSerializedConfig(serialized);
      expect(evaluated).toBeDefined();
      expect(evaluated.endpoints).toBeDefined();
      expect(Array.isArray(evaluated.endpoints)).toBe(true);
    }).not.toThrow();
  });

  it("el objeto evaluado es estructuralmente equivalente al original", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/resource",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const serialized = serializeConfig(config);
    const evaluated = evaluateSerializedConfig(serialized);

    // Verificar estructura
    expect(evaluated.endpoints).toHaveLength(1);
    expect(evaluated.endpoints[0].url).toBe("https://example.com/api/resource");
    expect(evaluated.endpoints[0].method).toBe("GET");
    expect(evaluated.endpoints[0].expectedStatus).toBe(200);
    expect(evaluated.endpoints[0].maxRetries).toBe(3);
    expect(evaluated.endpoints[0].thinkTimeSeconds).toBe(1);
  });

  it("preserva tipos de datos correctamente en el round-trip", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Test",
          url: "https://example.com/api/test",
          method: "POST",
          payload: {
            string: "test",
            number: 42,
            boolean: true,
            null_value: null,
            nested: { key: "value" },
            array: [1, 2, 3],
          },
          expectedStatus: 201,
          maxRetries: 5,
          thinkTimeSeconds: 2,
        },
      ],
    };

    const serialized = serializeConfig(config);
    const evaluated = evaluateSerializedConfig(serialized);

    const payload = evaluated.endpoints[0].payload;
    expect(typeof payload.string).toBe("string");
    expect(typeof payload.number).toBe("number");
    expect(typeof payload.boolean).toBe("boolean");
    expect(payload.null_value).toBeNull();
    expect(typeof payload.nested).toBe("object");
    expect(Array.isArray(payload.array)).toBe(true);
  });

  it("preserva estructura compleja de perfiles con stages y thresholds", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "2m", target: 20 },
              { duration: "30s", target: 0 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 2000", "p(99) < 3000"],
              http_req_failed: ["rate < 0.01"],
              waiting_time: ["avg < 1600"],
              Errors: ["count < 5"],
            },
          },
          stresstest: {
            stages: [
              { duration: "1m", target: 50 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 5000"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(config);
    const evaluated = evaluateSerializedConfig(serialized);

    const endpoint = evaluated.endpoints[0];

    // Verificar loadtest
    expect(endpoint.loadtest).toBeDefined();
    expect(endpoint.loadtest.stages).toHaveLength(3);
    expect(endpoint.loadtest.stages[0].duration).toBe("30s");
    expect(endpoint.loadtest.stages[0].target).toBe(10);
    expect(endpoint.loadtest.thresholds.http_req_duration).toHaveLength(2);
    expect(endpoint.loadtest.thresholds.waiting_time[0]).toBe("avg < 1600");

    // Verificar stresstest
    expect(endpoint.stresstest).toBeDefined();
    expect(endpoint.stresstest.stages).toHaveLength(1);
    expect(endpoint.stresstest.stages[0].target).toBe(50);

    // Verificar que capacitytest y stabilitytest no están presentes
    expect(endpoint.capacitytest).toBeUndefined();
    expect(endpoint.stabilitytest).toBeUndefined();
  });

  it("preserva exactamente los nombres de métricas custom", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "1m", target: 10 }],
            thresholds: {
              // Métricas built-in de K6
              http_req_duration: ["p(95) < 2000"],
              http_req_failed: ["rate < 0.01"],
              // Métricas custom del proyecto (debe preservar capitalización exacta)
              waiting_time: ["avg < 1600"],
              Errors: ["count < 5"],
              Total_Reqs: ["count > 100"],
              retries: ["count < 10"],
              transaction_duration: ["p(95) < 3000"],
              transactions_per_second: ["avg >= 2"],
              active_vus: ["avg > 5"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(config);
    const evaluated = evaluateSerializedConfig(serialized);

    const thresholds = evaluated.endpoints[0].loadtest.thresholds;

    // Verificar que las métricas existen con los nombres exactos (case-sensitive)
    expect(thresholds).toHaveProperty("waiting_time");
    expect(thresholds).toHaveProperty("Errors");
    expect(thresholds).toHaveProperty("Total_Reqs");
    expect(thresholds).toHaveProperty("retries");
    expect(thresholds).toHaveProperty("transaction_duration");
    expect(thresholds).toHaveProperty("transactions_per_second");
    expect(thresholds).toHaveProperty("active_vus");

    // Verificar que los valores son correctos
    expect(thresholds.waiting_time).toEqual(["avg < 1600"]);
    expect(thresholds.Errors).toEqual(["count < 5"]);
    expect(thresholds.Total_Reqs).toEqual(["count > 100"]);
  });

  it("maneja múltiples endpoints con diferentes configuraciones", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Endpoint 1",
          url: "https://example.com/api/endpoint1",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "1m", target: 10 }],
          },
        },
        {
          name: "Endpoint 2",
          url: "https://example.com/api/endpoint2",
          method: "POST",
          payload: { data: "test" },
          expectedStatus: 201,
          maxRetries: 5,
          thinkTimeSeconds: 2,
          stresstest: {
            stages: [{ duration: "30s", target: 50 }],
          },
        },
        {
          url: "https://example.com/api/endpoint3",
          method: "DELETE",
          expectedStatus: 204,
          maxRetries: 2,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const serialized = serializeConfig(config);
    const evaluated = evaluateSerializedConfig(serialized);

    expect(evaluated.endpoints).toHaveLength(3);

    // Verificar endpoint 1
    expect(evaluated.endpoints[0].name).toBe("Endpoint 1");
    expect(evaluated.endpoints[0].loadtest).toBeDefined();
    expect(evaluated.endpoints[0].stresstest).toBeUndefined();

    // Verificar endpoint 2
    expect(evaluated.endpoints[1].name).toBe("Endpoint 2");
    expect(evaluated.endpoints[1].payload).toEqual({ data: "test" });
    expect(evaluated.endpoints[1].stresstest).toBeDefined();
    expect(evaluated.endpoints[1].loadtest).toBeUndefined();

    // Verificar endpoint 3
    expect(evaluated.endpoints[2].name).toBeUndefined();
    expect(evaluated.endpoints[2].method).toBe("DELETE");
    expect(evaluated.endpoints[2].loadtest).toBeUndefined();
    expect(evaluated.endpoints[2].stresstest).toBeUndefined();
  });
});
