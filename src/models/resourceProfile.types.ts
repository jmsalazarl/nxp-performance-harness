export const RESOURCE_PROFILE_SCHEMA_VERSION = 1 as const;

export type ResourceProfileKind = "laboratory";
export type ResourceRole = "application" | "database" | "frontend" | "storage" | "worker";

export interface ResourceAllocation {
  cpu: number;
  memoryMiB: number;
}

export interface ResourceProfile {
  id: string;
  kind: ResourceProfileKind;
  services: Partial<Record<ResourceRole, ResourceAllocation>>;
}

export interface ResourceProfileDocument {
  schemaVersion: typeof RESOURCE_PROFILE_SCHEMA_VERSION;
  profiles: ResourceProfile[];
}

export interface ResourceProfileValidationError {
  path: string;
  message: string;
}

export interface ResourceProfileValidationResult {
  valid: boolean;
  errors: ResourceProfileValidationError[];
}
