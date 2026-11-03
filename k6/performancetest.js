import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import config from "./config/config_backup.js";

const waitingTime = new Trend("waiting_time");
const errorCounter = new Counter("Errors");
const totalReqs = new Counter("Total_Reqs");
const totalRetries = new Counter("retries");
const transactionDuration = new Trend("transaction_duration");
const transactionsPerSecond = new Trend("transactions_per_second");
const activeVUs = new Trend("active_vus");

const scenarioName = __ENV.TEST_TYPE;

if (!scenarioName) {
  throw new Error(
    "Debes especificar el tipo de prueba con -e TEST_TYPE=<loadtest|stresstest|capacitytest|stabilitytest>"
  );
}

const endpoints = config.endpoints.filter((endpoint) => endpoint[scenarioName]);

if (endpoints.length === 0) {
  throw new Error(
    `No se encontró el tipo de prueba '${scenarioName}'. Valores esperados: loadtest, stresstest, capacitytest, stabilitytest.`
  );
}

const scenarios = {};
const thresholds = {};

endpoints.forEach((endpoint, index) => {
  const scenarioKey = `${scenarioName}_endpoint_${index}`;
  const scenarioConfig = endpoint[scenarioName];

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

  if (scenarioConfig.thresholds) {
    Object.entries(scenarioConfig.thresholds).forEach(([metric, rules]) => {
      thresholds[`${metric}{endpoint:${scenarioKey}}`] = rules;
    });
  }
});

export const options = {
  insecureSkipTLSVerify: true,
  scenarios,
  thresholds,
};

export function genericScenario() {
  const start = Date.now();
  const scenarioTag = __ENV.SCENARIO_TAG;
  const method = String(__ENV.METHOD_TYPE || "GET").toUpperCase();
  const expectedStatus = Number(__ENV.EXPECTED_STATUS || 200);
  const thinkTimeSeconds = Number(__ENV.THINK_TIME_SECONDS || 1);
  const metricTags = {
    endpoint: scenarioTag,
    test_type: __ENV.TEST_TYPE,
    method,
  };

  activeVUs.add(__VU, metricTags);

  const maxRetries = __ENV.TEST_TYPE === "stresstest" ? Number(__ENV.MAX_RETRIES || 3) : 0;
  const response = executeWithRetries(maxRetries, expectedStatus, metricTags);

  const durationInSeconds = (Date.now() - start) / 1000;
  transactionDuration.add(durationInSeconds, metricTags);

  if (durationInSeconds > 0) {
    transactionsPerSecond.add(1 / durationInSeconds, metricTags);
  }

  const ok = response && response.status === expectedStatus;

  check(
    response,
    {
      [`status esperado ${expectedStatus}`]: (r) => r && r.status === expectedStatus,
    },
    metricTags
  );

  if (response && response.timings) {
    waitingTime.add(response.timings.waiting, metricTags);
  }

  if (!ok) {
    const status = response ? response.status : "sin respuesta";
    const body = response && response.body ? String(response.body).substring(0, 500) : "";
    console.error(`[${scenarioTag}] Error HTTP. Status=${status}. Body=${body}`);
  }

  sleep(thinkTimeSeconds);
}

function executeWithRetries(maxRetries, expectedStatus, metricTags) {
  let response;
  let attempts = 0;

  do {
    attempts++;
    response = executeRequest(__ENV.TEST_URL, __ENV.PAYLOAD, __ENV.METHOD_TYPE, __ENV.SCENARIO_TAG);
    totalReqs.add(1, metricTags);

    const failed = !response || response.status !== expectedStatus;
    if (failed) {
      errorCounter.add(1, metricTags);
    }

    if (!failed) {
      break;
    }
  } while (attempts <= maxRetries);

  if (attempts > 1) {
    totalRetries.add(attempts - 1, metricTags);
  }

  return response;
}

function executeRequest(url, payload, methodType, scenarioTag) {
  const method = String(methodType || "GET").toUpperCase();
  const headers = parseJson(__ENV.HEADERS, {});
  const requestParams = {
    headers,
    tags: {
      endpoint: scenarioTag,
      test_type: __ENV.TEST_TYPE,
      method,
    },
  };

  switch (method) {
    case "GET":
      return http.get(buildUrlWithQueryParams(url, payload), requestParams);
    case "POST":
      return http.post(url, payload, requestParams);
    case "PUT":
      return http.put(url, payload, requestParams);
    case "PATCH":
      return http.patch(url, payload, requestParams);
    case "DELETE":
      return http.del(url, payload, requestParams);
    default:
      throw new Error(`Método HTTP no soportado: ${method}`);
  }
}

function buildUrlWithQueryParams(url, payload) {
  const params = parseJson(payload, null);

  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  if (!queryString) {
    return url;
  }

  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}

function parseJson(value, fallbackValue) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallbackValue;
  }
}

export function handleSummary(data) {
  const testType = __ENV.TEST_TYPE || "unknown";

  return {
    [`reports/summary-${testType}.json`]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify(
      {
        test_type: testType,
        metrics: Object.keys(data.metrics || {}),
      },
      null,
      2
    ),
  };
}
