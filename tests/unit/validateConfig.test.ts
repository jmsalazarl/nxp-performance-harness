/**
 * Unit tests for validateConfig service
 * 
 * Tests the validation rules for K6 config objects.
 */

import { describe, it, expect } from "vitest";
import { 
  validateEndpoint, 
  validateTestProfile, 
  validateStage, 
  validateConfig 
} from "../../src/services/validateConfig.js";
import type { Endpoint, Config, TestProfile, Stage } from "../../src/models/config.types.js";

describe("validateEndpoint", () => {
  describe("url validation (Req 5.1)", () => {
    it("should reject empty url", () => {
      const endpoint: Endpoint = {
        url: "",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].url",
        rule: "required",
      });
    });

    it("should reject whitespace-only url", () => {
      const endpoint: Endpoint = {
        url: "   ",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].url",
        rule: "required",
      });
    });

    it("should reject relative url", () => {
      const endpoint: Endpoint = {
        url: "/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].url",
        rule: "invalid_url",
      });
    });

    it("should reject url without protocol", () => {
      const endpoint: Endpoint = {
        url: "example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].url",
        rule: "invalid_url",
      });
    });

    it("should accept valid https url", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const urlErrors = errors.filter(e => e.path === "endpoints[0].url");
      expect(urlErrors).toHaveLength(0);
    });

    it("should accept valid http url", () => {
      const endpoint: Endpoint = {
        url: "http://localhost:3000/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const urlErrors = errors.filter(e => e.path === "endpoints[0].url");
      expect(urlErrors).toHaveLength(0);
    });
  });

  describe("method validation (Req 5.2)", () => {
    it("should reject invalid method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "INVALID" as any,
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(1);
      expect(methodErrors[0]).toMatchObject({
        rule: "invalid_method",
      });
    });

    it("should accept GET method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(0);
    });

    it("should accept POST method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "POST",
        expectedStatus: 201,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(0);
    });

    it("should accept PUT method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users/1",
        method: "PUT",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(0);
    });

    it("should accept PATCH method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users/1",
        method: "PATCH",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(0);
    });

    it("should accept DELETE method", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users/1",
        method: "DELETE",
        expectedStatus: 204,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const methodErrors = errors.filter(e => e.path === "endpoints[0].method");
      expect(methodErrors).toHaveLength(0);
    });
  });

  describe("headers validation (Req 5.3)", () => {
    it("should accept valid headers object", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer <token>",
        },
        expectedStatus: 201,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const headerErrors = errors.filter(e => e.path === "endpoints[0].headers");
      expect(headerErrors).toHaveLength(0);
    });

    it("should accept undefined headers", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const headerErrors = errors.filter(e => e.path === "endpoints[0].headers");
      expect(headerErrors).toHaveLength(0);
    });

    it("should reject array as headers", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        headers: ["Content-Type", "application/json"] as any,
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const headerErrors = errors.filter(e => e.path === "endpoints[0].headers");
      expect(headerErrors).toHaveLength(1);
      expect(headerErrors[0]).toMatchObject({
        rule: "invalid_headers",
      });
    });

    it("should reject null as headers", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        headers: null as any,
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const headerErrors = errors.filter(e => e.path === "endpoints[0].headers");
      expect(headerErrors).toHaveLength(1);
      expect(headerErrors[0]).toMatchObject({
        rule: "invalid_headers",
      });
    });
  });

  describe("payload validation (Req 5.4)", () => {
    it("should accept valid JSON payload", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "POST",
        payload: {
          name: "John Doe",
          email: "john@example.com",
        },
        expectedStatus: 201,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const payloadErrors = errors.filter(e => e.path === "endpoints[0].payload");
      expect(payloadErrors).toHaveLength(0);
    });

    it("should accept nested JSON payload", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "POST",
        payload: {
          user: {
            name: "John Doe",
            address: {
              city: "New York",
              zip: "10001",
            },
          },
        },
        expectedStatus: 201,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const payloadErrors = errors.filter(e => e.path === "endpoints[0].payload");
      expect(payloadErrors).toHaveLength(0);
    });

    it("should accept undefined payload", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const payloadErrors = errors.filter(e => e.path === "endpoints[0].payload");
      expect(payloadErrors).toHaveLength(0);
    });

    it("should reject circular reference in payload", () => {
      const circular: any = { name: "test" };
      circular.self = circular;

      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "POST",
        payload: circular,
        expectedStatus: 201,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const payloadErrors = errors.filter(e => e.path === "endpoints[0].payload");
      expect(payloadErrors).toHaveLength(1);
      expect(payloadErrors[0]).toMatchObject({
        rule: "invalid_payload",
      });
    });
  });

  describe("expectedStatus validation (Req 5.5)", () => {
    it("should accept status 200", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const statusErrors = errors.filter(e => e.path === "endpoints[0].expectedStatus");
      expect(statusErrors).toHaveLength(0);
    });

    it("should accept status 100", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 100,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const statusErrors = errors.filter(e => e.path === "endpoints[0].expectedStatus");
      expect(statusErrors).toHaveLength(0);
    });

    it("should accept status 599", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 599,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const statusErrors = errors.filter(e => e.path === "endpoints[0].expectedStatus");
      expect(statusErrors).toHaveLength(0);
    });

    it("should reject status below 100", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 99,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const statusErrors = errors.filter(e => e.path === "endpoints[0].expectedStatus");
      expect(statusErrors).toHaveLength(1);
      expect(statusErrors[0]).toMatchObject({
        rule: "invalid_status",
      });
    });

    it("should reject status above 599", () => {
      const endpoint: Endpoint = {
        url: "https://example.com/api/users",
        method: "GET",
        expectedStatus: 600,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      const statusErrors = errors.filter(e => e.path === "endpoints[0].expectedStatus");
      expect(statusErrors).toHaveLength(1);
      expect(statusErrors[0]).toMatchObject({
        rule: "invalid_status",
      });
    });
  });

  describe("path generation", () => {
    it("should include correct index in path", () => {
      const endpoint: Endpoint = {
        url: "",
        method: "GET",
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 5);

      expect(errors[0].path).toContain("endpoints[5]");
    });
  });

  describe("error accumulation", () => {
    it("should accumulate multiple errors", () => {
      const endpoint: Endpoint = {
        url: "",
        method: "INVALID" as any,
        headers: null as any,
        expectedStatus: 999,
        maxRetries: 3,
        thinkTimeSeconds: 1,
      };

      const errors = validateEndpoint(endpoint, 0);

      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors.some(e => e.path === "endpoints[0].url")).toBe(true);
      expect(errors.some(e => e.path === "endpoints[0].method")).toBe(true);
      expect(errors.some(e => e.path === "endpoints[0].headers")).toBe(true);
      expect(errors.some(e => e.path === "endpoints[0].expectedStatus")).toBe(true);
    });
  });
});

