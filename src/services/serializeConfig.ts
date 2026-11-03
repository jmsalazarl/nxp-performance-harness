/**
 * Configuration serialization service
 * 
 * Transforms validated Config objects into JavaScript ES module text.
 * Produces deterministic, human-readable output with 2-space indentation.
 */

import type { Config, Endpoint, TestProfile, Stage } from "../models/config.types.js";

/**
 * Serializes a Config object into JavaScript ES module text
 * 
 * Produces text in the format:
 * ```javascript
 * export default {
 *   endpoints: [
 *     { url: "...", method: "...", ... }
 *   ]
 * };
 * ```
 * 
 * Requirements satisfied:
 * - 1.1, 1.2: ES module shape with export default and endpoints array
 * - 1.4: Non-breaking optional metadata (name, description)
 * - 2.1-2.6: Preserves all endpoint fields
 * - 3.1-3.4, 3.6: Serializes only present profiles
 * - 4.3, 4.4, 4.5: Preserves threshold metric keys exactly
 * - 6.1-6.4: Preserves custom metrics exactly
 * 
 * @param config - The validated configuration to serialize
 * @returns JavaScript ES module text
 */
export function serializeConfig(config: Config): string {
  const endpointsText = config.endpoints
    .map((endpoint) => serializeEndpoint(endpoint))
    .join(",\n");

  return `export default {\n  endpoints: [\n${endpointsText}\n  ]\n};\n`;
}

/**
 * Serializes a single Endpoint object
 * 
 * @param endpoint - The endpoint to serialize
 * @returns JavaScript object text with 4-space base indentation
 */
function serializeEndpoint(endpoint: Endpoint): string {
  const lines: string[] = [];
  const indent = "    "; // 4 spaces for endpoint level

  lines.push(`${indent}{`);

  // Optional metadata fields first (if present)
  if (endpoint.name !== undefined) {
    lines.push(`${indent}  name: ${serializeValue(endpoint.name)},`);
  }
  if (endpoint.description !== undefined) {
    lines.push(`${indent}  description: ${serializeValue(endpoint.description)},`);
  }

  // Required HTTP transaction fields
  lines.push(`${indent}  url: ${serializeValue(endpoint.url)},`);
  lines.push(`${indent}  method: ${serializeValue(endpoint.method)},`);

  // Optional payload and headers
  if (endpoint.payload !== undefined) {
    lines.push(`${indent}  payload: ${serializeValue(endpoint.payload)},`);
  }
  if (endpoint.headers !== undefined) {
    lines.push(`${indent}  headers: ${serializeValue(endpoint.headers)},`);
  }

  // Required configuration fields
  lines.push(`${indent}  expectedStatus: ${endpoint.expectedStatus},`);
  lines.push(`${indent}  maxRetries: ${endpoint.maxRetries},`);
  lines.push(`${indent}  thinkTimeSeconds: ${endpoint.thinkTimeSeconds},`);

  // Optional test profiles (only serialize if present)
  if (endpoint.loadtest !== undefined) {
    lines.push(`${indent}  loadtest: ${serializeTestProfile(endpoint.loadtest, indent + "  ")},`);
  }
  if (endpoint.stresstest !== undefined) {
    lines.push(`${indent}  stresstest: ${serializeTestProfile(endpoint.stresstest, indent + "  ")},`);
  }
  if (endpoint.capacitytest !== undefined) {
    lines.push(`${indent}  capacitytest: ${serializeTestProfile(endpoint.capacitytest, indent + "  ")},`);
  }
  if (endpoint.stabilitytest !== undefined) {
    lines.push(`${indent}  stabilitytest: ${serializeTestProfile(endpoint.stabilitytest, indent + "  ")},`);
  }

  lines.push(`${indent}}`);

  return lines.join("\n");
}

/**
 * Serializes a TestProfile object
 * 
 * @param profile - The test profile to serialize
 * @param baseIndent - Base indentation string
 * @returns JavaScript object text (inline, not on new line)
 */
function serializeTestProfile(profile: TestProfile, baseIndent: string): string {
  const lines: string[] = [];

  lines.push("{");

  // Serialize stages
  const stagesText = profile.stages
    .map((stage) => `${baseIndent}    ${serializeStage(stage)}`)
    .join(",\n");
  lines.push(`${baseIndent}  stages: [\n${stagesText}\n${baseIndent}  ]`);

  // Serialize thresholds if present (preserves metric keys exactly)
  if (profile.thresholds !== undefined && Object.keys(profile.thresholds).length > 0) {
    lines.push(",");
    const thresholdsText = serializeThresholds(profile.thresholds, baseIndent + "  ");
    lines.push(`${baseIndent}  thresholds: ${thresholdsText}`);
  }

  lines.push(`${baseIndent}}`);

  return lines.join("\n");
}

/**
 * Serializes a Stage object
 * 
 * @param stage - The stage to serialize
 * @returns JavaScript object text (single line)
 */
function serializeStage(stage: Stage): string {
  return `{ duration: ${serializeValue(stage.duration)}, target: ${stage.target} }`;
}

/**
 * Serializes thresholds object
 * Preserves metric keys exactly as provided (built-in and custom metrics)
 * 
 * @param thresholds - The thresholds object to serialize
 * @param baseIndent - Base indentation string
 * @returns JavaScript object text
 */
function serializeThresholds(thresholds: Record<string, string[]>, baseIndent: string): string {
  const lines: string[] = [];
  const entries = Object.entries(thresholds);

  lines.push("{");

  entries.forEach(([metricKey, expressions], index) => {
    const isLast = index === entries.length - 1;
    const comma = isLast ? "" : ",";
    
    // Preserve metric key exactly while emitting valid JavaScript property syntax.
    const expressionsText = expressions
      .map((expr) => serializeValue(expr))
      .join(", ");
    
    lines.push(`${baseIndent}  ${serializePropertyKey(metricKey)}: [${expressionsText}]${comma}`);
  });

  lines.push(`${baseIndent}}`);

  return lines.join("\n");
}

/**
 * Serializes a JavaScript value to text
 * Handles strings, numbers, booleans, objects, arrays, null, undefined
 * 
 * @param value - The value to serialize
 * @returns JavaScript literal text
 */
function serializeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    // Escape quotes and special characters
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => serializeValue(item)).join(", ");
    return `[${items}]`;
  }
  if (typeof value === "object") {
    // Serialize plain objects
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return "{}";
    }
    const props = entries
      .map(([key, val]) => `${serializePropertyKey(key)}: ${serializeValue(val)}`)
      .join(", ");
    return `{ ${props} }`;
  }

  // Fallback for unexpected types
  return String(value);
}

function serializePropertyKey(key: string): string {
  if (key === "__proto__") {
    return `[${JSON.stringify(key)}]`;
  }

  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}
