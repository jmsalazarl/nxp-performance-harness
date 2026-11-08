import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const command = args[0];
const profileFile = valueOf("--profile");
const roleMapFile = valueOf("--role-map");
const snapshotFile = valueOf("--snapshot");
const profileId = valueOf("--profile-id");
const restoreScript = valueOf("--restore-script");

if (!command || !profileFile || !roleMapFile) fail("Uso: docker-resource-profile.mjs <snapshot|apply|verify|restore> --profile <file> --role-map <file> [opciones]");

const document = readJson(profileFile);
const roleMap = readJson(roleMapFile);
validateDocument(document);
const profile = document.profiles?.find((item) => item.id === profileId) ?? document.profiles?.[0];
if (!profile) fail("No se encontro el profile solicitado");

const bindings = Object.entries(profile.services).map(([role, allocation]) => {
  const container = roleMap[role];
  if (typeof container !== "string" || container.trim() === "") fail(`No existe container para el rol ${role}`);
  if (container === process.env.K6_CONTAINER_NAME || container === "nxp-k6-capacity") fail("El generador k6 no puede recibir limites del SUT");
  return { role, container, allocation };
});

if (command === "snapshot") {
  const snapshot = bindings.map(({ role, container }) => {
    ensureContainerReady(role, container);
    return { role, container, limits: inspectLimits(container) };
  });
  writeJson(snapshotFile, snapshot);
} else if (command === "apply") {
  if (!snapshotFile) fail("--snapshot es requerido para apply");
  const originalLimits = Object.fromEntries(readJson(snapshotFile).map((item) => [item.container, item.limits]));
  bindings.forEach(({ role, container, allocation }) => {
    ensureContainerReady(role, container);
    updateLimits(container, allocation, originalLimits[container]);
  });
} else if (command === "verify") {
  if (!snapshotFile) fail("--snapshot es requerido para verify");
  const originalLimits = Object.fromEntries(readJson(snapshotFile).map((item) => [item.container, item.limits]));
  bindings.forEach(({ role, container, allocation }) => {
    ensureContainerReady(role, container);
    verifyLimits(role, container, allocation, originalLimits[container]);
  });
} else if (command === "restore") {
  if (!snapshotFile) fail("--snapshot es requerido para restore");
  const snapshot = readJson(snapshotFile);
  let restored = true;
  for (const item of snapshot) {
    try {
      restoreLimits(item.container, item.limits);
    } catch (error) {
      restored = false;
      console.error(`No se pudo restaurar ${item.role}: ${error.message}`);
    }
  }
  if (!restored && restoreScript) {
    execFileSync(restoreScript, [], { stdio: "inherit" });
    restored = snapshot.every((item) => {
      try {
        return JSON.stringify(inspectLimits(item.container)) === JSON.stringify(item.limits);
      } catch (_error) {
        return false;
      }
    });
  }
  const result = { resourceLimitsRestored: restored, restoredAt: new Date().toISOString(), snapshot };
  if (snapshotFile) writeJson(`${snapshotFile}.restore.json`, result);
  if (!restored) process.exit(1);
} else {
  fail(`Comando no soportado: ${command}`);
}

function valueOf(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`No se pudo leer JSON ${file}: ${error.message}`);
  }
}

