/**
 * Serializer Service for Config Builder UI
 * 
 * Transforms AppState (with EndpointDraft objects) into JavaScript ES module text
 * for export as config.js. Handles JSON parsing from text fields, profile filtering,
 * alphabetical key ordering, and special GET query parameter serialization.
 * 
 * Requirements satisfied:
 * - 3.5: GET method serializes payload as query params in URL
 * - 4.5: Profile stage order is preserved
 * - 4.6: Disabled profiles are omitted from output
 * - 5.5: Thresholds serialized as arrays of strings per metric
 * - 6.1: Generated output is valid ES module
 * - 6.4: Deterministic output with alphabetical keys and 2-space indentation
 */

import type { AppState } from '../models/AppState';
import type { EndpointDraft } from '../models/EndpointDraft';
import type { ProfileDraft } from '../models/ProfileDraft';

/**
 * Serializes the complete AppState into a config.js ES module string
 * 
 * Produces output in the format:
 * ```javascript
 * export default {
 *   endpoints: [
 *     { ... }
 *   ]
 * };
 * ```
 * 
 * @param state - The application state containing endpoint drafts
 * @returns JavaScript ES module text with export default
 */
export function serialize(state: AppState): string {
  const endpointsText = state.endpoints
    .map((draft) => {
      const endpointObj = serializeEndpoint(draft);
      return renderEndpointToString(endpointObj);
    })
    .join(',\n');

  return `export default {\n  endpoints: [\n${endpointsText}\n  ]\n};\n`;
}

/**
 * Serializes a single EndpointDraft into a JavaScript object representation
 * 
 * Converts draft fields to output format:
 * - Parses headersText and payloadText from JSON strings
 * - For GET method: appends payload as query params to URL
 * - Filters out disabled profiles
 * - Orders keys alphabetically for determinism
 * - Returns plain object (not string) for easier testing and composition
 * 
 * @param draft - The endpoint draft to serialize
 * @returns Plain object representation of the endpoint
 */
export function serializeEndpoint(draft: EndpointDraft): Record<string, unknown> {
  // Parse JSON text fields
  const headers = parseJsonSafe(draft.headersText);
  const payload = parseJsonSafe(draft.payloadText);

  // Build base endpoint object
  const endpoint: Record<string, unknown> = {
    description: draft.description,
    expectedStatus: draft.expectedStatus,
    headers: headers,
    maxRetries: draft.maxRetries,
    method: draft.method,
    name: draft.name,
    thinkTimeSeconds: draft.thinkTimeSeconds,
    url: draft.url,
  };

  // Special handling for GET: serialize payload as query params in URL
  if (draft.method === 'GET' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    endpoint.url = appendQueryParams(draft.url, payload as Record<string, unknown>);
    // For GET, payload is NOT included as a separate field (it's in the URL)
  } else {
    // For non-GET methods, include payload in body
    endpoint.payload = payload;
  }

  // Add only enabled profiles
  draft.profiles.forEach((profile) => {
    const serializedProfile = serializeProfile(profile);
    if (serializedProfile !== null) {
      endpoint[profile.type] = serializedProfile;
    }
  });

  // Sort keys alphabetically for determinism
  return sortObjectKeys(endpoint);
}

/**
 * Serializes a ProfileDraft into a plain object, or null if disabled
 * 
 * @param profile - The profile draft to serialize
 * @returns Plain object with stages and thresholds, or null if profile is disabled
 */
export function serializeProfile(profile: ProfileDraft): Record<string, unknown> | null {
  // Omit disabled profiles from output
  if (!profile.enabled) {
    return null;
  }

  const result: Record<string, unknown> = {
    stages: profile.stages.map((stage) => ({
      duration: stage.duration,
      target: stage.target,
    })),
  };

  // Serialize thresholds as { metricName: ["expression1", "expression2"] }
  if (profile.thresholds.length > 0) {
    const thresholdsObj: Record<string, string[]> = {};
    profile.thresholds.forEach((threshold) => {
      // If the metric already exists, concatenate the expressions.
      // Use defineProperty so "__proto__" remains a data key.
      const existingExpressions = thresholdsObj[threshold.metric];
      if (existingExpressions) {
        assignOwn(thresholdsObj, threshold.metric, [
          ...existingExpressions,
          ...threshold.expressions
        ]);
      } else {
        assignOwn(thresholdsObj, threshold.metric, [...threshold.expressions]);
      }
    });
    result.thresholds = sortObjectKeys(thresholdsObj);
  }

  return sortObjectKeys(result);
}

/**
 * Appends query parameters to a URL
 * 
 * @param baseUrl - The base URL
 * @param params - Object with key-value pairs to append as query params
 * @returns URL with appended query parameters
 */
function appendQueryParams(baseUrl: string, params: Record<string, unknown>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Safely parses a JSON string, returning the parsed object or undefined on error
 * 
 * @param text - JSON string to parse
 * @returns Parsed object or undefined
 */
function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Recursively sorts object keys alphabetically for deterministic output
 * 
 * @param obj - Object to sort
 * @returns New object with sorted keys
 */
function sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      assignOwn(sorted, key, sortObjectKeys(value as Record<string, unknown>));
    } else {
      assignOwn(sorted, key, value);
    }
  });

  return sorted as T;
}

/**
 * Converts a plain object to JavaScript code string with indentation
 * Used internally for rendering the actual JavaScript text
 * 
 * @param obj - Object to stringify
 * @param indent - Current indentation level
 * @returns JavaScript code string
 */
function stringifyWithIndent(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const innerSpaces = '  '.repeat(indent + 1);

  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }
  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    // For simple arrays (primitives), keep inline
    if (obj.every((item) => typeof item !== 'object' || item === null)) {
      return `[${obj.map((item) => stringifyWithIndent(item, 0)).join(', ')}]`;
    }
    // For complex arrays, use multi-line format
    const items = obj.map((item) => `${innerSpaces}${stringifyWithIndent(item, indent + 1)}`).join(',\n');
    return `[\n${items}\n${spaces}]`;
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    const props = entries
      .map(([key, value]) => `${innerSpaces}${serializePropertyKey(key)}: ${stringifyWithIndent(value, indent + 1)}`)
      .join(',\n');
    return `{\n${props}\n${spaces}}`;
  }

  return String(obj);
}

/**
 * Internal helper to render endpoint object as JavaScript text
 * Used by serialize() to convert plain objects to code strings
 * 
 * @param endpoint - Endpoint object (from serializeEndpoint)
 * @returns JavaScript object literal string with 4-space base indentation
 */
function renderEndpointToString(endpoint: Record<string, unknown>): string {
  const baseIndent = '    '; // 4 spaces for endpoint level (inside endpoints array)
  const lines = stringifyWithIndent(endpoint, 0).split('\n');
  return lines.map((line, index) => {
    if (index === 0) return baseIndent + line;
    return baseIndent + line;
  }).join('\n');
}

function assignOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function serializePropertyKey(key: string): string {
  if (key === '__proto__') {
    return `[${JSON.stringify(key)}]`;
  }

  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}
