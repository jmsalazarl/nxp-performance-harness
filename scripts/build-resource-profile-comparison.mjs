import fs from "node:fs";
import path from "node:path";

const resultsRoot = argument("--results-root") ?? process.env.RESULTS_DIR;
const outputFile = argument("--output") ?? path.join(resultsRoot ?? ".", "resource-profile-comparison.json");
if (!resultsRoot) fail("--results-root es requerido");
if (!fs.existsSync(resultsRoot)) fail(`No existe el directorio de resultados: ${resultsRoot}`);

const runDirectories = fs.readdirSync(resultsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
const runs = runDirectories.map((entry) => buildRun(path.join(resultsRoot, entry.name))).filter(Boolean);
const targets = [...new Set(runs.flatMap((run) => run.targets.map((target) => target.targetRate)))].sort((left, right) => left - right);
const matrix = {};
const minimumWorkingProfileByTarget = {};
const recommendedProfileByTarget = {};

for (const target of targets) {
  const key = String(target);
  matrix[key] = {};
  const targetRuns = runs.filter((run) => run.targets.some((item) => item.targetRate === target));
  for (const run of targetRuns) matrix[key][run.profileId] = run.targets.find((item) => item.targetRate === target)?.classification ?? "NOT_TESTED";
  const safeRuns = targetRuns.filter((run) => run.targets.find((item) => item.targetRate === target)?.classification === "SAFE").sort((left, right) => left.totalCpu - right.totalCpu || left.totalMemoryMiB - right.totalMemoryMiB);
  minimumWorkingProfileByTarget[key] = safeRuns[0]?.profileId ?? null;
  recommendedProfileByTarget[key] = safeRuns.find((run) => {
    const item = run.targets.find((candidate) => candidate.targetRate === target);
     return item && Object.values(item.services).every((service) => {
       const p95 = service.cpu_limit_utilization_percent?.p95;
       return p95 === null || p95 === undefined || p95 <= 80;
     });
  })?.profileId ?? null;
}

const artifact = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  targets,
  runs: runs.map(({ profileId, totalCpu, totalMemoryMiB, ...run }) => ({ profileId, allocated: { cpu: totalCpu, memoryMiB: totalMemoryMiB }, ...run })),
  matrix,
  minimumWorkingProfileByTarget,
  recommendedProfileByTarget,
  scopeStatus: { backend: runs.length ? "SUFFICIENT" : "INSUFFICIENT", database: runs.length ? "PARTIAL" : "INSUFFICIENT", frontend: "NOT_VALIDATED", objectStorage: "NOT_VALIDATED" },
  productionTrafficTargetDefined: false,
};
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Comparison artifact generado: ${outputFile}`);

function buildRun(directory) {
  const profile = readJson(path.join(directory, "resource-profile.json"));
  const summary = readJson(path.join(directory, "stage-summary.json"));
  if (!profile || !summary) return null;
  const targets = (summary.stages ?? []).filter((stage) => stage.type === "measurement").map((stage) => {
    const services = stage.resources?.services ?? {};
    const dropped = stage.metrics?.dropped_iterations;
    const errorRate = stage.metrics?.http_error_rate;
    const hasResources = Object.keys(services).length > 0;
    const pressure = Object.values(services).some((service) => service.cpu_limit_utilization_percent?.p95 >= 80 || service.memory_utilization_percent?.p95 >= 80);
    const saturation = Object.values(services).some((service) => service.cpu_limit_utilization_percent?.p95 >= 100 || service.memory_utilization_percent?.p95 >= 100);
    const sustained = stage.metrics?.actual_iterations_per_second !== null && stage.metrics?.actual_iterations_per_second >= stage.target_rate * 0.95;
    let classification = "NOT_TESTED";
    if (hasResources) {
      if (sustained && dropped === 0 && (errorRate === null || errorRate === 0) && !pressure) classification = "SAFE";
      else if (saturation && (dropped > 0 || (errorRate ?? 0) > 0)) classification = "SATURATION";
      else if (saturation) classification = "NEAR_SATURATION";
      else if (pressure) classification = "RESOURCE_PRESSURE";
      else if (!sustained || dropped > 0 || (errorRate ?? 0) > 0) classification = "BREAKING_POINT";
    }
    return {
      targetRate: stage.target_rate,
      sustained,
      actualIterationsPerSecond: stage.metrics?.actual_iterations_per_second ?? null,
      droppedIterations: dropped,
      errorRatePercent: errorRate,
      classification,
      services,
      reasons: [],
    };
  });
  const safeTargets = targets.filter((target) => target.classification === "SAFE").map((target) => target.targetRate);
  const allocations = profile.requested?.services ?? {};
  return {
    profileId: profile.profileId,
    totalCpu: Object.values(allocations).reduce((total, item) => total + item.cpu, 0),
    totalMemoryMiB: Object.values(allocations).reduce((total, item) => total + item.memoryMiB, 0),
    maxTestedRate: targets.length ? Math.max(...targets.map((target) => target.targetRate)) : null,
    maxSustainedRate: targets.filter((target) => target.sustained).map((target) => target.targetRate).sort((left, right) => right - left)[0] ?? null,
    maxSafeRate: safeTargets.length ? Math.max(...safeTargets) : null,
    firstPressure: targets.find((target) => ["RESOURCE_PRESSURE", "NEAR_SATURATION"].includes(target.classification))?.targetRate ?? null,
    firstDegradation: targets.find((target) => ["SATURATION", "BREAKING_POINT"].includes(target.classification))?.targetRate ?? null,
    saturation: targets.find((target) => target.classification === "SATURATION")?.targetRate ?? null,
    breakingPoint: targets.find((target) => target.classification === "BREAKING_POINT")?.targetRate ?? null,
    targets,
  };
}

function readJson(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null; }
function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
function fail(message) { console.error(message); process.exit(2); }