describe("validateStage", () => {
  describe("duration validation (Req 5.7)", () => {
    it("should reject empty duration", () => {
      const stage: Stage = {
        duration: "",
        target: 10,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.stages[0].duration",
        rule: "required",
        message: expect.stringContaining("duration"),
      });
    });

    it("should reject whitespace-only duration", () => {
      const stage: Stage = {
        duration: "   ",
        target: 10,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.stages[0].duration",
        rule: "required",
      });
    });

    it("should accept valid duration", () => {
      const stage: Stage = {
        duration: "30s",
        target: 10,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      const durationErrors = errors.filter(e => e.path.includes("duration"));
      expect(durationErrors).toHaveLength(0);
    });
  });

  describe("target validation (Req 5.7)", () => {
    it("should reject negative target", () => {
      const stage: Stage = {
        duration: "30s",
        target: -1,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.stages[0].target",
        rule: "invalid_target",
        message: expect.stringContaining("greater than or equal to 0"),
      });
    });

    it("should accept target 0", () => {
      const stage: Stage = {
        duration: "30s",
        target: 0,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      const targetErrors = errors.filter(e => e.path.includes("target"));
      expect(targetErrors).toHaveLength(0);
    });

    it("should accept positive target", () => {
      const stage: Stage = {
        duration: "30s",
        target: 100,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      const targetErrors = errors.filter(e => e.path.includes("target"));
      expect(targetErrors).toHaveLength(0);
    });
  });

  describe("path generation", () => {
    it("should include correct stage index in path", () => {
      const stage: Stage = {
        duration: "",
        target: -1,
      };

      const errors = validateStage(stage, 3, "endpoints[2].stresstest");

      expect(errors.some(e => e.path === "endpoints[2].stresstest.stages[3].duration")).toBe(true);
      expect(errors.some(e => e.path === "endpoints[2].stresstest.stages[3].target")).toBe(true);
    });
  });

  describe("error accumulation", () => {
    it("should accumulate both duration and target errors", () => {
      const stage: Stage = {
        duration: "",
        target: -5,
      };

      const errors = validateStage(stage, 0, "endpoints[0].loadtest");

      expect(errors).toHaveLength(2);
      expect(errors.some(e => e.path.includes("duration"))).toBe(true);
      expect(errors.some(e => e.path.includes("target"))).toBe(true);
    });
  });
});

