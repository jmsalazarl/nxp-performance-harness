/**
 * Type definitions for K6 configuration contract
 * 
 * This module defines the TypeScript interfaces and types that represent
 * the configuration contract consumed by performancetest.js and produced
 * by the Config Builder UI.
 */

/**
 * HTTP methods supported by the K6 runner
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Test profile names supported by the runner
 */
export type ProfileName = "loadtest" | "stresstest" | "capacitytest" | "stabilitytest";

/**
 * A traffic stage within a test profile
 * Defines a time period and target virtual user count
 */
export interface Stage {
  /** Duration in K6 format (e.g., "30s", "2m") */
  duration: string;
  /** Target number of virtual users (must be >= 0) */
  target: number;
}

/**
 * A test profile defining load shape and success criteria
 * Each endpoint can have 0-4 profiles (one per ProfileName)
 */
export interface TestProfile {
  /** Traffic stages defining the load shape over time */
  stages: Stage[];
  /** Optional thresholds: metric name → array of K6 threshold expressions */
  thresholds?: Record<string, string[]>;
}

/**
 * An HTTP endpoint configuration for performance testing
 * Describes a single API transaction and its test profiles
 */
export interface Endpoint {
  /** Absolute URL of the target API */
  url: string;
  /** HTTP method */
  method: HttpMethod;
  /** Optional request body (must be valid JSON) */
  payload?: Record<string, unknown>;
  /** Optional HTTP headers */
  headers?: Record<string, string>;
  /** Expected HTTP status code (100-599) */
  expectedStatus: number;
  /** Maximum retry attempts on failure */
  maxRetries: number;
  /** Think time between iterations in seconds */
  thinkTimeSeconds: number;
  /** Optional descriptive name (metadata) */
  name?: string;
  /** Optional transaction description (metadata) */
  description?: string;
  /** Optional load test profile */
  loadtest?: TestProfile;
  /** Optional stress test profile */
  stresstest?: TestProfile;
  /** Optional capacity test profile */
  capacitytest?: TestProfile;
  /** Optional stability test profile */
  stabilitytest?: TestProfile;
}

/**
 * Root configuration object
 * The shape exported by config.js and imported by performancetest.js
 */
export interface Config {
  /** Array of endpoint configurations */
  endpoints: Endpoint[];
}

/**
 * A validation error found during config validation
 */
export interface ValidationError {
  /** JSONPath-like path to the invalid field (e.g., "endpoints[0].url") */
  path: string;
  /** Rule identifier (e.g., "required", "invalid_method") */
  rule: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Result of config validation
 */
export interface ValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
}
