/**
 * Tests unitarios para buildCharts.ts
 * 
 * Valida:
 * - Construcción de serie de duración (avg, p95, p99)
 * - Construcción de serie de fallos
 * - Construcción de serie de conteos
 * - Inclusión de métricas custom
 * - Manejo de métricas ausentes
 */

import { describe, it, expect } from "vitest";
import { buildCharts } from "../../src/services/buildCharts";
import { ChartSeries } from "../../src/models/report";

describe("buildCharts", () => {
  describe("Serie de duración", () => {
    it("debería construir serie completa con avg, p95, p99", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: 150.5,
            "p(95)": 280.3,
            "p(99)": 320.8
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeDefined();
      expect(durationSeries?.values).toEqual([150.5, 280.3, 320.8]);
      expect(durationSeries?.label).toContain("Request Duration");
      expect(durationSeries?.label).toContain("Avg, P95, P99");
    });

    it("debería construir serie parcial si solo avg está disponible", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: 150.5
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeDefined();
      expect(durationSeries?.values).toEqual([150.5]);
      expect(durationSeries?.label).toContain("Avg");
      expect(durationSeries?.label).not.toContain("P95");
    });

    it("debería omitir serie de duración si no hay datos", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 1000
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeUndefined();
    });
  });

  describe("Serie de fallos", () => {
    it("debería construir serie de tasa de fallos convertida a porcentaje", () => {
      const metrics = {
        http_req_failed: {
          values: {
            rate: 0.05 // 5%
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const failedSeries = charts.find(s => s.key === "http_req_failed");
      expect(failedSeries).toBeDefined();
      expect(failedSeries?.values).toEqual([5]);
      expect(failedSeries?.label).toContain("Failed Request Rate");
      expect(failedSeries?.label).toContain("%");
    });

    it("debería manejar tasa de fallos de 0", () => {
      const metrics = {
        http_req_failed: {
          values: {
            rate: 0
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const failedSeries = charts.find(s => s.key === "http_req_failed");
      expect(failedSeries).toBeDefined();
      expect(failedSeries?.values).toEqual([0]);
    });

    it("debería omitir serie de fallos si no hay datos", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 1000
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const failedSeries = charts.find(s => s.key === "http_req_failed");
      expect(failedSeries).toBeUndefined();
    });
  });

  describe("Serie de conteos", () => {
    it("debería construir serie con requests e iterations", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 5000
          }
        },
        iterations: {
          values: {
            count: 1000
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const countSeries = charts.find(s => s.key === "counts");
      expect(countSeries).toBeDefined();
      expect(countSeries?.values).toEqual([5000, 1000]);
      expect(countSeries?.label).toContain("Total Counts");
      expect(countSeries?.label).toContain("Requests, Iterations");
    });

    it("debería construir serie parcial con solo requests", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 5000
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const countSeries = charts.find(s => s.key === "counts");
      expect(countSeries).toBeDefined();
      expect(countSeries?.values).toEqual([5000]);
      expect(countSeries?.label).toContain("Requests");
      expect(countSeries?.label).not.toContain("Iterations");
    });

    it("debería construir serie parcial con solo iterations", () => {
      const metrics = {
        iterations: {
          values: {
            count: 1000
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const countSeries = charts.find(s => s.key === "counts");
      expect(countSeries).toBeDefined();
      expect(countSeries?.values).toEqual([1000]);
      expect(countSeries?.label).toContain("Iterations");
      expect(countSeries?.label).not.toContain("Requests");
    });
  });

  describe("Métricas custom", () => {
    it("debería incluir métricas custom con valores soportados", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 1000
          }
        },
        custom_response_time: {
          values: {
            avg: 245.8,
            count: 500
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const customSeries = charts.find(s => s.key === "custom_response_time");
      expect(customSeries).toBeDefined();
      expect(customSeries?.values).toEqual([245.8, 500]);
      expect(customSeries?.label).toContain("custom_response_time");
      expect(customSeries?.label).toContain("Avg, Count");
    });

    it("debería convertir rate custom a porcentaje", () => {
      const metrics = {
        custom_success_rate: {
          values: {
            rate: 0.95
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const customSeries = charts.find(s => s.key === "custom_success_rate");
      expect(customSeries).toBeDefined();
      expect(customSeries?.values).toEqual([95]);
      expect(customSeries?.label).toContain("Rate (%)");
    });

    it("debería ignorar métricas custom sin estructura values", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 1000
          }
        },
        invalid_metric: {
          data: "some string"
        }
      };

      const charts = buildCharts(metrics);
      
      const invalidSeries = charts.find(s => s.key === "invalid_metric");
      expect(invalidSeries).toBeUndefined();
    });

    it("no debería incluir métricas estándar como custom", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 1000
          }
        },
        vus: {
          values: {
            value: 10
          }
        },
        checks: {
          values: {
            rate: 1.0
          }
        }
      };

      const charts = buildCharts(metrics);
      
      // vus y checks son métricas estándar, no deben aparecer como custom
      const vusSeries = charts.find(s => s.key === "vus");
      const checksSeries = charts.find(s => s.key === "checks");
      
      expect(vusSeries).toBeUndefined();
      expect(checksSeries).toBeUndefined();
    });
  });

  describe("Casos edge", () => {
    it("debería retornar array vacío con objeto metrics vacío", () => {
      const metrics = {};

      const charts = buildCharts(metrics);
      
      expect(charts).toEqual([]);
    });

    it("debería manejar valores nulos sin romper", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: null,
            "p(95)": 280.3
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeDefined();
      // Solo debería incluir p95, no avg porque es null
      expect(durationSeries?.values).toEqual([280.3]);
    });

    it("debería manejar valores no numéricos sin romper", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: "invalid",
            "p(95)": 280.3
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeDefined();
      // Solo debería incluir p95, no avg porque no es numérico
      expect(durationSeries?.values).toEqual([280.3]);
    });

    it("debería manejar NaN sin incluirlo en series", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: NaN,
            "p(95)": 280.3
          }
        }
      };

      const charts = buildCharts(metrics);
      
      const durationSeries = charts.find(s => s.key === "http_req_duration");
      expect(durationSeries).toBeDefined();
      // Solo debería incluir p95, no avg porque es NaN
      expect(durationSeries?.values).toEqual([280.3]);
    });
  });

  describe("Escenarios completos", () => {
    it("debería construir múltiples series desde un summary completo", () => {
      const metrics = {
        http_req_duration: {
          values: {
            avg: 150.5,
            "p(95)": 280.3,
            "p(99)": 320.8
          }
        },
        http_req_failed: {
          values: {
            rate: 0.02
          }
        },
        http_reqs: {
          values: {
            count: 5000
          }
        },
        iterations: {
          values: {
            count: 1000
          }
        },
        custom_metric: {
          values: {
            avg: 100.5
          }
        }
      };

      const charts = buildCharts(metrics);
      
      expect(charts.length).toBe(4); // duration, failed, counts, custom
      
      const keys = charts.map(c => c.key);
      expect(keys).toContain("http_req_duration");
      expect(keys).toContain("http_req_failed");
      expect(keys).toContain("counts");
      expect(keys).toContain("custom_metric");
    });

    it("debería funcionar con summary minimal", () => {
      const metrics = {
        http_reqs: {
          values: {
            count: 100
          }
        }
      };

      const charts = buildCharts(metrics);
      
      expect(charts.length).toBe(1);
      expect(charts[0].key).toBe("counts");
      expect(charts[0].values).toEqual([100]);
    });
  });
});
