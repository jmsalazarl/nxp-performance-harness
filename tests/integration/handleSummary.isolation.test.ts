import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Feature: k6-summary-export
 * Task 5.2: Tests de aislamiento
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * Estos tests verifican que agregar handleSummary no altera el comportamiento
 * existente del script performancetest.js:
 * - options.scenarios permanece sin modificación
 * - options.thresholds permanece sin modificación
 * - executeWithRetries mantiene su lógica de reintentos
 */

describe("Feature: k6-summary-export - Integration: Aislamiento de comportamiento", () => {
  let scriptContent: string;
  let optionsScenarios: string | null = null;
  let optionsThresholds: string | null = null;
  let executeWithRetriesContent: string | null = null;

  beforeAll(() => {
    // Leer el runner K6 desde su carpeta de dominio
    const scriptPath = join(process.cwd(), "k6", "performancetest.js");
    scriptContent = readFileSync(scriptPath, "utf-8");

    // Extraer la definición de options.scenarios
    const scenariosMatch = scriptContent.match(
      /const scenarios = \{[\s\S]*?\n\};/
    );
    if (scenariosMatch) {
      optionsScenarios = scenariosMatch[0];
    }

    // Extraer la definición de options.thresholds
    const thresholdsMatch = scriptContent.match(
      /const thresholds = \{[\s\S]*?\n\};/
    );
    if (thresholdsMatch) {
      optionsThresholds = thresholdsMatch[0];
    }

    // Extraer la función executeWithRetries
    const executeWithRetriesMatch = scriptContent.match(
      /function executeWithRetries\([^)]*\) \{[\s\S]*?\n\}/
    );
    if (executeWithRetriesMatch) {
      executeWithRetriesContent = executeWithRetriesMatch[0];
    }
  });

  describe("Requirement 3.1: options.scenarios no se modifica", () => {
    it("debe contener la lógica original de construcción de scenarios basada en endpoints", () => {
      expect(optionsScenarios).not.toBeNull();
      expect(optionsScenarios).toContain("endpoints.forEach");
      expect(optionsScenarios).toContain("const scenarioKey");
      expect(optionsScenarios).toContain("executor: \"ramping-vus\"");
      expect(optionsScenarios).toContain("stages: scenarioConfig.stages");
      expect(optionsScenarios).toContain("exec: \"genericScenario\"");
    });

    it("debe mantener los tags de endpoint y test_type en scenarios", () => {
      expect(optionsScenarios).toContain("tags: {");
      expect(optionsScenarios).toContain("endpoint: scenarioKey");
      expect(optionsScenarios).toContain("test_type: scenarioName");
    });

    it("debe mantener las variables de entorno para cada escenario", () => {
      expect(optionsScenarios).toContain("env: {");
      expect(optionsScenarios).toContain("TEST_URL: endpoint.url");
      expect(optionsScenarios).toContain("PAYLOAD: JSON.stringify");
      expect(optionsScenarios).toContain("METHOD_TYPE:");
      expect(optionsScenarios).toContain("SCENARIO_TAG:");
      expect(optionsScenarios).toContain("HEADERS:");
      expect(optionsScenarios).toContain("EXPECTED_STATUS:");
      expect(optionsScenarios).toContain("MAX_RETRIES:");
      expect(optionsScenarios).toContain("THINK_TIME_SECONDS:");
    });
  });

  describe("Requirement 3.2: options.thresholds permanece sin cambios", () => {
    it("debe contener la lógica original de construcción de thresholds por escenario", () => {
      expect(optionsThresholds).not.toBeNull();
      expect(optionsThresholds).toContain("endpoints.forEach");
      expect(optionsThresholds).toContain("scenarioConfig.thresholds");
      expect(optionsThresholds).toContain("Object.entries");
    });

    it("debe mantener el patrón de etiquetado de thresholds por endpoint", () => {
      expect(optionsThresholds).toContain(
        "thresholds[`${metric}{endpoint:${scenarioKey}}`]"
      );
    });
  });

  describe("Requirement 3.3, 3.4, 3.5: executeWithRetries no se altera", () => {
    it("debe mantener la lógica de reintentos con maxRetries", () => {
      expect(executeWithRetriesContent).not.toBeNull();
      expect(executeWithRetriesContent).toContain("let response;");
      expect(executeWithRetriesContent).toContain("let attempts = 0;");
      expect(executeWithRetriesContent).toContain("do {");
      expect(executeWithRetriesContent).toContain("attempts++;");
      expect(executeWithRetriesContent).toContain("} while (attempts <= maxRetries);");
    });

    it("debe mantener la llamada a executeRequest dentro del loop", () => {
      expect(executeWithRetriesContent).toContain("response = executeRequest");
      expect(executeWithRetriesContent).toContain("__ENV.TEST_URL");
      expect(executeWithRetriesContent).toContain("__ENV.PAYLOAD");
      expect(executeWithRetriesContent).toContain("__ENV.METHOD_TYPE");
      expect(executeWithRetriesContent).toContain("__ENV.SCENARIO_TAG");
    });

    it("debe mantener la lógica de conteo de métricas", () => {
      expect(executeWithRetriesContent).toContain("totalReqs.add(1, metricTags)");
      expect(executeWithRetriesContent).toContain("errorCounter.add(1, metricTags)");
      expect(executeWithRetriesContent).toContain("totalRetries.add(attempts - 1, metricTags)");
    });

    it("debe mantener la condición de salida en caso de éxito", () => {
      expect(executeWithRetriesContent).toContain("const failed = !response || response.status !== expectedStatus");
      expect(executeWithRetriesContent).toContain("if (!failed) {");
      expect(executeWithRetriesContent).toContain("break;");
    });
  });

  describe("Verificación de que handleSummary existe pero no interfiere", () => {
    it("debe contener la función handleSummary exportada", () => {
      expect(scriptContent).toContain("export function handleSummary(data)");
    });

    it("handleSummary no debe alterar la construcción de options", () => {
      // Verificar que options se exporta con scenarios y thresholds
      expect(scriptContent).toContain("export const options = {");
      expect(scriptContent).toContain("insecureSkipTLSVerify: true");
      expect(scriptContent).toContain("scenarios,");
      expect(scriptContent).toContain("thresholds,");
    });

    it("handleSummary no debe estar referenciado en la lógica de scenarios", () => {
      // La sección de scenarios no debe mencionar handleSummary
      expect(optionsScenarios).not.toContain("handleSummary");
    });

    it("handleSummary no debe estar referenciado en la lógica de thresholds", () => {
      // La sección de thresholds no debe mencionar handleSummary
      expect(optionsThresholds).not.toContain("handleSummary");
    });

    it("handleSummary no debe estar referenciado en executeWithRetries", () => {
      // La función executeWithRetries no debe mencionar handleSummary
      expect(executeWithRetriesContent).not.toContain("handleSummary");
    });
  });

  describe("Validación estructural del script completo", () => {
    it("debe mantener todas las funciones exportadas originales", () => {
      expect(scriptContent).toContain("export const options");
      expect(scriptContent).toContain("export function genericScenario()");
      expect(scriptContent).toContain("export function handleSummary(data)");
    });

    it("debe mantener las funciones internas sin exportar", () => {
      expect(scriptContent).toContain("function executeWithRetries(");
      expect(scriptContent).toContain("function executeRequest(");
      expect(scriptContent).toContain("function buildUrlWithQueryParams(");
      expect(scriptContent).toContain("function parseJson(");
    });

    it("debe mantener todas las métricas custom definidas", () => {
      expect(scriptContent).toContain("const waitingTime = new Trend");
      expect(scriptContent).toContain("const errorCounter = new Counter");
      expect(scriptContent).toContain("const totalReqs = new Counter");
      expect(scriptContent).toContain("const totalRetries = new Counter");
      expect(scriptContent).toContain("const transactionDuration = new Trend");
      expect(scriptContent).toContain("const transactionsPerSecond = new Trend");
      expect(scriptContent).toContain("const activeVUs = new Trend");
    });

    it("debe mantener la validación inicial de TEST_TYPE", () => {
      expect(scriptContent).toContain("const scenarioName = __ENV.TEST_TYPE");
      expect(scriptContent).toContain("if (!scenarioName) {");
      expect(scriptContent).toContain("throw new Error(");
      expect(scriptContent).toContain("Debes especificar el tipo de prueba");
    });

    it("debe mantener el filtrado de endpoints por TEST_TYPE", () => {
      expect(scriptContent).toContain(
        "const endpoints = config.endpoints.filter"
      );
      expect(scriptContent).toContain("endpoint[scenarioName]");
    });
  });
});
