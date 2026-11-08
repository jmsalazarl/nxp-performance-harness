import fs from "node:fs";
import path from "node:path";

const resultDir = process.argv[2];
if (!resultDir) throw new Error("Uso: normalize-stage-summary.mjs <directorio-resultados>");

const readJson = (name, fallback) => {
  const file = path.join(resultDir, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
};

const parseNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const percentile = (values, factor) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * factor) - 1))];
};

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const max = (values) => values.length ? Math.max(...values) : null;
const min = (values) => values.length ? Math.min(...values) : null;

function memoryMib(value) {
  const match = String(value ?? "").match(/^([0-9.]+)(KiB|MiB|GiB)/);
  if (!match) return null;
  return Number(match[1]) * ({ KiB: 1 / 1024, MiB: 1, GiB: 1024 }[match[2]]);
}

function parseCsv(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function serviceStats(rows) {
  const cpu = rows.map((row) => parseNumber(row.container_cpu_percent)).filter((value) => value !== null);
  const memory = rows.map((row) => memoryMib(row.container_memory_usage)).filter((value) => value !== null);
  return {
    samples: rows.length,
    cpu_percent: { avg: average(cpu), p95: percentile(cpu, 0.95), max: max(cpu) },
    memory_mib: { avg: average(memory), p95: percentile(memory, 0.95), max: max(memory) },
  };
}

function normalizedServiceStats(rows, allocation) {
  const stats = serviceStats(rows);
  const cpuLimit = Number(allocation?.cpu ?? 0);
  const memoryLimit = Number(allocation?.memoryMiB ?? 0);
  const normalizeCpu = (value) => value === null || cpuLimit <= 0 ? null : value / cpuLimit;
  const normalizeMemory = (value) => value === null || memoryLimit <= 0 ? null : value / memoryLimit * 100;
  return {
    ...stats,
    cpu_limit: cpuLimit || null,
    cpu_limit_utilization_percent: {
      avg: normalizeCpu(stats.cpu_percent.avg),
      p95: normalizeCpu(stats.cpu_percent.p95),
      max: normalizeCpu(stats.cpu_percent.max),
    },
    memory_limit_mib: memoryLimit || null,
    memory_utilization_percent: {
      avg: normalizeMemory(stats.memory_mib.avg),
      p95: normalizeMemory(stats.memory_mib.p95),
      max: normalizeMemory(stats.memory_mib.max),
    },
    memory_headroom_mib: stats.memory_mib.max === null || memoryLimit <= 0 ? null : memoryLimit - stats.memory_mib.max,
  };
}

function hostStats(rows) {
  const unique = [...new Map(rows.map((row) => [row.timestamp, row])).values()];
  const metric = (name) => unique.map((row) => parseNumber(row[name])).filter((value) => value !== null);
  return {
    samples: unique.length,
    cpu_user_avg: average(metric("host_cpu_user")),
    cpu_system_avg: average(metric("host_cpu_system")),
    cpu_idle_avg: average(metric("host_cpu_idle")),
    cpu_iowait_avg: average(metric("host_cpu_iowait")),
    memory_available_mib: {
      min: min(metric("host_memory_available_mib")),
      avg: average(metric("host_memory_available_mib")),
    },
    swap_in: { avg: average(metric("host_swap_in")), max: max(metric("host_swap_in")), total: metric("host_swap_in").reduce((sum, value) => sum + value, 0) },
    swap_out: { avg: average(metric("host_swap_out")), max: max(metric("host_swap_out")), total: metric("host_swap_out").reduce((sum, value) => sum + value, 0) },
    load_1m: { avg: average(metric("host_load_1m")), max: max(metric("host_load_1m")) },
    load_5m: { avg: average(metric("host_load_5m")), max: max(metric("host_load_5m")) },
  };
}

const runConfig = readJson("run-config.json", {});
const stageSummary = readJson("stage-summary.json", null);
const resourceProfile = readJson("resource-profile.json", null);
const rows = parseCsv(path.join(resultDir, "docker-host-stats.csv"));
if (!stageSummary || rows.length === 0 || !runConfig.run_started_at) process.exit(0);

const startedAt = Date.parse(runConfig.run_started_at);
const roles = runConfig.container_roles || {};
const roleByContainer = Object.fromEntries(Object.entries(roles).map(([role, container]) => [container, role]));
const allocations = resourceProfile?.requested?.services || {};

for (const stage of stageSummary.stages || []) {
  const start = startedAt + stage.window.start_seconds * 1000;
  const end = startedAt + stage.window.end_seconds * 1000;
  const windowRows = rows.filter((row) => {
    const timestamp = Date.parse(row.timestamp);
    return timestamp >= start && timestamp <= end;
  });
  const containers = {};
  for (const container of new Set(windowRows.map((row) => row.container))) {
    const key = roleByContainer[container] || container;
    containers[key] = { container, ...normalizedServiceStats(windowRows.filter((row) => row.container === container), allocations[key]) };
  }
  stage.resources = {
    services: containers,
    host: hostStats(windowRows),
  };
}

fs.writeFileSync(path.join(resultDir, "stage-summary.json"), `${JSON.stringify(stageSummary, null, 2)}\n`);
