/**
 * Property-based tests for defaults.service.ts
 * Tests universal properties of default value generation using fast-check
 * 
 * Feature: config-builder-ui
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  createEndpoint,
  createStage,
} from "../../src/services/defaults.service.js";

/**
 * Property-Based Tests para Defaults de Creación (Config Builder UI)
 * 
 * Tests de propiedades universales del servicio de defaults,
 * cubriendo valores por defecto de endpoints y stages.
 */

describe("Property 12: Defaults correctos en creación", () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**
   * 
   * Para cualquier endpoint recién creado, sus valores por defecto deben ser:
   * - method: POST (Req 7.1)
   * - headersText: {"Content-Type":"application/json"} (Req 7.2)
   * - payloadText: {} (Req 7.3)
   * - expectedStatus: 200 (Req 7.4)
   * - maxRetries: 3 (Req 7.5)
   * - thinkTimeSeconds: 1 (Req 7.6)
   * - url: "" (empty) (Req 7.8)
   * - name: único incremental (ej: "Endpoint 1", "Endpoint 2", etc.)
   * - profiles: 4 perfiles deshabilitados (loadtest, stresstest, capacitytest, stabilitytest)
   * 
   * Para cualquier stage recién creado, sus defaults deben ser:
   * - duration: "30s" (Req 7.7)
   * - target: 1 (Req 7.7)
   */

  // Generador: array de nombres de endpoints existentes
  const arbExistingNames = fc.array(
    fc.string({ minLength: 1, maxLength: 50 }),
    { maxLength: 20 }
  );

  describe("createEndpoint() - Valores por defecto de request", () => {
    it("debe establecer method a POST para cualquier lista de nombres existentes", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.1: method por defecto es POST
          expect(endpoint.method).toBe("POST");
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer headersText a JSON con Content-Type para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.2: headers por defecto tienen Content-Type application/json
          expect(endpoint.headersText).toBe('{"Content-Type":"application/json"}');
          
          // Verificar que es JSON parseable a objeto
          const parsed = JSON.parse(endpoint.headersText);
          expect(parsed).toEqual({ "Content-Type": "application/json" });
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer payloadText a objeto vacío para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.3: payload por defecto es {}
          expect(endpoint.payloadText).toBe("{}");
          
          // Verificar que es JSON parseable
          const parsed = JSON.parse(endpoint.payloadText);
          expect(parsed).toEqual({});
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer expectedStatus a 200 para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.4: expectedStatus por defecto es 200
          expect(endpoint.expectedStatus).toBe(200);
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer maxRetries a 3 para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.5: maxRetries por defecto es 3
          expect(endpoint.maxRetries).toBe(3);
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer thinkTimeSeconds a 1 para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.6: thinkTimeSeconds por defecto es 1
          expect(endpoint.thinkTimeSeconds).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer url a cadena vacía para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          // Requirement 7.8: url por defecto es "" (vacía, marcada como inválida)
          expect(endpoint.url).toBe("");
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer description a cadena vacía para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);

          expect(endpoint.description).toBe("");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("createEndpoint() - Generación de nombres únicos incrementales", () => {
    it("debe generar nombre 'Endpoint 1' cuando no hay nombres existentes", () => {
      const endpoint = createEndpoint([]);

      expect(endpoint.name).toBe("Endpoint 1");
    });

    it("debe generar nombres incrementales para cualquier secuencia de creación", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 49 }), (numExisting) => {
          // Generar nombres "Endpoint 1", "Endpoint 2", ..., "Endpoint N"
          const existingNames = Array.from({ length: numExisting }, (_, i) => `Endpoint ${i + 1}`);
          
          const endpoint = createEndpoint(existingNames);
          
          // El nuevo nombre debe ser "Endpoint N+1"
          expect(endpoint.name).toBe(`Endpoint ${numExisting + 1}`);
        }),
        { numRuns: 100 }
      );
    });

    it("debe generar nombres únicos evitando colisiones con nombres existentes", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // El nombre generado NO debe estar en la lista de nombres existentes
          expect(existingNames).not.toContain(endpoint.name);
        }),
        { numRuns: 100 }
      );
    });

    it("debe generar el siguiente número disponible cuando hay huecos en la secuencia", () => {
      // Caso: "Endpoint 1", "Endpoint 3" existen, pero "Endpoint 2" no existe
      // Debe generar "Endpoint 2"
      const existingNames = ["Endpoint 1", "Endpoint 3"];
      const endpoint = createEndpoint(existingNames);
      
      expect(endpoint.name).toBe("Endpoint 2");
    });

    it("debe manejar nombres existentes en desorden y generar el primer número disponible", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 1, max: 50 }).map((n) => `Endpoint ${n}`),
            { minLength: 1, maxLength: 20 }
          ),
          (existingNames) => {
            const endpoint = createEndpoint(existingNames);
            
            // El nombre debe tener formato "Endpoint N" donde N es un entero
            expect(endpoint.name).toMatch(/^Endpoint \d+$/);
            
            // El nombre NO debe estar en la lista existente
            expect(existingNames).not.toContain(endpoint.name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("debe generar nombres consecutivos cuando se llama repetidamente con lista actualizada", () => {
      const existingNames: string[] = [];
      
      for (let i = 1; i <= 10; i++) {
        const endpoint = createEndpoint(existingNames);
        
        // Debe generar "Endpoint i"
        expect(endpoint.name).toBe(`Endpoint ${i}`);
        
        // Agregar el nombre generado a la lista para la siguiente iteración
        existingNames.push(endpoint.name);
      }
      
      // Al final, deberíamos tener "Endpoint 1" hasta "Endpoint 10"
      expect(existingNames).toEqual([
        "Endpoint 1", "Endpoint 2", "Endpoint 3", "Endpoint 4", "Endpoint 5",
        "Endpoint 6", "Endpoint 7", "Endpoint 8", "Endpoint 9", "Endpoint 10"
      ]);
    });
  });

  describe("createEndpoint() - Perfiles por defecto", () => {
    it("debe crear exactamente 4 perfiles para cualquier lista de nombres", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // Debe tener exactamente 4 perfiles
          expect(endpoint.profiles).toHaveLength(4);
        }),
        { numRuns: 100 }
      );
    });

    it("debe crear un perfil de cada tipo (loadtest, stresstest, capacitytest, stabilitytest)", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          const profileTypes = endpoint.profiles.map((p) => p.type);
          
          // Debe contener los 4 tipos de perfil
          expect(profileTypes).toContain("loadtest");
          expect(profileTypes).toContain("stresstest");
          expect(profileTypes).toContain("capacitytest");
          expect(profileTypes).toContain("stabilitytest");
          
          // No debe haber duplicados
          expect(new Set(profileTypes).size).toBe(4);
        }),
        { numRuns: 100 }
      );
    });

    it("debe crear todos los perfiles deshabilitados (enabled: false)", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // Todos los perfiles deben estar deshabilitados
          endpoint.profiles.forEach((profile) => {
            expect(profile.enabled).toBe(false);
          });
        }),
        { numRuns: 100 }
      );
    });

    it("debe crear todos los perfiles con arrays vacíos de stages y thresholds", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // Todos los perfiles deben tener stages y thresholds vacíos
          endpoint.profiles.forEach((profile) => {
            expect(profile.stages).toEqual([]);
            expect(profile.thresholds).toEqual([]);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("createEndpoint() - Propiedades estructurales", () => {
    it("debe generar un UUID válido para el id", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // El ID debe ser un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
          expect(endpoint.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }),
        { numRuns: 100 }
      );
    });

    it("debe generar IDs únicos en llamadas repetidas", () => {
      const ids = new Set<string>();
      
      // Generar 100 endpoints y recolectar sus IDs
      for (let i = 0; i < 100; i++) {
        const endpoint = createEndpoint([]);
        ids.add(endpoint.id);
      }
      
      // Todos los IDs deben ser únicos
      expect(ids.size).toBe(100);
    });

    it("debe retornar un objeto con todas las propiedades requeridas", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // Verificar que todas las propiedades requeridas existen
          expect(endpoint).toHaveProperty("id");
          expect(endpoint).toHaveProperty("name");
          expect(endpoint).toHaveProperty("description");
          expect(endpoint).toHaveProperty("url");
          expect(endpoint).toHaveProperty("method");
          expect(endpoint).toHaveProperty("headersText");
          expect(endpoint).toHaveProperty("payloadText");
          expect(endpoint).toHaveProperty("expectedStatus");
          expect(endpoint).toHaveProperty("maxRetries");
          expect(endpoint).toHaveProperty("thinkTimeSeconds");
          expect(endpoint).toHaveProperty("profiles");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("createStage() - Valores por defecto de stage", () => {
    it("debe establecer duration a '30s'", () => {
      // createStage no recibe parámetros, probar repetidamente
      fc.assert(
        fc.property(fc.constant(null), () => {
          const stage = createStage();
          
          // Requirement 7.7: duration por defecto es "30s"
          expect(stage.duration).toBe("30s");
        }),
        { numRuns: 100 }
      );
    });

    it("debe establecer target a 1", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const stage = createStage();
          
          // Requirement 7.7: target por defecto es 1
          expect(stage.target).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it("debe retornar un objeto con propiedades duration y target", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const stage = createStage();
          
          // Verificar estructura del objeto
          expect(stage).toHaveProperty("duration");
          expect(stage).toHaveProperty("target");
          expect(Object.keys(stage)).toHaveLength(2);
        }),
        { numRuns: 100 }
      );
    });

    it("debe retornar el mismo valor en llamadas repetidas (determinístico)", () => {
      const stages = Array.from({ length: 100 }, () => createStage());
      
      // Todos los stages deben ser idénticos
      stages.forEach((stage) => {
        expect(stage.duration).toBe("30s");
        expect(stage.target).toBe(1);
      });
    });
  });

  describe("Property 12 - Combinación: valores por defecto completos", () => {
    it("debe crear endpoints con todos los defaults correctos combinados", () => {
      fc.assert(
        fc.property(arbExistingNames, (existingNames) => {
          const endpoint = createEndpoint(existingNames);
          
          // Validar todos los defaults en una sola propiedad
          expect(endpoint.method).toBe("POST");
          expect(endpoint.headersText).toBe('{"Content-Type":"application/json"}');
          expect(endpoint.payloadText).toBe("{}");
          expect(endpoint.expectedStatus).toBe(200);
          expect(endpoint.maxRetries).toBe(3);
          expect(endpoint.thinkTimeSeconds).toBe(1);
          expect(endpoint.url).toBe("");
          expect(endpoint.description).toBe("");
          expect(endpoint.profiles).toHaveLength(4);
          expect(endpoint.profiles.every((p) => !p.enabled)).toBe(true);
          expect(endpoint.profiles.every((p) => p.stages.length === 0)).toBe(true);
          expect(endpoint.profiles.every((p) => p.thresholds.length === 0)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("debe mantener defaults consistentes independientemente de la lista de nombres existentes", () => {
      fc.assert(
        fc.property(arbExistingNames, arbExistingNames, (list1, list2) => {
          const endpoint1 = createEndpoint(list1);
          const endpoint2 = createEndpoint(list2);
          
          // Los defaults deben ser idénticos (excepto id y name que son únicos)
          expect(endpoint1.method).toBe(endpoint2.method);
          expect(endpoint1.headersText).toBe(endpoint2.headersText);
          expect(endpoint1.payloadText).toBe(endpoint2.payloadText);
          expect(endpoint1.expectedStatus).toBe(endpoint2.expectedStatus);
          expect(endpoint1.maxRetries).toBe(endpoint2.maxRetries);
          expect(endpoint1.thinkTimeSeconds).toBe(endpoint2.thinkTimeSeconds);
          expect(endpoint1.url).toBe(endpoint2.url);
          expect(endpoint1.description).toBe(endpoint2.description);
          expect(endpoint1.profiles.length).toBe(endpoint2.profiles.length);
        }),
        { numRuns: 100 }
      );
    });
  });
});
