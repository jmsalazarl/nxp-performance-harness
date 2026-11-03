import { check } from "k6";
import exec from "k6/execution";
import { envBoolean, envString, envJson, runId } from "../../core/config/env.js";
import { getProfile } from "../../core/profiles/index.js";
import { recordJourney } from "../../core/metrics/journey.js";
import { REFERENCE_DEFAULTS } from "./config/defaults.js";
import dataset from "./data/default.js";
import { listJourney } from "./journeys/list.js";
import { detailJourney } from "./journeys/detail.js";
import { writeJourney } from "./journeys/write.js";
import { transactionJourney } from "./journeys/transaction.js";
import { transactionStatusJourney } from "./journeys/transaction-status.js";
import { healthJourney } from "./journeys/health.js";

const profileName = envString("PROFILE", "smoke");
const profile = getProfile(profileName);
const baseUrl = envString("BASE_URL", REFERENCE_DEFAULTS.baseUrl);
const enabledJourneys = envJson("ENABLED_JOURNEYS", REFERENCE_DEFAULTS.enabledJourneys);
const weights = { ...REFERENCE_DEFAULTS.weights, ...envJson("JOURNEY_WEIGHTS", {}) };
const data = { ...dataset, ...envJson("DATASET_JSON", {}) };
const transactionEnabled = envBoolean("ENABLE_TRANSACTION", false);
const transactionStatusEnabled = envBoolean("ENABLE_TRANSACTION_STATUS", false);
const run = envString("RUN_ID", runId("reference", profileName));

const activeJourneys = enabledJourneys.filter((name) => {
  if (name === "transaction") return transactionEnabled;
  if (name === "transaction_status") return transactionStatusEnabled;
  return true;
});

if (activeJourneys.length === 0) throw new Error("No hay journeys habilitados para la ejecucion");

function scenario() {
  const common = { exec: "runJourney", tags: { project: "reference", profile: profileName } };
  if (profile.executor === "ramping-vus") return { ...common, executor: "ramping-vus", stages: profile.stages };
  if (profile.executor === "constant-arrival-rate") return { ...common, executor: profile.executor, rate: profile.rate, timeUnit: profile.timeUnit, duration: profile.duration, preAllocatedVUs: profile.preAllocatedVUs, maxVUs: profile.maxVUs };
  return { ...common, executor: profile.executor, startRate: profile.startRate, timeUnit: profile.timeUnit, stages: profile.stages, preAllocatedVUs: profile.preAllocatedVUs, maxVUs: profile.maxVUs };
}

export const options = {
  scenarios: { reference: scenario() },
  thresholds: { ...profile.thresholds, journey_failed: ["rate < 0.01"] },
  summaryTrendStats: profile.summaryTrendStats,
  insecureSkipTLSVerify: envBoolean("INSECURE_SKIP_TLS_VERIFY", false),
};

export function runJourney() {
  const totalWeight = activeJourneys.reduce((total, journey) => total + Number(weights[journey] || 1), 0);
  const vuId = Number(exec.vu.idInTest || __VU || 1);
  const scenarioIteration = exec.scenario.iterationInTest;
  const iteration = Number(scenarioIteration ?? exec.vu.iterationInScenario ?? __ITER ?? 0);
  const sequence = scenarioIteration === undefined ? (iteration * 37) + vuId : iteration * 37;
  const position = sequence % totalWeight;
  let cursor = 0;
  const name = activeJourneys.find((journey) => {
    cursor += Number(weights[journey] || 1);
    return position < cursor;
  }) || activeJourneys[0];
  const start = Date.now();
  let results;
  switch (name) {
    case "list": results = listJourney(baseUrl); break;
    case "detail": results = detailJourney(baseUrl, data); break;
    case "write": results = writeJourney(baseUrl, data); break;
    case "transaction": results = transactionJourney(baseUrl, data); break;
    case "transaction_status": results = transactionStatusJourney(baseUrl, envString("TRANSACTION_ID", "sample-transaction")); break;
    case "health": results = healthJourney(baseUrl); break;
    default: throw new Error(`Journey no soportado: ${name}`);
  }
  const failed = results.some((result) => !result.ok);
  recordJourney(name, start, failed, { project: "reference", journey: name, operation: "journey", method: "MIXED", type: "read" });
  check(results, { [`journey ${name} completado`]: (items) => items.every((item) => item.ok) });
}

function compactSummary(data) {
  const metric = (name, key) => data.metrics?.[name]?.values?.[key];
  const journeys = {};
  activeJourneys.forEach((journey) => {
    journeys[journey] = {
      p95: metric(`http_req_duration{journey:${journey}}`, "p(95)"),
      errors: metric(`http_req_failed{journey:${journey}}`, "rate"),
    };
  });
  return { run_id: run, project: "reference", profile: profileName, metrics: Object.keys(data.metrics || {}), table: {
    iterations_per_second: metric("iterations", "rate"), requests_per_second: metric("http_reqs", "rate"), error_rate: metric("http_req_failed", "rate"), p50: metric("http_req_duration", "med"), p95: metric("http_req_duration", "p(95)"), p99: metric("http_req_duration", "p(99)"), dropped_iterations: metric("dropped_iterations", "count"),
  }, journeys };
}

export function handleSummary(data) {
  const summary = compactSummary(data);
  const resultDir = envString("RESULTS_DIR", `results/reference/${run}`);
  const safeBaseUrl = baseUrl.replace(/(https?:\/\/)[^/]*@/, "$1");
  const runConfig = { run_id: run, project: "reference", profile: profileName, base_url: safeBaseUrl, enabled_journeys: activeJourneys, thresholds: profile.thresholds, rates: { rate: profile.rate, start_rate: profile.startRate, time_unit: profile.timeUnit }, duration: profile.duration, git_commit: envString("GIT_COMMIT", "unknown") };
  const table = [
    "+------------------+----------+",
    "| Metric           | Value    |",
    "+------------------+----------+",
    `| Iterations/s     | ${String(summary.table.iterations_per_second ?? "n/a").padEnd(8)} |`,
    `| Requests/s       | ${String(summary.table.requests_per_second ?? "n/a").padEnd(8)} |`,
    `| Error rate       | ${String(summary.table.error_rate ?? "n/a").padEnd(8)} |`,
    `| p50              | ${String(summary.table.p50 ?? "n/a").padEnd(8)} |`,
    `| p95              | ${String(summary.table.p95 ?? "n/a").padEnd(8)} |`,
    `| p99              | ${String(summary.table.p99 ?? "n/a").padEnd(8)} |`,
    `| Dropped iters    | ${String(summary.table.dropped_iterations ?? "n/a").padEnd(8)} |`,
    "+------------------+----------+",
  ].join("\n");
  const journeyTable = [
    "+----------------+---------+--------+",
    "| Journey        | p95     | Errors |",
    "+----------------+---------+--------+",
    ...Object.entries(summary.journeys).map(([journey, values]) => `| ${journey.padEnd(14)} | ${String(values.p95 ?? "n/a").padEnd(7)} | ${String(values.errors ?? "n/a").padEnd(6)} |`),
    "+----------------+---------+--------+",
  ].join("\n");
  return {
    [`${resultDir}/summary.json`]: JSON.stringify({ ...data, harness: summary }, null, 2),
    [`${resultDir}/summary.html`]: `<!doctype html><html><body><pre>${JSON.stringify(summary, null, 2)}</pre></body></html>`,
    [`${resultDir}/run-config.json`]: JSON.stringify(runConfig, null, 2),
    stdout: `${JSON.stringify(summary, null, 2)}\n${table}\n${journeyTable}\n`,
  };
}
