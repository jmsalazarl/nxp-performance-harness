import type {
  AnalysisAssumption,
  AnalysisInput,
  AnalysisValidationError,
  ConfidenceLevel,
} from "../models/analysis.types";

export interface AnalysisEvidenceResult {
  confidence: ConfidenceLevel;
  assumptions: AnalysisAssumption[];
  contradictions: string[];
  errors: AnalysisValidationError[];
}

export function analyzeAnalysisEvidence(analysis: AnalysisInput): AnalysisEvidenceResult {
  const assumptions = [...(analysis.assumptions ?? [])];
  const contradictions: string[] = [];
  const errors: AnalysisValidationError[] = [];
  const valuesByPath = new Map<string, string>();

  analysis.answers.forEach((answer) => {
    const serializedValue = JSON.stringify(answer.value);
    const previousValue = valuesByPath.get(answer.path);
    if (previousValue !== undefined && previousValue !== serializedValue) {
      contradictions.push(answer.path);
    } else {
      valuesByPath.set(answer.path, serializedValue);
    }

    if (answer.source !== "user") {
      assumptions.push({
        path: answer.path,
        description: `El valor se obtuvo desde ${answer.source}`,
        source: answer.source,
        confidence: answer.confidence,
      });
    }
  });

  contradictions.forEach((path) => {
    errors.push({
      path: `answers.${path}`,
      rule: "contradictory_values",
      message: "Existen valores diferentes para la misma respuesta",
    });
  });

  return {
    confidence: resolveConfidence(analysis, assumptions, contradictions),
    assumptions,
    contradictions: [...new Set(contradictions)],
    errors,
  };
}

function resolveConfidence(
  analysis: AnalysisInput,
  assumptions: AnalysisAssumption[],
  contradictions: string[]
): ConfidenceLevel {
  if (contradictions.length > 0 || assumptions.some((assumption) => assumption.confidence === "low")) return "low";
  if (analysis.references.length > 0 || assumptions.length > 0 || analysis.answers.some((answer) => answer.confidence === "medium")) return "medium";
  return "high";
}
