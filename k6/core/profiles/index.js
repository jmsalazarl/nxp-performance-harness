import { envJson, envNumber, envString } from "../config/env.js";

const common = { summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"] };
const provisionalSlo = {
  http_req_failed: ["rate < 0.01"],
  http_req_duration: ["p(95) < 1000", "p(99) < 2000"],
  "http_req_duration{journey:list}": ["p(95) < 600"],
  "http_req_duration{journey:detail}": ["p(95) < 600"],
  "http_req_duration{journey:write}": ["p(95) < 800"],
  "http_req_duration{journey:transaction}": ["p(95) < 1200"],
  "http_req_duration{journey:health}": ["p(95) < 200"],
};

function stages(name, fallback) {
  const configured = envString(`${name}_STAGES`, "");
  return configured ? JSON.parse(configured) : fallback;
}

function stageDefinitions(name, fallback) {
  const configured = envString(`${name}_STAGE_PLAN_JSON`, "");
  const definitions = configured ? JSON.parse(configured) : fallback;
  let elapsed = 0;
  return definitions.map((stage) => {
    const durationSeconds = parseDuration(stage.duration);
    const definition = {
      id: stage.id,
      type: stage.type,
      target: Number(stage.target),
      duration: stage.duration,
      duration_seconds: durationSeconds,
      start_seconds: elapsed,
      end_seconds: elapsed + durationSeconds,
    };
    elapsed += durationSeconds;
    return definition;
  });
}

function parseDuration(value) {
  const match = String(value).match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) throw new Error(`Duracion de stage no soportada: ${value}`);
  const units = { ms: 0.001, s: 1, m: 60, h: 3600 };
  return Number(match[1]) * units[match[2]];
}

function steppedRangeDefinitions() {
  const configured = envString("CAPACITY_STEPS", "");
  const targets = (configured ? configured.split(",") : [20, 40, 60, 80]).map((value) => Number(value.trim()));
  if (targets.length === 0 || targets.some((target) => !Number.isFinite(target) || target <= 0)) throw new Error("CAPACITY_STEPS debe contener tasas positivas separadas por comas");
  if (targets.some((target, index) => index > 0 && target <= targets[index - 1])) throw new Error("CAPACITY_STEPS debe estar ordenado de forma ascendente");

  const warmupTarget = envNumber("CAPACITY_STEPPED_START_RATE", 10);
  const warmupDuration = envString("CAPACITY_STEPPED_WARMUP_DURATION", "2m");
  const transitionDuration = envString("CAPACITY_STEPPED_TRANSITION_DURATION", "30s");
  const measurementDuration = envString("CAPACITY_STEPPED_MEASUREMENT_DURATION", "4m");
  const definitions = [{ id: "warmup", type: "warmup", target: warmupTarget, duration: warmupDuration }];
  let previousTarget = warmupTarget;
  targets.forEach((target) => {
    definitions.push({ id: `transition_${target}`, type: "transition", target, duration: transitionDuration, from_target: previousTarget });
    definitions.push({ id: `hold_${target}`, type: "measurement", target, duration: measurementDuration });
    previousTarget = target;
  });
  return definitions;
}

