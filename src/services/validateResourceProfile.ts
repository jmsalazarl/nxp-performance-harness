import type { ResourceProfileDocument, ResourceProfileValidationResult, ResourceRole } from "../models/resourceProfile.types";
import { RESOURCE_PROFILE_SCHEMA_VERSION } from "../models/resourceProfile.types";

const allowedRoles = new Set<ResourceRole>(["application", "database", "frontend", "storage", "worker"]);
const allowedProfileKeys = new Set(["id", "kind", "services"]);
const allowedAllocationKeys = new Set(["cpu", "memoryMiB"]);

export function validateResourceProfileDocument(document: unknown): ResourceProfileValidationResult {
  const errors: ResourceProfileValidationResult["errors"] = [];
  if (!isRecord(document)) return invalid("document", "El documento debe ser un objeto JSON");
  if (document.schemaVersion !== RESOURCE_PROFILE_SCHEMA_VERSION) errors.push({ path: "schemaVersion", message: "Version de schema no soportada" });
  if (!Array.isArray(document.profiles) || document.profiles.length === 0) errors.push({ path: "profiles", message: "Debe existir al menos un profile" });
  if (Array.isArray(document.profiles)) {
    const ids = new Set<string>();
    document.profiles.forEach((profile, index) => {
      const path = `profiles[${index}]`;
      if (!isRecord(profile)) {
        errors.push({ path, message: "El profile debe ser un objeto" });
        return;
      }
      Object.keys(profile).filter((key) => !allowedProfileKeys.has(key)).forEach((key) => errors.push({ path: `${path}.${key}`, message: "Campo no permitido" }));
      if (typeof profile.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(profile.id)) errors.push({ path: `${path}.id`, message: "Identificador invalido" });
      if (typeof profile.id === "string" && ids.has(profile.id)) errors.push({ path: `${path}.id`, message: "Identificador duplicado" });
      if (typeof profile.id === "string") ids.add(profile.id);
      if (profile.kind !== "laboratory") errors.push({ path: `${path}.kind`, message: "El tipo debe ser laboratory" });
      if (!isRecord(profile.services) || Object.keys(profile.services).length === 0) {
        errors.push({ path: `${path}.services`, message: "Debe existir al menos un rol" });
      } else {
        Object.entries(profile.services).forEach(([role, allocation]) => {
          if (!allowedRoles.has(role as ResourceRole)) errors.push({ path: `${path}.services.${role}`, message: "Rol no permitido" });
          if (!isRecord(allocation)) {
            errors.push({ path: `${path}.services.${role}`, message: "La asignacion debe ser un objeto" });
            return;
          }
          Object.keys(allocation).filter((key) => !allowedAllocationKeys.has(key)).forEach((key) => errors.push({ path: `${path}.services.${role}.${key}`, message: "Campo no permitido" }));
          if (!isPositiveNumber(allocation.cpu)) errors.push({ path: `${path}.services.${role}.cpu`, message: "CPU debe ser positiva" });
          if (!isPositiveNumber(allocation.memoryMiB)) errors.push({ path: `${path}.services.${role}.memoryMiB`, message: "Memoria debe ser positiva" });
        });
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function parseResourceProfileDocument(value: unknown): ResourceProfileDocument {
  const result = validateResourceProfileDocument(value);
  if (!result.valid) throw new Error(result.errors.map((error) => `${error.path}: ${error.message}`).join("; "));
  return value as ResourceProfileDocument;
}

function invalid(path: string, message: string): ResourceProfileValidationResult { return { valid: false, errors: [{ path, message }] }; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isPositiveNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
