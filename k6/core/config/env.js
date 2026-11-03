export function envString(name, fallback = "") {
  const value = __ENV[name];
  return value === undefined || value === "" ? fallback : value;
}

export function envNumber(name, fallback) {
  const value = Number(envString(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

export function envBoolean(name, fallback = false) {
  const value = envString(name, String(fallback)).toLowerCase();
  return ["1", "true", "yes", "y"].includes(value);
}

export function envJson(name, fallback) {
  try {
    return JSON.parse(envString(name, JSON.stringify(fallback)));
  } catch (_error) {
    return fallback;
  }
}

export function runId(project, profile) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${project}-${timestamp}-${profile}`;
}
