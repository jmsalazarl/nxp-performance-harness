/**
 * Property-based tests for commands.service.ts
 * Tests universal properties of suggested K6 commands generation using fast-check
 * 
 * Feature: config-builder-ui
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getSuggestedCommands } from "../../src/services/commands.service.js";
import type { AppState } from "../../src/models/AppState.js";
import type { EndpointDraft } from "../../src/models/EndpointDraft.js";
import type { ProfileDraft, ProfileType } from "../../src/models/ProfileDraft.js";

/**
 * Property 15: Comandos sugeridos por perfil habilitado
 * 
 * **Validates: Requirements 6.5**
 * 
 * Para cualquier estado de configuración válido con perfiles habilitados,
 * el sistema debe mostrar exactamente un comando
 * `k6 run -e TEST_TYPE=<profile> k6/performancetest.js` por cada tipo de perfil
 * que esté habilitado en al menos un endpoint.
 */
describe("Property 15: Comandos sugeridos por perfil habilitado", () => {
  // Generador de ProfileType
  const arbProfileType = fc.constantFrom<ProfileType>(
    "loadtest",
    "stresstest",
    "capacitytest",
    "stabilitytest"
  );

  // Generador de ProfileDraft básico
  const arbProfile = fc.record({
    type: arbProfileType,
    enabled: fc.boolean(),
    stages: fc.array(
      fc.record({
        duration: fc.oneof(
          fc.nat({ max: 300 }).map((n) => `${n}s`),
          fc.nat({ max: 60 }).map((n) => `${n}m`)
        ),
        target: fc.nat({ max: 1000 }),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    thresholds: fc.array(
      fc.record({
        metric: fc.constantFrom("http_req_duration", "http_req_failed", "http_reqs"),
        expressions: fc.array(fc.constantFrom("p(95) < 2000", "avg < 500"), {
          minLength: 1,
          maxLength: 3,
        }),
      }),
      { maxLength: 3 }
    ),
  });

  // Generador de EndpointDraft con 4 perfiles (uno de cada tipo)
  const arbEndpoint: fc.Arbitrary<EndpointDraft> = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ maxLength: 200 }),
    url: fc.webUrl({ validSchemes: ["https", "http"] }),
    method: fc.constantFrom("GET", "POST", "PUT", "PATCH", "DELETE"),
    headersText: fc.constant('{"Content-Type": "application/json"}'),
    payloadText: fc.constant("{}"),
    expectedStatus: fc.integer({ min: 100, max: 599 }),
    maxRetries: fc.integer({ min: 0, max: 10 }),
    thinkTimeSeconds: fc.integer({ min: 0, max: 60 }),
    profiles: fc.tuple(
      fc.record({
        type: fc.constant<ProfileType>("loadtest"),
        enabled: fc.boolean(),
        stages: fc.array(
          fc.record({
            duration: fc.oneof(
              fc.nat({ max: 300 }).map((n) => `${n}s`),
              fc.nat({ max: 60 }).map((n) => `${n}m`)
            ),
            target: fc.nat({ max: 1000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        thresholds: fc.array(
          fc.record({
            metric: fc.constantFrom("http_req_duration", "http_req_failed"),
            expressions: fc.array(fc.constantFrom("p(95) < 2000", "avg < 500"), {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          { maxLength: 2 }
        ),
      }),
      fc.record({
        type: fc.constant<ProfileType>("stresstest"),
        enabled: fc.boolean(),
        stages: fc.array(
          fc.record({
            duration: fc.oneof(
              fc.nat({ max: 300 }).map((n) => `${n}s`),
              fc.nat({ max: 60 }).map((n) => `${n}m`)
            ),
            target: fc.nat({ max: 1000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        thresholds: fc.array(
          fc.record({
            metric: fc.constantFrom("http_req_duration", "http_req_failed"),
            expressions: fc.array(fc.constantFrom("p(95) < 2000", "avg < 500"), {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          { maxLength: 2 }
        ),
      }),
      fc.record({
        type: fc.constant<ProfileType>("capacitytest"),
        enabled: fc.boolean(),
        stages: fc.array(
          fc.record({
            duration: fc.oneof(
              fc.nat({ max: 300 }).map((n) => `${n}s`),
              fc.nat({ max: 60 }).map((n) => `${n}m`)
            ),
            target: fc.nat({ max: 1000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        thresholds: fc.array(
          fc.record({
            metric: fc.constantFrom("http_req_duration", "http_req_failed"),
            expressions: fc.array(fc.constantFrom("p(95) < 2000", "avg < 500"), {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          { maxLength: 2 }
        ),
      }),
      fc.record({
        type: fc.constant<ProfileType>("stabilitytest"),
        enabled: fc.boolean(),
        stages: fc.array(
          fc.record({
            duration: fc.oneof(
              fc.nat({ max: 300 }).map((n) => `${n}s`),
              fc.nat({ max: 60 }).map((n) => `${n}m`)
            ),
            target: fc.nat({ max: 1000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        thresholds: fc.array(
          fc.record({
            metric: fc.constantFrom("http_req_duration", "http_req_failed"),
            expressions: fc.array(fc.constantFrom("p(95) < 2000", "avg < 500"), {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          { maxLength: 2 }
        ),
      })
    ).map((profiles) => profiles as [ProfileDraft, ProfileDraft, ProfileDraft, ProfileDraft]),
  });

  // Generador de AppState
  const arbAppState: fc.Arbitrary<AppState> = fc.record({
    endpoints: fc.array(arbEndpoint, { minLength: 1, maxLength: 10 }),
    activeEndpointId: fc.oneof(fc.constant(null), fc.uuid()),
  });

  it("debe retornar exactamente un comando por cada tipo de perfil habilitado", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        const commands = getSuggestedCommands(state);

        // Recolectar manualmente los perfiles habilitados únicos
        const enabledProfileTypes = new Set<ProfileType>();
        for (const endpoint of state.endpoints) {
          for (const profile of endpoint.profiles) {
            if (profile.enabled) {
              enabledProfileTypes.add(profile.type);
            }
          }
        }

        // Debe haber exactamente un comando por perfil habilitado
        expect(commands.length).toBe(enabledProfileTypes.size);

        // Cada comando debe corresponder a un perfil habilitado
        for (const command of commands) {
          expect(command).toMatch(/^k6 run -e TEST_TYPE=\w+ k6\/performancetest\.js$/);

          // Extraer el tipo de perfil del comando
          const match = command.match(/TEST_TYPE=(\w+)/);
          expect(match).not.toBeNull();

          const profileType = match![1] as ProfileType;
          expect(enabledProfileTypes.has(profileType)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("debe retornar comandos solo para perfiles habilitados, no deshabilitados", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        const commands = getSuggestedCommands(state);

        // Recolectar perfiles deshabilitados
        const disabledProfileTypes = new Set<ProfileType>();
        const allProfilesDisabled: ProfileType[] = ["loadtest", "stresstest", "capacitytest", "stabilitytest"];
        
        for (const profileType of allProfilesDisabled) {
          const isEnabledAnywhere = state.endpoints.some((endpoint) =>
            endpoint.profiles.some((profile) => profile.type === profileType && profile.enabled)
          );
          if (!isEnabledAnywhere) {
            disabledProfileTypes.add(profileType);
          }
        }

        // Ningún comando debe referenciar perfiles completamente deshabilitados
        for (const disabledType of disabledProfileTypes) {
          const hasDisabledCommand = commands.some((cmd) =>
            cmd.includes(`TEST_TYPE=${disabledType}`)
          );
          expect(hasDisabledCommand).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("debe retornar array vacío cuando no hay perfiles habilitados", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        // Deshabilitar todos los perfiles
        const stateWithNoProfiles: AppState = {
          ...state,
          endpoints: state.endpoints.map((endpoint) => ({
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => ({
              ...profile,
              enabled: false,
            })),
          })),
        };

        const commands = getSuggestedCommands(stateWithNoProfiles);

        // No debe haber comandos cuando no hay perfiles habilitados
        expect(commands).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it("debe retornar array vacío cuando no hay endpoints", () => {
    const emptyState: AppState = {
      endpoints: [],
      activeEndpointId: null,
    };

    const commands = getSuggestedCommands(emptyState);

    expect(commands).toEqual([]);
  });

  it("debe tener formato exacto: k6 run -e TEST_TYPE=<profile> k6/performancetest.js", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        const commands = getSuggestedCommands(state);

        // Cada comando debe seguir exactamente el formato esperado
        for (const command of commands) {
          expect(command).toMatch(/^k6 run -e TEST_TYPE=(loadtest|stresstest|capacitytest|stabilitytest) k6\/performancetest\.js$/);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("debe eliminar duplicados cuando múltiples endpoints tienen el mismo perfil habilitado", () => {
    fc.assert(
      fc.property(arbProfileType, fc.integer({ min: 2, max: 5 }), (profileType, numEndpoints) => {
        // Crear estado con múltiples endpoints que tienen el mismo perfil habilitado
        const endpoints: EndpointDraft[] = [];
        
        for (let i = 0; i < numEndpoints; i++) {
          endpoints.push({
            id: `endpoint-${i}`,
            name: `Endpoint ${i}`,
            description: "",
            url: "https://example.com",
            method: "POST",
            headersText: '{"Content-Type": "application/json"}',
            payloadText: "{}",
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [
              {
                type: "loadtest",
                enabled: profileType === "loadtest",
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stresstest",
                enabled: profileType === "stresstest",
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "capacitytest",
                enabled: profileType === "capacitytest",
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
              {
                type: "stabilitytest",
                enabled: profileType === "stabilitytest",
                stages: [{ duration: "30s", target: 10 }],
                thresholds: [],
              },
            ],
          });
        }

        const state: AppState = {
          endpoints,
          activeEndpointId: null,
        };

        const commands = getSuggestedCommands(state);

        // Debe haber exactamente 1 comando, no duplicados
        expect(commands.length).toBe(1);
        expect(commands[0]).toBe(`k6 run -e TEST_TYPE=${profileType} k6/performancetest.js`);
      }),
      { numRuns: 100 }
    );
  });

  it("debe retornar comandos en orden alfabético determinista", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        const commands1 = getSuggestedCommands(state);
        const commands2 = getSuggestedCommands(state);

        // Los comandos deben ser idénticos (mismo orden)
        expect(commands1).toEqual(commands2);

        // Verificar orden alfabético por nombre de perfil
        const profileTypes = commands1.map((cmd) => {
          const match = cmd.match(/TEST_TYPE=(\w+)/);
          return match ? match[1] : "";
        });

        const sortedProfileTypes = [...profileTypes].sort();
        expect(profileTypes).toEqual(sortedProfileTypes);
      }),
      { numRuns: 100 }
    );
  });

  it("debe manejar todos los perfiles habilitados simultáneamente", () => {
    const allEnabledState: AppState = {
      endpoints: [
        {
          id: "endpoint-1",
          name: "Endpoint 1",
          description: "",
          url: "https://example.com",
          method: "POST",
          headersText: '{"Content-Type": "application/json"}',
          payloadText: "{}",
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [
            {
              type: "loadtest",
              enabled: true,
              stages: [{ duration: "30s", target: 10 }],
              thresholds: [],
            },
            {
              type: "stresstest",
              enabled: true,
              stages: [{ duration: "30s", target: 10 }],
              thresholds: [],
            },
            {
              type: "capacitytest",
              enabled: true,
              stages: [{ duration: "30s", target: 10 }],
              thresholds: [],
            },
            {
              type: "stabilitytest",
              enabled: true,
              stages: [{ duration: "30s", target: 10 }],
              thresholds: [],
            },
          ],
        },
      ],
      activeEndpointId: null,
    };

    const commands = getSuggestedCommands(allEnabledState);

    // Debe retornar exactamente 4 comandos
    expect(commands.length).toBe(4);

    // Debe contener un comando para cada perfil
    expect(commands).toContain("k6 run -e TEST_TYPE=capacitytest k6/performancetest.js");
    expect(commands).toContain("k6 run -e TEST_TYPE=loadtest k6/performancetest.js");
    expect(commands).toContain("k6 run -e TEST_TYPE=stabilitytest k6/performancetest.js");
    expect(commands).toContain("k6 run -e TEST_TYPE=stresstest k6/performancetest.js");
  });

  it("debe ser idempotente: llamar múltiples veces retorna el mismo resultado", () => {
    fc.assert(
      fc.property(arbAppState, (state) => {
        const commands1 = getSuggestedCommands(state);
        const commands2 = getSuggestedCommands(state);
        const commands3 = getSuggestedCommands(state);

        // Todas las llamadas deben retornar el mismo resultado
        expect(commands1).toEqual(commands2);
        expect(commands2).toEqual(commands3);
      }),
      { numRuns: 100 }
    );
  });

  it("debe manejar combinaciones parciales de perfiles habilitados", () => {
    fc.assert(
      fc.property(
        fc.subarray(["loadtest", "stresstest", "capacitytest", "stabilitytest"] as ProfileType[], {
          minLength: 1,
          maxLength: 4,
        }),
        (enabledTypes) => {
          const state: AppState = {
            endpoints: [
              {
                id: "endpoint-1",
                name: "Endpoint 1",
                description: "",
                url: "https://example.com",
                method: "POST",
                headersText: '{"Content-Type": "application/json"}',
                payloadText: "{}",
                expectedStatus: 200,
                maxRetries: 3,
                thinkTimeSeconds: 1,
                profiles: [
                  {
                    type: "loadtest",
                    enabled: enabledTypes.includes("loadtest"),
                    stages: [{ duration: "30s", target: 10 }],
                    thresholds: [],
                  },
                  {
                    type: "stresstest",
                    enabled: enabledTypes.includes("stresstest"),
                    stages: [{ duration: "30s", target: 10 }],
                    thresholds: [],
                  },
                  {
                    type: "capacitytest",
                    enabled: enabledTypes.includes("capacitytest"),
                    stages: [{ duration: "30s", target: 10 }],
                    thresholds: [],
                  },
                  {
                    type: "stabilitytest",
                    enabled: enabledTypes.includes("stabilitytest"),
                    stages: [{ duration: "30s", target: 10 }],
                    thresholds: [],
                  },
                ],
              },
            ],
            activeEndpointId: null,
          };

          const commands = getSuggestedCommands(state);

          // Debe haber exactamente un comando por cada perfil habilitado
          expect(commands.length).toBe(enabledTypes.length);

          // Cada tipo habilitado debe tener su comando
          for (const enabledType of enabledTypes) {
            const expectedCommand = `k6 run -e TEST_TYPE=${enabledType} k6/performancetest.js`;
            expect(commands).toContain(expectedCommand);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