describe("validateTestProfile", () => {
  describe("stages validation (Req 5.6)", () => {
    it("should reject profile with no stages", () => {
      const profile: TestProfile = {
        stages: [],
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.stages",
        rule: "required",
        message: expect.stringContaining("at least one stage"),
      });
    });

    it("should accept profile with one stage", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(0);
    });

    it("should accept profile with multiple stages", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "2m", target: 20 },
          { duration: "30s", target: 0 },
        ],
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(0);
    });

    it("should validate each stage in the profile", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "", target: -1 },
          { duration: "1m", target: 5 },
        ],
      };

      const errors = validateTestProfile(profile, "stresstest", 1);

      // Should have errors from stage[1]
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(errors.some(e => e.path === "endpoints[1].stresstest.stages[1].duration")).toBe(true);
      expect(errors.some(e => e.path === "endpoints[1].stresstest.stages[1].target")).toBe(true);
    });
  });

  describe("thresholds validation (Req 5.8)", () => {
    it("should accept profile without thresholds", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(0);
    });

    it("should accept profile with valid thresholds", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2000"],
          http_req_failed: ["rate < 0.01"],
          waiting_time: ["p(99) < 3000"],
        },
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(0);
    });

    it("should accept custom metric keys", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          Errors: ["count < 10"],
          Total_Reqs: ["count > 0"],
          retries: ["count < 5"],
          transaction_duration: ["p(95) < 5000"],
          transactions_per_second: ["rate > 1"],
          active_vus: ["value > 0"],
        },
      };

      const errors = validateTestProfile(profile, "capacitytest", 0);

      expect(errors).toHaveLength(0);
    });

    it("should reject empty threshold expression", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2000", ""],
        },
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.thresholds.http_req_duration[1]",
        rule: "empty_threshold",
        message: expect.stringContaining("cannot be empty"),
      });
    });

    it("should reject whitespace-only threshold expression", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          http_req_failed: ["   "],
        },
      };

      const errors = validateTestProfile(profile, "stresstest", 2);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[2].stresstest.thresholds.http_req_failed[0]",
        rule: "empty_threshold",
      });
    });

    it("should reject non-array threshold value", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          http_req_duration: "p(95) < 2000" as any,
        },
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        path: "endpoints[0].loadtest.thresholds.http_req_duration",
        rule: "invalid_threshold",
        message: expect.stringContaining("must be an array"),
      });
    });

    it("should accumulate multiple threshold errors", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "30s", target: 10 },
        ],
        thresholds: {
          http_req_duration: ["", "p(95) < 2000", ""],
          http_req_failed: [""],
        },
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors.filter(e => e.rule === "empty_threshold")).toHaveLength(3);
    });
  });

  describe("path generation", () => {
    it("should use correct profile name in path", () => {
      const profile: TestProfile = {
        stages: [],
      };

      const errors = validateTestProfile(profile, "capacitytest", 3);

      expect(errors[0].path).toContain("endpoints[3].capacitytest");
    });

    it("should include all profile names correctly", () => {
      const profile: TestProfile = {
        stages: [{ duration: "", target: -1 }],
      };

      const profiles: Array<["loadtest" | "stresstest" | "capacitytest" | "stabilitytest", number]> = [
        ["loadtest", 0],
        ["stresstest", 1],
        ["capacitytest", 2],
        ["stabilitytest", 3],
      ];

      profiles.forEach(([profileName, index]) => {
        const errors = validateTestProfile(profile, profileName, index);
        expect(errors.some(e => e.path.includes(`endpoints[${index}].${profileName}`))).toBe(true);
      });
    });
  });

  describe("error accumulation", () => {
    it("should accumulate errors from stages and thresholds", () => {
      const profile: TestProfile = {
        stages: [
          { duration: "", target: -1 },
          { duration: "30s", target: 10 },
          { duration: "", target: 5 },
        ],
        thresholds: {
          http_req_duration: [""],
          http_req_failed: "not-an-array" as any,
        },
      };

      const errors = validateTestProfile(profile, "loadtest", 0);

      // Should have errors from stage[0] (2), stage[2] (1), and thresholds (2)
      expect(errors.length).toBeGreaterThanOrEqual(5);
      expect(errors.some(e => e.path.includes("stages[0]"))).toBe(true);
      expect(errors.some(e => e.path.includes("stages[2]"))).toBe(true);
      expect(errors.some(e => e.path.includes("thresholds"))).toBe(true);
    });
  });
});

