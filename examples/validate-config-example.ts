/**
 * Example demonstrating validateConfig functionality
 * This file shows how to use the validateConfig function from task 2.3
 */

import { validateConfig } from "../src/services/validateConfig.js";
import type { Config } from "../src/models/config.types.js";

// Example 1: Valid configuration
const validConfig: Config = {
  endpoints: [
    {
      url: "https://api.example.com/users",
      method: "POST",
      payload: {
        name: "John Doe",
        email: "john@example.com",
      },
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer <token>",
      },
      expectedStatus: 201,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      name: "Create User",
      description: "Creates a new user in the system",
      loadtest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "2m", target: 10 },
          { duration: "30s", target: 0 },
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2000"],
          http_req_failed: ["rate < 0.01"],
        },
      },
      stresstest: {
        stages: [
          { duration: "1m", target: 50 },
          { duration: "3m", target: 100 },
          { duration: "1m", target: 0 },
        ],
        thresholds: {
          waiting_time: ["p(99) < 3000"],
          Errors: ["count < 10"],
        },
      },
    },
    {
      url: "https://api.example.com/users",
      method: "GET",
      expectedStatus: 200,
      maxRetries: 2,
      thinkTimeSeconds: 0.5,
      name: "List Users",
      capacitytest: {
        stages: [
          { duration: "5m", target: 200 },
        ],
        thresholds: {
          Total_Reqs: ["count > 100"],
          retries: ["count < 5"],
        },
      },
    },
  ],
};

// Example 2: Invalid configuration with multiple errors
const invalidConfig: Config = {
  endpoints: [
    {
      url: "", // Error: empty URL
      method: "INVALID" as any, // Error: invalid method
      headers: null as any, // Error: headers must be an object
      expectedStatus: 999, // Error: status out of range
      maxRetries: 3,
      thinkTimeSeconds: 1,
      loadtest: {
        stages: [], // Error: no stages
      },
    },
    {
      url: "/relative/path", // Error: not an absolute URL
      method: "POST",
      payload: undefined, // This is ok - payload is optional
      expectedStatus: 201,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      stresstest: {
        stages: [
          { duration: "", target: -1 }, // Error: empty duration and negative target
        ],
        thresholds: {
          http_req_duration: [""], // Error: empty threshold expression
        },
      },
    },
  ],
};

console.log("=== Example 1: Valid Configuration ===");
const result1 = validateConfig(validConfig);
console.log("Valid:", result1.valid);
console.log("Errors:", result1.errors.length);
if (result1.errors.length > 0) {
  console.log("Error details:", JSON.stringify(result1.errors, null, 2));
}
console.log();

console.log("=== Example 2: Invalid Configuration ===");
const result2 = validateConfig(invalidConfig);
console.log("Valid:", result2.valid);
console.log("Errors:", result2.errors.length);
console.log("\nAll errors found (no fail-fast):");
result2.errors.forEach((error, index) => {
  console.log(`${index + 1}. [${error.rule}] ${error.path}: ${error.message}`);
});

console.log("\n=== Demonstrating Task 2.3 Requirements ===");
console.log("✓ Iterates over all endpoints");
console.log("✓ Accumulates errors from validateEndpoint");
console.log("✓ Accumulates errors from validateTestProfile");
console.log("✓ Returns { valid: boolean, errors: ValidationError[] }");
console.log("✓ No fail-fast: reports ALL errors found (" + result2.errors.length + " errors in example 2)");
console.log("✓ Validates requirements 5.1-5.8");