export function getProfile(name) {
  const profile = name.toLowerCase();
  const base = { name: profile, ...common, thresholds: { ...provisionalSlo, ...envJson("THRESHOLDS_JSON", {}) } };

  if (profile === "smoke") {
    return { ...base, executor: envString("SMOKE_EXECUTOR", "ramping-vus"), stages: stages("SMOKE", [{ duration: "30s", target: 1 }, { duration: "30s", target: 2 }, { duration: "30s", target: 0 }]), vus: envNumber("SMOKE_VUS", 1), duration: envString("SMOKE_DURATION", "2m") };
  }

  if (["baseline", "average", "soak"].includes(profile)) {
    const defaults = { baseline: 1, average: 3, soak: 3 };
    const rate = envNumber(`${profile.toUpperCase()}_RATE`, defaults[profile]);
    return { ...base, executor: "constant-arrival-rate", rate, timeUnit: envString(`${profile.toUpperCase()}_TIME_UNIT`, "1s"), duration: envString(`${profile.toUpperCase()}_DURATION`, profile === "soak" ? "30m" : profile === "average" ? "10m" : "5m"), preAllocatedVUs: envNumber(`${profile.toUpperCase()}_PRE_ALLOCATED_VUS`, 10), maxVUs: envNumber(`${profile.toUpperCase()}_MAX_VUS`, 30) };
  }

  if (profile === "stress" || profile === "spike") {
    const prefix = profile.toUpperCase();
    const defaultStages = profile === "stress"
      ? [{ target: 2, duration: "1m" }, { target: 5, duration: "1m" }, { target: 10, duration: "1m" }, { target: 20, duration: "1m" }, { target: 40, duration: "1m" }]
      : [{ target: 2, duration: "30s" }, { target: 40, duration: "10s" }, { target: 40, duration: "1m" }, { target: 2, duration: "10s" }, { target: 2, duration: "1m" }];
    return { ...base, executor: "ramping-arrival-rate", startRate: envNumber(`${prefix}_START_RATE`, 1), timeUnit: envString(`${prefix}_TIME_UNIT`, "1s"), stages: stages(prefix, defaultStages), preAllocatedVUs: envNumber(`${prefix}_PRE_ALLOCATED_VUS`, 10), maxVUs: envNumber(`${prefix}_MAX_VUS`, 80) };
  }

  if (profile === "capacity-discovery") {
    const stageDefinitionsValue = stageDefinitions("CAPACITY_DISCOVERY", [
      { id: "ramp_3", type: "transition", target: 3, duration: "2m" },
      { id: "ramp_5", type: "transition", target: 5, duration: "3m" },
      { id: "ramp_10", type: "transition", target: 10, duration: "3m" },
      { id: "ramp_20", type: "transition", target: 20, duration: "4m" },
      { id: "ramp_40", type: "transition", target: 40, duration: "4m" },
    ]);
    return {
      ...base,
      executionType: "UNCONSTRAINED LOCAL RAMP DISCOVERY",
      executor: "ramping-arrival-rate",
      startRate: envNumber("CAPACITY_DISCOVERY_START_RATE", 3),
      timeUnit: envString("CAPACITY_DISCOVERY_TIME_UNIT", "1s"),
      stages: stageDefinitionsValue.map(({ target, duration }) => ({ target, duration })),
      stageDefinitions: stageDefinitionsValue,
      preAllocatedVUs: envNumber("CAPACITY_DISCOVERY_PRE_ALLOCATED_VUS", 30),
      maxVUs: envNumber("CAPACITY_DISCOVERY_MAX_VUS", 100),
    };
  }

  if (profile === "capacity-stepped") {
    const configuredSteps = envString("CAPACITY_STEPS", "");
    const stageDefinitionsValue = configuredSteps ? stageDefinitions("CAPACITY_STEPPED", steppedRangeDefinitions()) : stageDefinitions("CAPACITY_STEPPED", [
      { id: "warmup", type: "warmup", target: 10, duration: "2m" },
      { id: "transition_20", type: "transition", target: 20, duration: "30s" },
      { id: "hold_20", type: "measurement", target: 20, duration: "3m" },
      { id: "transition_40", type: "transition", target: 40, duration: "30s" },
      { id: "hold_40", type: "measurement", target: 40, duration: "4m" },
      { id: "transition_60", type: "transition", target: 60, duration: "30s" },
      { id: "hold_60", type: "measurement", target: 60, duration: "4m" },
      { id: "transition_80", type: "transition", target: 80, duration: "30s" },
      { id: "hold_80", type: "measurement", target: 80, duration: "4m" },
    ]);
    return {
      ...base,
      name: profile,
      executionType: "UNCONSTRAINED LOCAL STEPPED CAPACITY DISCOVERY",
      executor: "ramping-arrival-rate",
      startRate: envNumber("CAPACITY_STEPPED_START_RATE", 10),
      timeUnit: envString("CAPACITY_STEPPED_TIME_UNIT", "1s"),
      stages: stageDefinitionsValue.map(({ target, duration }) => ({ target, duration })),
      stageDefinitions: stageDefinitionsValue,
      preAllocatedVUs: envNumber("CAPACITY_STEPPED_PRE_ALLOCATED_VUS", 30),
      maxVUs: envNumber("CAPACITY_STEPPED_MAX_VUS", 100),
    };
  }

  throw new Error(`Perfil no soportado: ${name}`);
}
