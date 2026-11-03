/**
 * Unit tests for serializeConfig service
 * 
 * Tests specific examples and edge cases for configuration serialization.
 * Validates that the output is valid JavaScript ES module text.
 */

import { describe, it, expect } from "vitest";
import { serializeConfig } from "../../src/services/serializeConfig.js";
import type { Config } from "../../src/models/config.types.js";

describe("serializeConfig", () => {
  it("genera un módulo ES válido con export default", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("export default");
    expect(result).toContain("endpoints:");
    expect(result).toMatch(/export default \{[\s\S]*endpoints: \[[\s\S]*\][\s\S]*\};/);
  });

  it("preserva todos los campos requeridos del endpoint", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/resource",
          method: "POST",
          expectedStatus: 201,
          maxRetries: 5,
          thinkTimeSeconds: 2,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain('url: "https://example.com/api/resource"');
    expect(result).toContain('method: "POST"');
    expect(result).toContain("expectedStatus: 201");
    expect(result).toContain("maxRetries: 5");
    expect(result).toContain("thinkTimeSeconds: 2");
  });

  it("preserva metadata opcional (name, description) cuando está presente", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Test Endpoint",
          description: "This is a test endpoint for validation",
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain('name: "Test Endpoint"');
    expect(result).toContain('description: "This is a test endpoint for validation"');
  });

  it("omite metadata opcional cuando no está presente", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).not.toContain("name:");
    expect(result).not.toContain("description:");
  });

  it("serializa payload como objeto JSON", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/user",
          method: "POST",
          payload: {
            username: "testuser",
            email: "test@example.com",
            age: 25,
          },
          expectedStatus: 201,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("payload:");
    expect(result).toContain("username:");
    expect(result).toContain('"testuser"');
    expect(result).toContain("email:");
    expect(result).toContain('"test@example.com"');
    expect(result).toContain("age: 25");
  });

  it("serializa headers como objeto", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer <token>",
          },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("headers:");
    // Content-Type necesita comillas porque tiene guión
    expect(result).toContain('"Content-Type"');
    expect(result).toContain('"application/json"');
    // Authorization podría o no tener comillas dependiendo de la serialización
    expect(result).toMatch(/(Authorization|"Authorization"):/);
    expect(result).toContain('"Bearer <token>"');
  });

  it("serializa perfil loadtest cuando está presente", () => {
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
              { duration: "2m", target: 10 },
            ],
            thresholds: {
              http_req_duration: ["p(95) < 2000"],
              http_req_failed: ["rate < 0.01"],
            },
          },
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("loadtest:");
    expect(result).toContain("stages:");
    expect(result).toContain('duration: "30s"');
    expect(result).toContain("target: 10");
    expect(result).toContain("thresholds:");
    expect(result).toContain("http_req_duration:");
    expect(result).toContain('"p(95) < 2000"');
  });

  it("omite perfiles cuando no están presentes", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).not.toContain("loadtest:");
    expect(result).not.toContain("stresstest:");
    expect(result).not.toContain("capacitytest:");
    expect(result).not.toContain("stabilitytest:");
  });

  it("serializa solo los perfiles presentes (selectivo)", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "1m", target: 5 }],
          },
          stresstest: {
            stages: [{ duration: "30s", target: 50 }],
          },
          // capacitytest y stabilitytest no están presentes
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("loadtest:");
    expect(result).toContain("stresstest:");
    expect(result).not.toContain("capacitytest:");
    expect(result).not.toContain("stabilitytest:");
  });

  it("preserva métricas custom exactamente (waiting_time, Errors, etc.)", () => {
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

    const result = serializeConfig(config);

    // Verificar que las métricas custom se preservan exactamente
    expect(result).toContain("waiting_time:");
    expect(result).toContain("Errors:");
    expect(result).toContain("Total_Reqs:");
    expect(result).toContain("retries:");
    expect(result).toContain("transaction_duration:");
    expect(result).toContain("transactions_per_second:");
    expect(result).toContain("active_vus:");
  });

  it("produce output determinista (mismo input → mismo output)", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "POST",
          payload: { key: "value" },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "30s", target: 10 }],
          },
        },
      ],
    };

    const result1 = serializeConfig(config);
    const result2 = serializeConfig(config);

    expect(result1).toBe(result2);
  });

  it("usa indentación de 2 espacios para legibilidad", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    // Verificar que usa indentación correcta (2 espacios para el nivel root)
    expect(result).toContain("export default {\n  endpoints:");
    // Verificar 4 espacios para el nivel de endpoint
    expect(result).toMatch(/\n    \{/);
  });

  it("serializa múltiples endpoints separados por comas", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/endpoint1",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
        {
          url: "https://example.com/api/endpoint2",
          method: "POST",
          expectedStatus: 201,
          maxRetries: 5,
          thinkTimeSeconds: 2,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("endpoint1");
    expect(result).toContain("endpoint2");
    // Verificar que los endpoints están separados correctamente
    const endpointMatches = result.match(/\{[\s\S]*?\}/g);
    expect(endpointMatches).toBeTruthy();
    expect(endpointMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("serializa objeto payload vacío correctamente", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "POST",
          payload: {},
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    expect(result).toContain("payload: {}");
  });

  it("serializa thresholds sin expresiones como objeto vacío", () => {
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
            thresholds: {},
          },
        },
      ],
    };

    const result = serializeConfig(config);

    // Si thresholds está presente pero vacío, no debería serializarse
    // (según la lógica de serializeTestProfile que verifica Object.keys().length > 0)
    expect(result).not.toContain("thresholds:");
  });

  it("escapa caracteres especiales en strings correctamente", () => {
    const config: Config = {
      endpoints: [
        {
          name: 'Test "quoted" name',
          description: "Line 1\nLine 2",
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = serializeConfig(config);

    // JSON.stringify maneja el escape automáticamente
    expect(result).toContain('\\"quoted\\"');
    expect(result).toContain("\\n");
  });

  it("NO altera capitalización de metric keys en thresholds (Req 6.1-6.4)", () => {
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
              // Built-in K6 metrics (lowercase con underscores)
              http_req_duration: ["p(95) < 2000"],
              http_req_failed: ["rate < 0.01"],
              // Custom metrics con capitalización mixta
              Errors: ["count < 5"],
              Total_Reqs: ["count > 100"],
              // Custom metrics lowercase con underscores
              waiting_time: ["avg < 1600"],
              transaction_duration: ["p(95) < 3000"],
            },
          },
        },
      ],
    };

    const result = serializeConfig(config);

    // Verificar que las métricas aparecen EXACTAMENTE como fueron definidas
    expect(result).toContain("http_req_duration:");
    expect(result).toContain("http_req_failed:");
    expect(result).toContain("Errors:");
    expect(result).toContain("Total_Reqs:");
    expect(result).toContain("waiting_time:");
    expect(result).toContain("transaction_duration:");

    // Verificar que NO aparecen transformadas a lowercase
    expect(result).not.toContain("errors:"); // NO debe ser lowercase
    expect(result).not.toContain("total_reqs:"); // NO debe ser lowercase

    // Verificar que NO aparecen transformadas a UPPERCASE
    expect(result).not.toContain("ERRORS:");
    expect(result).not.toContain("TOTAL_REQS:");
    expect(result).not.toContain("HTTP_REQ_DURATION:");
  });

  it("preserva métricas custom del proyecto sin transformación de formato (Req 4.5, 6.2-6.4)", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          stresstest: {
            stages: [{ duration: "2m", target: 50 }],
            thresholds: {
              retries: ["count < 10"],
              transactions_per_second: ["avg >= 5"],
              active_vus: ["avg > 10"],
            },
          },
        },
      ],
    };

    const result = serializeConfig(config);

    // Todas las métricas custom del proyecto deben preservarse exactamente
    expect(result).toContain("retries:");
    expect(result).toContain("transactions_per_second:");
    expect(result).toContain("active_vus:");

    // No deben aparecer con ninguna transformación
    expect(result).not.toContain("RETRIES:");
    expect(result).not.toContain("TRANSACTIONS_PER_SECOND:");
    expect(result).not.toContain("ACTIVE_VUS:");
  });

  it("genera JavaScript sintácticamente válido que puede ser evaluado (Req 1.1, 1.2)", () => {
    const config: Config = {
      endpoints: [
        {
          name: "Test Endpoint",
          description: "Validates syntax",
          url: "https://example.com/api/test",
          method: "POST",
          payload: { key: "value", nested: { data: 123 } },
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

    const result = serializeConfig(config);

    // Intentar evaluar el código JavaScript generado
    // Envolvemos en una función para simular la importación del módulo
    let parsedConfig: any;
    expect(() => {
      // Reemplazar export default con una asignación
      const evalCode = result.replace("export default", "parsedConfig =");
      eval(evalCode);
    }).not.toThrow();

    // Verificar que el objeto parseado tiene la estructura correcta
    expect(parsedConfig).toBeDefined();
    expect(parsedConfig).toHaveProperty("endpoints");
    expect(Array.isArray(parsedConfig.endpoints)).toBe(true);
    expect(parsedConfig.endpoints.length).toBe(1);
    expect(parsedConfig.endpoints[0]).toHaveProperty("url");
    expect(parsedConfig.endpoints[0]).toHaveProperty("method");
  });

  it("preserva claves especiales como propiedades propias en payload y thresholds", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/test",
          method: "POST",
          payload: { ["__proto__"]: null },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "30s", target: 1 }],
            thresholds: {
              "custom.metric-with-dash": ["count < 5"],
              ["__proto__"]: ["count < 1"],
            },
          },
        },
      ],
    };

    const result = serializeConfig(config);
    let parsedConfig: any;

    expect(() => {
      const evalCode = result.replace("export default", "parsedConfig =");
      eval(evalCode);
    }).not.toThrow();

    expect(Object.prototype.hasOwnProperty.call(parsedConfig.endpoints[0].payload, "__proto__")).toBe(true);
    expect(parsedConfig.endpoints[0].payload.__proto__).toBeNull();
    expect(parsedConfig.endpoints[0].loadtest.thresholds["custom.metric-with-dash"]).toEqual(["count < 5"]);
    expect(Object.prototype.hasOwnProperty.call(parsedConfig.endpoints[0].loadtest.thresholds, "__proto__")).toBe(true);
  });

  it("serializa config basada en el config.js existente del proyecto (Req 2.1-2.6)", () => {
    // Config basada en el config.js real del proyecto
    const config: Config = {
      endpoints: [
        {
          url: "https://api.example.com/v1/resources",
          payload: {
            name: "Sample resource",
            value: "example",
          },
          headers: {
            "Content-Type": "application/json",
            "X-Test-Client": "example",
          },
          method: "POST",
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

    const result = serializeConfig(config);

    // Verificar que todos los elementos clave de una configuracion generica estan presentes
    expect(result).toContain("https://api.example.com/v1/resources");
    expect(result).toContain('"POST"');
    expect(result).toContain("payload:");
    expect(result).toContain("name:");
    expect(result).toContain("value:");
    expect(result).toContain("headers:");
    expect(result).toContain('"Content-Type"');
    expect(result).toContain('"X-Test-Client"');

    // Verificar que todos los 4 perfiles están presentes
    expect(result).toContain("loadtest:");
    expect(result).toContain("stresstest:");
    expect(result).toContain("capacitytest:");
    expect(result).toContain("stabilitytest:");

    // Verificar métricas custom del proyecto
    expect(result).toContain("waiting_time:");
    expect(result).toContain("Errors:");
    expect(result).toContain("iterations:");
    expect(result).toContain("active_vus:");
    expect(result).toContain("transactions_per_second:");
    expect(result).toContain("retries:");
    expect(result).toContain("vus_max:");

    // Verificar que la estructura es válida
    expect(result).toContain("export default");
    expect(result).toContain("endpoints:");

    // Verificar que puede ser evaluado sin errores
    expect(() => {
      const evalCode = result.replace("export default", "const testConfig =");
      eval(evalCode);
    }).not.toThrow();
  });
});
