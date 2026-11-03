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
    return {
      ...base,
      executor: "ramping-arrival-rate",
      startRate: envNumber("CAPACITY_DISCOVERY_START_RATE", 3),
      timeUnit: envString("CAPACITY_DISCOVERY_TIME_UNIT", "1s"),
      stages: stages("CAPACITY_DISCOVERY", [
        { target: 3, duration: "2m" },
        { target: 5, duration: "3m" },
        { target: 10, duration: "3m" },
        { target: 20, duration: "4m" },
        { target: 40, duration: "4m" },
      ]),
      preAllocatedVUs: envNumber("CAPACITY_DISCOVERY_PRE_ALLOCATED_VUS", 30),
      maxVUs: envNumber("CAPACITY_DISCOVERY_MAX_VUS", 100),
    };
  }

  throw new Error(`Perfil no soportado: ${name}`);
}
