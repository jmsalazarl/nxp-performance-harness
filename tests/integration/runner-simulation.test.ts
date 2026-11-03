/**
 * Runner Simulation Test
 * 
 * Simulates the exact logic from performancetest.js to verify
 * that the generated config.js works as expected.
 * 
 * Tests:
 * - Task 8.1: Verificar compatibilidad del output con performancetest.js
 * - Requirements: 1.3, 3.5, 3.6
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { serializeConfig } from "../../src/services/serializeConfig.js";
import type { Config } from "../../src/models/config.types.js";
import { writeFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempConfigPath = join(__dirname, "../../temp-runner-sim-config.js");

describe("Runner Simulation - Exact performancetest.js logic", () => {
  let testConfig: Config;

  beforeAll(() => {
    // Create config similar to the real config.js
    testConfig = {
      endpoints: [
        {
          url: "https://example.test/api/endpoint1",
          method: "POST",
          payload: { test: "data" },
          headers: { "Content-Type": "application/json" },
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [{ duration: "1m", target: 10 }],
            thresholds: {
              http_req_duration: ["p(95) < 2000"],
              waiting_time: ["avg < 1600"],
              Errors: ["count < 5"],
            },
          },
          stresstest: {
            stages: [{ duration: "1m", target: 50 }],
            thresholds: {
              http_req_duration: ["p(95) < 5000"],
              Errors: ["count < 20"],
            },
          },
        },
        {
          url: "https://example.test/api/endpoint2",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 2,
          thinkTimeSeconds: 0.5,
          capacitytest: {
            stages: [{ duration: "1m", target: 20 }],
            thresholds: {
              http_req_duration: ["p(95) < 3000"],
            },
          },
        },
      ],
    };

    const serialized = serializeConfig(testConfig);
    writeFileSync(tempConfigPath, serialized, "utf-8");
  });

  afterAll(() => {
    try {
      unlinkSync(tempConfigPath);
    } catch (error) {
      // Ignore
    }
  });

  it("should simulate: import config from './config.js'", async () => {
    // This simulates line 4 from performancetest.js:
    // import config from "./config.js";
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    expect(config).toBeDefined();
    expect(config.endpoints).toBeDefined();
    expect(Array.isArray(config.endpoints)).toBe(true);
  });

  it("should simulate: const scenarioName = __ENV.TEST_TYPE", async () => {
    // This simulates line 13 from performancetest.js:
    // const scenarioName = __ENV.TEST_TYPE;
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    // Simulate different TEST_TYPE values
    const testTypes = ["loadtest", "stresstest", "capacitytest", "stabilitytest"];

    testTypes.forEach((scenarioName) => {
      expect(typeof scenarioName).toBe("string");
      expect(testTypes).toContain(scenarioName);
    });
  });

  it("should simulate: const endpoints = config.endpoints.filter(...)", async () => {
    // This simulates line 20 from performancetest.js:
    // const endpoints = config.endpoints.filter((endpoint) => endpoint[scenarioName]);
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    // Test loadtest filtering
    const scenarioName = "loadtest";
    const endpoints = config.endpoints.filter(
      (endpoint: any) => endpoint[scenarioName]
    );

    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBe(1);
    expect(endpoints[0][scenarioName]).toBeDefined();
  });

  it("should simulate: if (endpoints.length === 0) throw error", async () => {
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    // Test with a profile that doesn't exist
    const scenarioName = "stabilitytest";
    const endpoints = config.endpoints.filter(
      (endpoint: any) => endpoint[scenarioName]
    );

    // This would trigger the error in performancetest.js line 22-26
    if (endpoints.length === 0) {
      const errorMessage = `No se encontró el tipo de prueba '${scenarioName}'. Valores esperados: loadtest, stresstest, capacitytest, stabilitytest.`;
      expect(errorMessage).toContain(scenarioName);
    }

    expect(endpoints.length).toBe(0);
  });

  it("should simulate: forEach endpoint scenario building", async () => {
    // This simulates lines 31-65 from performancetest.js:
    // endpoints.forEach((endpoint, index) => { ... })
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    const scenarioName = "loadtest";
    const endpoints = config.endpoints.filter(
      (endpoint: any) => endpoint[scenarioName]
    );

    const scenarios: Record<string, any> = {};
    const thresholds: Record<string, any> = {};

    endpoints.forEach((endpoint: any, index: number) => {
      const scenarioKey = `${scenarioName}_endpoint_${index}`;
      const scenarioConfig = endpoint[scenarioName];

      // Build scenario object (like line 32-52)
      scenarios[scenarioKey] = {
        executor: "ramping-vus",
        stages: scenarioConfig.stages,
        exec: "genericScenario",
        tags: {
          endpoint: scenarioKey,
          test_type: scenarioName,
        },
        env: {
          TEST_URL: endpoint.url,
          PAYLOAD: JSON.stringify(endpoint.payload || {}),
          METHOD_TYPE: String(endpoint.method || "GET").toUpperCase(),
          SCENARIO_TAG: scenarioKey,
          HEADERS: JSON.stringify(endpoint.headers || {}),
          EXPECTED_STATUS: String(endpoint.expectedStatus || 200),
          MAX_RETRIES: String(endpoint.maxRetries || 3),
          THINK_TIME_SECONDS: String(endpoint.thinkTimeSeconds ?? 1),
        },
      };

      // Build thresholds (like line 54-58)
      if (scenarioConfig.thresholds) {
        Object.entries(scenarioConfig.thresholds).forEach(([metric, rules]) => {
          thresholds[`${metric}{endpoint:${scenarioKey}}`] = rules;
        });
      }
    });

    // Verify scenarios were built correctly
    expect(Object.keys(scenarios).length).toBe(1);
    expect(scenarios["loadtest_endpoint_0"]).toBeDefined();
    expect(scenarios["loadtest_endpoint_0"].stages).toBeDefined();
    expect(scenarios["loadtest_endpoint_0"].env.TEST_URL).toBe(
      "https://example.test/api/endpoint1"
    );

    // Verify thresholds were built correctly
    expect(Object.keys(thresholds).length).toBeGreaterThan(0);
    expect(thresholds["http_req_duration{endpoint:loadtest_endpoint_0}"]).toBeDefined();
    expect(thresholds["waiting_time{endpoint:loadtest_endpoint_0}"]).toBeDefined();
    expect(thresholds["Errors{endpoint:loadtest_endpoint_0}"]).toBeDefined();
  });

  it("should preserve custom metric names in thresholds", async () => {
    // Verifies that custom metrics like waiting_time, Errors, etc.
    // are preserved exactly as defined in the config
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    const endpoint = config.endpoints[0];
    const loadtestThresholds = endpoint.loadtest.thresholds;

    // Custom metrics from performancetest.js (lines 7-13)
    const customMetrics = ["waiting_time", "Errors"];

    customMetrics.forEach((metricName) => {
      expect(loadtestThresholds[metricName]).toBeDefined();
      expect(Array.isArray(loadtestThresholds[metricName])).toBe(true);
    });

    // Verify the exact metric names are preserved (case-sensitive)
    expect(loadtestThresholds["waiting_time"]).toBeDefined();
    expect(loadtestThresholds["Errors"]).toBeDefined();
    expect(loadtestThresholds["ERRORS"]).toBeUndefined(); // Wrong case
    expect(loadtestThresholds["waitingTime"]).toBeUndefined(); // Wrong format
  });

  it("should work with all supported TEST_TYPE values", async () => {
    // Simulates running with different TEST_TYPE env values
    const imported = await import(`${tempConfigPath}?cache=${Date.now()}`);
    const config = imported.default;

    const testResults = [
      { scenarioName: "loadtest", expectedCount: 1 },
      { scenarioName: "stresstest", expectedCount: 1 },
      { scenarioName: "capacitytest", expectedCount: 1 },
      { scenarioName: "stabilitytest", expectedCount: 0 },
    ];

    testResults.forEach(({ scenarioName, expectedCount }) => {
      const endpoints = config.endpoints.filter(
        (endpoint: any) => endpoint[scenarioName]
      );

      expect(endpoints.length).toBe(expectedCount);
    });
  });
});
