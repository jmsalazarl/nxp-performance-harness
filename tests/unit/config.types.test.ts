/**
 * Basic import verification test for config.types.ts
 */
import { describe, it, expect } from "vitest";
import type {
  Config,
  Endpoint,
  HttpMethod,
  ProfileName,
  TestProfile,
  Stage,
  ValidationResult,
  ValidationError,
} from "../../src/models/config.typesls/config.types";

describe("config.types", () => {
  it("should export HttpMethod type", () => {
    const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    expect(methods).toHaveLength(5);
  });

  it("should export ProfileName type", () => {
    const profiles: ProfileName[] = [
      "loadtest",
      "stresstest",
      "capacitytest",
      "stabilitytest",
    ];
    expect(profiles).toHaveLength(4);
  });

  it("should create a valid Stage object", () => {
    const stage: Stage = {
      duration: "30s",
      target: 10,
    };
    expect(stage.duration).toBe("30s");
    expect(stage.target).toBe(10);
  });

  it("should create a valid TestProfile object", () => {
    const profile: TestProfile = {
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m", target: 10 },
      ],
      thresholds: {
        http_req_duration: ["p(95) < 2000"],
      },
    };
    expect(profile.stages).toHaveLength(2);
    expect(profile.thresholds).toBeDefined();
  });

  it("should create a valid Endpoint object", () => {
    const endpoint: Endpoint = {
      url: "https://example.test/api/resource",
      method: "POST",
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      payload: { test: "data" },
      headers: { "Content-Type": "application/json" },
      name: "Test Endpoint",
      description: "Test description",
      loadtest: {
        stages: [{ duration: "30s", target: 10 }],
      },
    };
    expect(endpoint.url).toBe("https://example.test/api/resource");
    expect(endpoint.method).toBe("POST");
  });

  it("should create a valid Config object", () => {
    const config: Config = {
      endpoints: [
        {
          url: "https://example.test/api/resource",
          method: "GET",
          expectedStatus: 200,
          maxRetries: 0,
          thinkTimeSeconds: 0,
        },
      ],
    };
    expect(config.endpoints).toHaveLength(1);
  });

  it("should create a valid ValidationError object", () => {
    const error: ValidationError = {
      path: "endpoints[0].url",
      rule: "required",
      message: "URL is required",
    };
    expect(error.path).toBe("endpoints[0].url");
    expect(error.rule).toBe("required");
  });

  it("should create a valid ValidationResult object", () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          path: "endpoints[0].method",
          rule: "invalid_method",
          message: "Method must be one of GET, POST, PUT, PATCH, DELETE",
        },
      ],
    };
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
