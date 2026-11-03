/**
 * Example demonstrating serializeConfig usage
 * 
 * Run with: npx tsx examples/serializeConfig.example.ts
 */

import { serializeConfig } from "../src/services/serializeConfig.js";
import type { Config } from "../src/models/config.types.js";

// Example config
const config: Config = {
  endpoints: [
    {
      name: "User Registration",
      description: "Creates a new user account",
      url: "https://api.example.com/v1/users",
      method: "POST",
      payload: {
        username: "testuser",
        email: "test@example.com",
        profile: {
          firstName: "Test",
          lastName: "User",
        },
      },
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer <token>",
      },
      expectedStatus: 201,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      loadtest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "2m", target: 10 },
          { duration: "30s", target: 0 },
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2000"],
          http_req_failed: ["rate < 0.01"],
          waiting_time: ["avg < 1600"],
          Errors: ["count < 5"],
        },
      },
      stresstest: {
        stages: [
          { duration: "30s", target: 50 },
          { duration: "1m", target: 50 },
          { duration: "30s", target: 0 },
        ],
        thresholds: {
          http_req_duration: ["p(95) < 5000"],
          Errors: ["count < 20"],
        },
      },
    },
  ],
};

// Serialize the config
const output = serializeConfig(config);

// Print the output
console.log("Generated config.js:");
console.log("===================");
console.log(output);
console.log("===================");
console.log(`\nTotal lines: ${output.split("\n").length}`);
console.log(`Total characters: ${output.length}`);
