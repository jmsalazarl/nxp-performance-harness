/**
 * Realistic integration test for serializeConfig
 * 
 * Tests serialization with a config based on the existing config.js file
 * from the project to ensure compatibility with real-world usage.
 */

import { describe, it, expect } from "vitest";
import { serializeConfig } from "../../src/services/serializeConfig.js";
import type { Config } from "../../src/models/config.types.js";

/**
 * Helper function to evaluate serialized config as JavaScript
 */
function evaluateSerializedConfig(serialized: string): any {
  const code = serialized.replace(/^export default /, "").replace(/;\s*$/, "");
  // eslint-disable-next-line no-eval
  return eval(`(${code})`);
}

describe("serializeConfig with realistic config", () => {
     it("serializa correctamente una configuracion completa de referencia", () => {
     // Configuracion generica con varios perfiles
    const config: Config = {
      endpoints: [
        {
          name: "Create resource",
          description: "Creates a generic resource",
          url: "https://api.example.com/v1/resources",
          method: "POST",
          payload: {
            name: "Sample resource",
            value: "example",
          },
          headers: {
            "Content-Type": "application/json",
            "X-Test-Client": "example",
          },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "2m", target: 10 },
              { duration: "30s", target: 0 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 2000"],
              http_req_failed: ["rate < 0.01"],
              waiting_time: ["avg < 1600"],
              Errors: ["count < 5"],
              iterations: ["count > 500"],
              http_req_waiting: ["p(95) < 700"],
              http_req_blocked: ["p(95) < 300"],
              active_vus: ["avg > 5"],
              http_req_connecting: ["p(95) < 200"],
              transactions_per_second: ["avg >= 2"],
            },
          },
          stresstest: {
            stages: [
              { duration: "30s", target: 50 },
              { duration: "1m", target: 10 },
              { duration: "1m", target: 15 },
              { duration: "30s", target: 0 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 5000"],
              waiting_time: ["avg < 3500"],
              Errors: ["count < 20"],
              http_req_failed: ["rate < 0.01"],
              http_req_connecting: ["p(95) < 1000"],
              http_req_blocked: ["p(95) < 500"],
              iterations: ["count > 1000"],
              vus_max: ["value >= 0"],
              http_req_waiting: ["p(99) < 10000"],
              retries: ["count < 10"],
            },
          },
          capacitytest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "1m", target: 20 },
              { duration: "1m", target: 15 },
              { duration: "30s", target: 0 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 3000"],
              waiting_time: ["avg < 1200"],
              Errors: ["count < 2"],
              http_req_failed: ["rate < 0.05"],
            },
          },
          stabilitytest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "2m", target: 10 },
              { duration: "30s", target: 0 },
            ],
            thresholds: {
              http_req_duration: ["avg < 2000", "p(95) < 2500"],
              waiting_time: ["avg < 1500"],
              Errors: ["count < 2"],
              http_req_failed: ["rate < 0.01"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(config);

    // Verificar que es un módulo ES válido
    expect(serialized).toContain("export default");
    expect(serialized).toMatch(/export default \{[\s\S]*\};/);

    // Evaluar el código para verificar que es JavaScript válido
    const evaluated = evaluateSerializedConfig(serialized);

    // Verificar estructura general
    expect(evaluated.endpoints).toHaveLength(1);
    const endpoint = evaluated.endpoints[0];

    // Verificar metadata
    expect(endpoint.name).toBe("Create resource");
    expect(endpoint.description).toBe("Creates a generic resource");

    // Verificar campos HTTP
    expect(endpoint.url).toBe("https://api.example.com/v1/resources");
    expect(endpoint.method).toBe("POST");
    expect(endpoint.expectedStatus).toBe(200);
    expect(endpoint.maxRetries).toBe(3);
    expect(endpoint.thinkTimeSeconds).toBe(1);

    // Verificar payload
    expect(endpoint.payload).toBeDefined();
    expect(endpoint.payload.name).toBe("Sample resource");
    expect(endpoint.payload.value).toBe("example");

    // Verificar headers
    expect(endpoint.headers).toBeDefined();
    expect(endpoint.headers["Content-Type"]).toBe("application/json");
    expect(endpoint.headers["X-Test-Client"]).toBe("example");

    // Verificar que los 4 perfiles están presentes
    expect(endpoint.loadtest).toBeDefined();
    expect(endpoint.stresstest).toBeDefined();
    expect(endpoint.capacitytest).toBeDefined();
    expect(endpoint.stabilitytest).toBeDefined();

    // Verificar loadtest
    expect(endpoint.loadtest.stages).toHaveLength(3);
    expect(endpoint.loadtest.stages[0]).toEqual({ duration: "30s", target: 10 });
    expect(endpoint.loadtest.thresholds).toBeDefined();
    expect(endpoint.loadtest.thresholds.waiting_time).toEqual(["avg < 1600"]);
    expect(endpoint.loadtest.thresholds.Errors).toEqual(["count < 5"]);

    // Verificar stresstest
    expect(endpoint.stresstest.stages).toHaveLength(4);
    expect(endpoint.stresstest.thresholds.retries).toEqual(["count < 10"]);
    expect(endpoint.stresstest.thresholds.vus_max).toEqual(["value >= 0"]);

    // Verificar capacitytest
    expect(endpoint.capacitytest.stages).toHaveLength(4);
    expect(endpoint.capacitytest.thresholds["http_req_failed"]).toEqual(["rate < 0.05"]);

    // Verificar stabilitytest
    expect(endpoint.stabilitytest.stages).toHaveLength(3);
    expect(endpoint.stabilitytest.thresholds.http_req_duration).toHaveLength(2);
    expect(endpoint.stabilitytest.thresholds.http_req_duration).toContain("avg < 2000");
    expect(endpoint.stabilitytest.thresholds.http_req_duration).toContain("p(95) < 2500");
  });

  it("el output es legible y está bien formateado", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Test Endpoint",
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "1m", target: 10 }],
            thresholds: {
              http_req_duration: ["p(95) < 2000"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(config);

    // Verificar formato general
    expect(serialized.split("\n").length).toBeGreaterThan(5); // Múltiples líneas
    expect(serialized).toContain("  endpoints:"); // Indentación de 2 espacios
    expect(serialized).toContain("    {"); // Indentación de 4 espacios para endpoint
    expect(serialized).toContain("      "); // Indentación de 6 espacios para campos

    // No debería tener líneas excesivamente largas (más de 120 caracteres es aceptable)
    const lines = serialized.split("\n");
    const longLines = lines.filter(line => line.length > 200);
    // Algunas líneas pueden ser largas (como payloads grandes), pero no todas
    expect(longLines.length).toBeLessThan(lines.length * 0.5);
  });

  it("produce output determinista con config complejo", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Complex Endpoint",
          url: "https://example.com/api/complex",
          method: "POST",
          payload: {
            nested: {
              deeply: {
                nested: {
                  value: "test",
                },
              },
            },
            array: [1, 2, 3, 4, 5],
          },
          headers: {
            "X-Custom-Header": "value",
          },
          expectedStatus: 201,
          maxRetries: 5,
          thinkTimeSeconds: 2,
          loadtest: {
            stages: [
              { duration: "30s", target: 10 },
              { duration: "1m", target: 20 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 2000", "p(99) < 3000"],
              http_req_failed: ["rate < 0.01"],
            },
          },
        },
      ],
    };

    // Serializar múltiples veces
    const result1 = serializeConfig(config);
    const result2 = serializeConfig(config);
    const result3 = serializeConfig(config);

    // Todos los resultados deben ser idénticos
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});