function writeJson(file, value) {
  if (!file) fail("Falta ruta de salida");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function inspectLimits(container) {
  const inspect = inspectContainer(container);
  const hostConfig = inspect.HostConfig ?? {};
  return {
    nanoCpus: Number(hostConfig.NanoCpus ?? 0),
    cpuQuota: Number(hostConfig.CpuQuota ?? 0),
    cpuPeriod: Number(hostConfig.CpuPeriod ?? 0),
    memoryBytes: Number(hostConfig.Memory ?? 0),
    memorySwapBytes: Number(hostConfig.MemorySwap ?? 0),
  };
}

function inspectContainer(container) {
  const inspect = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
  if (!inspect) fail(`No se encontro el container ${container}`);
  return inspect;
}

function ensureContainerReady(role, container) {
  const inspect = inspectContainer(container);
  if (inspect.State?.Running !== true) fail(`El container ${container} del rol ${role} no esta ejecutandose`);
  const health = inspect.State?.Health?.Status;
  if (health && health !== "healthy") fail(`El container ${container} del rol ${role} no esta saludable: ${health}`);
}

function updateLimits(container, allocation, originalLimits) {
  if (!originalLimits) fail(`No existe snapshot para ${container}`);
  const cpuArgs = originalLimits.nanoCpus > 0
    ? ["--cpus", String(allocation.cpu)]
    : ["--cpu-period", "100000", "--cpu-quota", String(Math.round(allocation.cpu * 100000))];
  execFileSync("docker", ["update", ...cpuArgs, "--memory", `${allocation.memoryMiB}m`, "--memory-swap", `${allocation.memoryMiB}m`, container], { stdio: "inherit" });
}

function verifyLimits(role, container, allocation, originalLimits) {
  const actual = inspectLimits(container);
  const expectedNanoCpus = Math.round(allocation.cpu * 1_000_000_000);
  const expectedMemory = allocation.memoryMiB * 1024 * 1024;
  if (!originalLimits) fail(`No existe snapshot para ${container}`);
  const cpuValid = originalLimits.nanoCpus > 0
    ? Math.abs(actual.nanoCpus - expectedNanoCpus) <= 1_000_000
    : actual.nanoCpus === 0 && actual.cpuQuota === Math.round(allocation.cpu * 100000) && actual.cpuPeriod === 100000;
  if (!cpuValid || actual.memoryBytes !== expectedMemory || actual.memorySwapBytes !== expectedMemory) {
    fail(`Limites efectivos no coinciden para ${role}: ${JSON.stringify(actual)}`);
  }
}

function restoreLimits(container, limits) {
  const containerId = execFileSync("docker", ["inspect", "--format", "{{.Id}}", container], { encoding: "utf8" }).trim();
  const payload = JSON.stringify({
    NanoCPUs: limits.nanoCpus,
    CPUQuota: limits.cpuQuota,
    CPUPeriod: limits.cpuPeriod,
    Memory: limits.memoryBytes,
    MemorySwap: limits.memorySwapBytes,
  });
  execFileSync("curl", [
    "--silent",
    "--show-error",
    "--fail",
    "--unix-socket", "/var/run/docker.sock",
    "-X", "POST",
    "-H", "Content-Type: application/json",
    "--data", payload,
    `http://localhost/containers/${containerId}/update`,
  ], { stdio: "inherit" });
  const restored = inspectLimits(container);
  if (JSON.stringify(restored) !== JSON.stringify(limits)) throw new Error(`Restauracion no verificada para ${container}`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function validateDocument(value) {
  if (value?.schemaVersion !== 1 || !Array.isArray(value.profiles) || value.profiles.length === 0) fail("Contrato de resource profiles invalido");
  const ids = new Set();
  for (const profile of value.profiles) {
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(profile.id) || profile.kind !== "laboratory" || ids.has(profile.id)) fail("Identificador o tipo de profile invalido");
    ids.add(profile.id);
    for (const [role, allocation] of Object.entries(profile.services ?? {})) {
      if (!["application", "database", "frontend", "storage", "worker"].includes(role)) fail(`Rol no permitido: ${role}`);
      if (typeof allocation !== "object" || allocation === null || Array.isArray(allocation)) fail(`Asignacion invalida para ${role}`);
      if (!Number.isFinite(allocation.cpu) || allocation.cpu <= 0 || !Number.isFinite(allocation.memoryMiB) || allocation.memoryMiB <= 0) fail(`Limite invalido para ${role}`);
      if (Object.keys(allocation).some((key) => !["cpu", "memoryMiB"].includes(key))) fail(`Campo privado o desconocido en ${role}`);
    }
  }
}
