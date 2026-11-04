import { describe, expect, it } from "vitest";
import { validateAnalysisInput } from "../../src/services/validateAnalysis.js";
import { ANALYSIS_SCHEMA_VERSION, type AnalysisInput } from "../../src/models/analysis.types.js";

const validAnalysis: AnalysisInput = {
  schemaVersion: ANALYSIS_SCHEMA_VERSION,
  analysisId: "analysis-001",
  version: 1,
  status: "draft",
  applicationType: "ecommerce",
  testObjectives: ["capacity", "growth"],
  horizon: {
    current: 1000,
    sixMonths: 10000,
    unit: "registered_customers",
  },
  answers: [
    {
      path: "demand.dailyActiveUsers",
      value: 250,
      unit: "users",
      source: "user",
      confidence: "medium",
    },
  ],
  references: [
    {
      title: "Referencia de comportamiento",
      url: "https://example.test/reference",
      consultedAt: "2026-11-04T00:00:00Z",
      context: "Aplicaciones web",
      supportedValue: "Rango de sesiones",
    },
  ],
  createdAt: "2026-11-04T00:00:00Z",
};

describe("validateAnalysisInput", () => {
  it("acepta un analisis versionado valido", () => {
    expect(validateAnalysisInput(validAnalysis)).toEqual({ valid: true, errors: [] });
  });

  it("permite guardar un borrador sin respuestas completas", () => {
    const draft = {
      ...validAnalysis,
      answers: [],
      references: [],
    };

    expect(validateAnalysisInput(draft).valid).toBe(true);
  });

  it("rechaza una version de esquema desconocida", () => {
    const result = validateAnalysisInput({ ...validAnalysis, schemaVersion: 2 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: "schemaVersion",
      rule: "invalid_version",
    }));
  });

  it("rechaza valores de horizonte negativos y fechas invalidas", () => {
    const result = validateAnalysisInput({
      ...validAnalysis,
      horizon: { current: -1, unit: "users" },
      createdAt: "no-es-fecha",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "horizon.current", rule: "invalid_number" }),
      expect.objectContaining({ path: "createdAt", rule: "invalid_date" }),
    ]));
  });

  it("rechaza secretos y datos sensibles en respuestas", () => {
    const result = validateAnalysisInput({
      ...validAnalysis,
      answers: [
        {
          path: "integration.apiKey",
          value: "secret-value",
          source: "user",
          confidence: "low",
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: "answers[0].path",
      rule: "sensitive_field",
    }));
  });

  it("rechaza referencias que no usan http o https", () => {
    const result = validateAnalysisInput({
      ...validAnalysis,
      references: [{
        ...validAnalysis.references[0],
        url: "file:///tmp/reference",
      }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: "references[0].url",
      rule: "invalid_url",
    }));
  });
});
