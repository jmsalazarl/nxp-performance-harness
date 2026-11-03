import { describe, it, expect } from "vitest";
import { handleSummary } from "../helpers/handleSummary";

/**
 * Unit tests para el nombrado de archivos según TEST_TYPE.
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
describe("handleSummary - nombrado por TEST_TYPE", () => {
  const sampleData = {
    metrics: {
      http_req_duration: { type: "trend", values: { avg: 100 } },
    },
    root_group: { name: "", path: "", id: "", groups: [], checks: [] },
  };

  it('genera reports/summary-loadtest.json cuando TEST_TYPE es "loadtest"', () => {
    const result = handleSummary(sampleData, "loadtest");
    expect(result).toHaveProperty("reports/summary-loadtest.json");
  });

  it('genera reports/summary-stresstest.json cuando TEST_TYPE es "stresstest"', () => {
    const result = handleSummary(sampleData, "stresstest");
    expect(result).toHaveProperty("reports/summary-stresstest.json");
  });

  it('genera reports/summary-capacitytest.json cuando TEST_TYPE es "capacitytest"', () => {
    const result = handleSummary(sampleData, "capacitytest");
    expect(result).toHaveProperty("reports/summary-capacitytest.json");
  });

  it('genera reports/summary-stabilitytest.json cuando TEST_TYPE es "stabilitytest"', () => {
    const result = handleSummary(sampleData, "stabilitytest");
    expect(result).toHaveProperty("reports/summary-stabilitytest.json");
  });

  it("genera reports/summary-unknown.json cuando TEST_TYPE no está disponible (fallback)", () => {
    const result = handleSummary(sampleData);
    expect(result).toHaveProperty("reports/summary-unknown.json");
  });
});
