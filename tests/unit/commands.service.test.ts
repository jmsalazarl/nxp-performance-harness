/**
 * Unit tests for commands.service.ts
 * Tests specific examples of K6 command generation
 */

import { describe, it, expect } from "vitest";
import { getSuggestedCommands } from "../../src/services/commands.service.js";
import type { AppState } from "../../src/models/AppState.js";

describe("commands.service", () => {
  describe("getSuggestedCommands", () => {
    it("should return empty array for empty state", () => {
      const state: AppState = {
        endpoints: [],
        activeEndpointId: null,
      };

      const commands = getSuggestedCommands(state);

      expect(commands).toEqual([]);
    });

    it("should return empty array when no profiles are enabled", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: false,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      expect(commands).toEqual([]);
    });

    it("should return one command for single enabled profile", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      expect(commands).toEqual(["k6 run -e TEST_TYPE=loadtest k6/performancetest.js"]);
    });

    it("should return multiple commands for multiple enabled profiles", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: true,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      expect(commands).toEqual([
        "k6 run -e TEST_TYPE=loadtest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stresstest k6/performancetest.js",
      ]);
    });

    it("should return all four commands when all profiles are enabled", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: true,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: true,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: true,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      expect(commands).toEqual([
        "k6 run -e TEST_TYPE=capacitytest k6/performancetest.js",
        "k6 run -e TEST_TYPE=loadtest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stabilitytest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stresstest k6/performancetest.js",
      ]);
    });

    it("should deduplicate profiles enabled across multiple endpoints", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test1",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
          {
            id: "endpoint-2",
            name: "Endpoint 2",
            description: "",
            url: "https://api.example.com/test2",
            method: "GET",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 15 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: true,
                stages: [{ duration: "60s", target: 25 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      // loadtest appears in both endpoints but should only generate one command
      expect(commands).toEqual([
        "k6 run -e TEST_TYPE=loadtest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stresstest k6/performancetest.js",
      ]);
    });

    it("should return commands in alphabetical order", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: false,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: true,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: true,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: true,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      // Should be alphabetically sorted: capacitytest, stabilitytest, stresstest
      expect(commands).toEqual([
        "k6 run -e TEST_TYPE=capacitytest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stabilitytest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stresstest k6/performancetest.js",
      ]);
    });

    it("should handle mixed enabled profiles across multiple endpoints", () => {
      const state: AppState = {
        endpoints: [
          {
            id: "endpoint-1",
            name: "Endpoint 1",
            description: "",
            url: "https://api.example.com/test1",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: true,
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 20 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 30 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 5 }],
                thresholds: [],
              },
            ],
          },
          {
            id: "endpoint-2",
            name: "Endpoint 2",
            description: "",
            url: "https://api.example.com/test2",
            method: "GET",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: false,
                stages: [{ duration: "30s", target: 15 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 25 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: true,
                stages: [{ duration: "90s", target: 35 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: false,
                stages: [{ duration: "120s", target: 8 }],
                thresholds: [],
              },
            ],
          },
          {
            id: "endpoint-3",
            name: "Endpoint 3",
            description: "",
            url: "https://api.example.com/test3",
            method: "PUT",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: false,
                stages: [{ duration: "30s", target: 12 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: false,
                stages: [{ duration: "60s", target: 22 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: false,
                stages: [{ duration: "90s", target: 32 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: true,
                stages: [{ duration: "120s", target: 6 }],
                thresholds: [],
              },
            ],
          },
        ],
        activeEndpointId: "endpoint-1",
      };

      const commands = getSuggestedCommands(state);

      // Should include loadtest (endpoint 1), capacitytest (endpoint 2), stabilitytest (endpoint 3)
      expect(commands).toEqual([
        "k6 run -e TEST_TYPE=capacitytest k6/performancetest.js",
        "k6 run -e TEST_TYPE=loadtest k6/performancetest.js",
        "k6 run -e TEST_TYPE=stabilitytest k6/performancetest.js",
      ]);
    });
  });
});
