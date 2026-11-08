import { describe, expect, it } from "vitest";
import { classifyResourceTarget } from "../../src/services/classifyResourceTarget";
import { compareResourceProfiles } from "../../src/services/compareResourceProfiles";
import { normalizeResourceMetrics } from "../../src/services/normalizeResourceMetrics";
import { parseResourceProfileDocument, validateResourceProfileDocument } from "../../src/services/validateResourceProfile";

describe("resource sizing primitives", () => {
  it("valida el contrato generico de profiles", () => {
    const document = {
      schemaVersion: 1,
      profiles: [{
        id: "constrained-a",
        kind: "laboratory",
        services: {
          application: { cpu: 0.5, memoryMiB: 768 },
          database: { cpu: 0.5, memoryMiB: 512 },
        },
      }],
    };

    expect(validateResourceProfileDocument(document).valid).toBe(true);
    expect(parseResourceProfileDocument(document).profiles[0].id).toBe("constrained-a");
  });

  it("rechaza nombres privados, roles desconocidos y limites invalidos", () => {
    const result = validateResourceProfileDocument({
      schemaVersion: 1,
      profiles: [{
        id: "private_backend",
        kind: "cloud-small",
        services: {
          privateBackend: { cpu: 0, memoryMiB: -1, container: "private-name" },
        },
      }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(expect.arrayContaining([
      "profiles[0].id",
      "profiles[0].kind",
      "profiles[0].services.privateBackend",
      "profiles[0].services.privateBackend.cpu",
      "profiles[0].services.privateBackend.memoryMiB",
      "profiles[0].services.privateBackend.container",
    ]));
  });

  it("normaliza CPU y memoria respecto al limite efectivo", () => {
    const metrics = normalizeResourceMetrics({
      cpuPercent: { avg: 40, p95: 45, max: 50 },
      memoryMiB: { avg: 400, p95: 500, max: 600 },
      memoryLimitMiB: 768,
    }, 0.5);

    expect(metrics.cpuLimitUtilizationPercent.p95.value).toBe(90);
    expect(metrics.memoryUtilizationPercent.p95.value).toBeCloseTo(65.104, 2);
    expect(metrics.memoryHeadroomMiB.value).toBe(168);
  });

  it("no declara fallo solo por CPU al limite si no hay degradacion", () => {
    const metrics = normalizeResourceMetrics({
      cpuPercent: { avg: 45, p95: 50, max: 55 },
      memoryMiB: { avg: 400, p95: 500, max: 600 },
      memoryLimitMiB: 768,
    }, 0.5);
    const result = classifyResourceTarget({
      targetRate: 80,
      sustained: true,
      droppedIterations: 0,
      errorRatePercent: 0,
      latencyP95Ms: 10,
      latencyDegraded: false,
      restarted: false,
      oomKilled: false,
      databasePressure: false,
      hostContamination: false,
      metrics: { application: metrics },
    });

    expect(result.classification).toBe("NEAR_SATURATION");
  });

  it("clasifica saturacion cuando el limite y la degradacion coinciden", () => {
    const metrics = normalizeResourceMetrics({ cpuPercent: { avg: 90, p95: 100, max: 110 } }, 0.5);
    const result = classifyResourceTarget({
      targetRate: 160,
      sustained: true,
      droppedIterations: 12,
      errorRatePercent: 2,
      latencyP95Ms: 1500,
      latencyDegraded: true,
      restarted: false,
      oomKilled: false,
      databasePressure: false,
      hostContamination: false,
      metrics: { application: metrics },
    });

    expect(result.classification).toBe("SATURATION");
  });

  it("selecciona el profile minimo y el recomendado con headroom", () => {
    const safeMetrics = normalizeResourceMetrics({ cpuPercent: { avg: 20, p95: 25, max: 30 }, memoryMiB: { avg: 300, p95: 400, max: 450 }, memoryLimitMiB: 768 }, 0.5);
    const run = (id: string, cpu: number, classification: "SAFE" | "RESOURCE_PRESSURE") => ({
      profile: { id, kind: "laboratory" as const, services: { application: { cpu, memoryMiB: 768 } } },
      maxTestedRate: 80,
      maxSustainedRate: 80,
      maxSafeRate: classification === "SAFE" ? 80 : 40,
      firstPressure: classification === "SAFE" ? null : 80,
      firstDegradation: null,
      saturation: null,
      breakingPoint: null,
      targets: [{ targetRate: 80, sustained: true, droppedIterations: 0, errorRatePercent: 0, latencyP95Ms: 10, latencyDegraded: false, restarted: false, oomKilled: false, databasePressure: false, hostContamination: false, metrics: { application: safeMetrics }, classification, reasons: [] }],
    });
    const comparison = compareResourceProfiles([run("constrained-a", 0.5, "RESOURCE_PRESSURE"), run("constrained-b", 1, "SAFE")]);

    expect(comparison.minimumWorkingProfileByTarget["80"]).toBe("constrained-b");
    expect(comparison.recommendedProfileByTarget["80"]).toBe("constrained-b");
    expect(comparison.scopeStatus.frontend).toBe("NOT_VALIDATED");
  });
});
