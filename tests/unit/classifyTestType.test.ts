import { describe, it, expect } from "vitest";
import { classifyTestType, type TestType } from "../../src/services/classifyTestType";

describe("classifyTestType", () => {
  describe("Single keyword detection", () => {
    it("should identify loadtest when filename contains 'loadtest'", () => {
      expect(classifyTestType("summary-loadtest.json")).toBe("loadtest");
      expect(classifyTestType("loadtest-results.json")).toBe("loadtest");
      expect(classifyTestType("my_loadtest_report.json")).toBe("loadtest");
    });

    it("should identify stresstest when filename contains 'stresstest'", () => {
      expect(classifyTestType("summary-stresstest.json")).toBe("stresstest");
      expect(classifyTestType("stresstest-results.json")).toBe("stresstest");
      expect(classifyTestType("my_stresstest_report.json")).toBe("stresstest");
    });

    it("should identify capacitytest when filename contains 'capacitytest'", () => {
      expect(classifyTestType("summary-capacitytest.json")).toBe("capacitytest");
      expect(classifyTestType("capacitytest-results.json")).toBe("capacitytest");
      expect(classifyTestType("my_capacitytest_report.json")).toBe("capacitytest");
    });

    it("should identify stabilitytest when filename contains 'stabilitytest'", () => {
      expect(classifyTestType("summary-stabilitytest.json")).toBe("stabilitytest");
      expect(classifyTestType("stabilitytest-results.json")).toBe("stabilitytest");
      expect(classifyTestType("my_stabilitytest_report.json")).toBe("stabilitytest");
    });
  });

  describe("Case-insensitive matching", () => {
    it("should match keywords regardless of case", () => {
      expect(classifyTestType("LOADTEST-summary.json")).toBe("loadtest");
      expect(classifyTestType("LoadTest-summary.json")).toBe("loadtest");
      expect(classifyTestType("StressTest-summary.json")).toBe("stresstest");
      expect(classifyTestType("CAPACITYTEST-summary.json")).toBe("capacitytest");
      expect(classifyTestType("StabilityTest-summary.json")).toBe("stabilitytest");
    });
  });

  describe("Unknown classification", () => {
    it("should return 'unknown' when no keywords are present", () => {
      expect(classifyTestType("summary.json")).toBe("unknown");
      expect(classifyTestType("report-123.json")).toBe("unknown");
      expect(classifyTestType("test-results.json")).toBe("unknown");
      expect(classifyTestType("")).toBe("unknown");
    });

    it("should return 'unknown' when multiple keywords are present (ambiguity)", () => {
      expect(classifyTestType("loadtest-stresstest.json")).toBe("unknown");
      expect(classifyTestType("loadtest_and_capacitytest.json")).toBe("unknown");
      expect(classifyTestType("stresstest-stabilitytest-report.json")).toBe("unknown");
    });
  });

  describe("Edge cases", () => {
    it("should handle filenames without extension", () => {
      expect(classifyTestType("loadtest")).toBe("loadtest");
      expect(classifyTestType("stresstest")).toBe("stresstest");
      expect(classifyTestType("report")).toBe("unknown");
    });

    it("should handle filenames with unusual characters", () => {
      expect(classifyTestType("my-loadtest@2024.json")).toBe("loadtest");
      expect(classifyTestType("test_stresstest#1.json")).toBe("stresstest");
    });

    it("should handle partial keyword matches correctly", () => {
      // Keywords must be complete substrings
      expect(classifyTestType("load-test.json")).toBe("unknown");
      expect(classifyTestType("stress-test.json")).toBe("unknown");
      expect(classifyTestType("capacity-test.json")).toBe("unknown");
    });
  });
});
