import type { AnalysisInput } from "../models/analysis.types";
import type { TestPlan } from "../models/testPlan.types";
import type { WorkloadContract } from "../models/workloadContract.types";
import { WORKLOAD_CONTRACT_SCHEMA_VERSION } from "../models/workloadContract.types";

export async function createApprovedWorkloadContract(
  analysis: AnalysisInput,
  plan: TestPlan,
  approvedAt = new Date().toISOString()
): Promise<WorkloadContract> {
  if (analysis.status !== "draft") throw new Error("Solo se puede aprobar un analisis en borrador");
  if (!plan.canApprove) throw new Error("El plan no cumple los datos minimos para aprobarse");

  const unsignedContract: Omit<WorkloadContract, "contractDigest"> = {
    schemaVersion: WORKLOAD_CONTRACT_SCHEMA_VERSION,
    analysisId: analysis.analysisId,
    analysisVersion: analysis.version,
    status: "approved",
    profile: plan.profile,
    approvedAt,
    scenarios: structuredClone(plan.scenarios),
    stages: structuredClone(plan.stages),
    slo: structuredClone(plan.slo),
    acceptanceCriteria: [...plan.acceptanceCriteria],
    assumptions: [...plan.assumptions],
    missingData: [...plan.missingData],
    confidence: plan.confidence,
    analysisSnapshot: structuredClone({ ...analysis, status: "approved" as const }),
  };

  return {
    ...unsignedContract,
    contractDigest: await calculateDigest(unsignedContract),
  };
}

export function createNextAnalysisVersion(
  analysis: AnalysisInput,
  changes: Partial<Pick<AnalysisInput, "applicationType" | "testObjectives" | "horizon" | "journeys" | "answers" | "references" | "assumptions">>,
  updatedAt = new Date().toISOString()
): AnalysisInput {
  return {
    ...structuredClone(analysis),
    ...structuredClone(changes),
    version: analysis.version + 1,
    status: "draft",
    updatedAt,
  };
}

export function serializeWorkloadContract(contract: WorkloadContract): string {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

export async function calculateDigest(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`);
  return `{${entries.join(",")}}`;
}