describe("validateConfig", () => {
  it("should validate all endpoints", () => {
    const config: Config = {
      endpoints: [
        {
          url: "",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
        {
          url: "https://example.com/api/users",
          method: "INVALID" as any,
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some(e => e.path.includes("endpoints[0]"))).toBe(true);
    expect(result.errors.some(e => e.path.includes("endpoints[1]"))).toBe(true);
  });

  it("should return valid for correct config", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/users",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
        {
          url: "https://example.com/api/posts",
          method: "POST",
          payload: { title: "Test" },
          headers: { "Content-Type": "application/json" },
          expectedStatus: 201,
          maxRetries: 3,
          thinkTimeSeconds: 1,
        },
      ],
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate test profiles (Req 5.6, 5.7, 5.8)", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/users",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          loadtest: {
            stages: [],  // Invalid: no stages
          },
        },
        {
          url: "https://example.com/api/posts",
          method: "POST",
          expectedStatus: 201,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          stresstest: {
            stages: [
              { duration: "", target: -1 },  // Invalid: empty duration and negative target
            ],
          },
        },
        {
          url: "https://example.com/api/comments",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          capacitytest: {
            stages: [
              { duration: "30s", target: 10 },
            ],
            thresholds: {
              http_req_duration: [""],  // Invalid: empty threshold
            },
          },
        },
      ],
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    
    // Check for profile errors
    expect(result.errors.some(e => e.path.includes("loadtest.stages"))).toBe(true);
    expect(result.errors.some(e => e.path.includes("stresstest.stages[0].duration"))).toBe(true);
    expect(result.errors.some(e => e.path.includes("stresstest.stages[0].target"))).toBe(true);
    expect(result.errors.some(e => e.path.includes("capacitytest.thresholds"))).toBe(true);
  });

  it("should validate complete config with all profile types", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.com/api/users",
          method: "POST",
          payload: { name: "Test" },
          headers: { "Content-Type": "application/json" },
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
            },
          },
          stresstest: {
            stages: [
              { duration: "1m", target: 50 },
              { duration: "3m", target: 100 },
              { duration: "1m", target: 0 },
            ],
          },
          capacitytest: {
            stages: [
              { duration: "5m", target: 200 },
            ],
            thresholds: {
              waiting_time: ["p(99) < 3000"],
              Errors: ["count < 10"],
            },
          },
          stabilitytest: {
            stages: [
              { duration: "10m", target: 20 },
            ],
            thresholds: {
              Total_Reqs: ["count > 100"],
              retries: ["count < 5"],
              transaction_duration: ["p(95) < 5000"],
              transactions_per_second: ["rate > 1"],
              active_vus: ["value > 0"],
            },
          },
        },
      ],
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
