/**
 * Property-Based Tests para Serialización del Config Builder UI
 * 
 * Estos tests verifican propiedades universales de correctitud del servicio
 * de serialización usando fast-check con mínimo 100 iteraciones.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { serialize, serializeEndpoint, serializeProfile } from '../../src/services/serializer.service';
import type { AppState } from '../../src/models/AppState';
import type { EndpointDraft } from '../../src/models/EndpointDraft';
import type { ProfileDraft, ProfileType } from '../../src/models/ProfileDraft';
import type { StageDraft } from '../../src/models/StageDraft';
import type { ThresholdDraft } from '../../src/models/ThresholdDraft';

/**
 * Generadores fast-check para AppState y sus componentes
 */

/**
 * Genera un HttpMethod válido aleatorio
 */
const arbHttpMethod = fc.constantFrom<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>(
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
);

/**
 * Genera un ProfileType válido aleatorio
 */
const arbProfileType = fc.constantFrom<ProfileType>(
  'loadtest',
  'stresstest',
  'capacitytest',
  'stabilitytest'
);

/**
 * Genera una duración K6 válida (e.g., "30s", "2m", "1h")
 */
const arbDuration = fc.oneof(
  fc.nat({ max: 300 }).map((n) => `${n}s`), // 0-300 segundos
  fc.nat({ max: 60 }).map((n) => `${n}m`),  // 0-60 minutos
  fc.nat({ max: 24 }).map((n) => `${n}h`)   // 0-24 horas
);

/**
 * Genera un StageDraft válido
 */
const arbStageDraft: fc.Arbitrary<StageDraft> = fc.record({
  duration: arbDuration,
  target: fc.nat({ max: 10000 }) // VUs de 0 a 10000
});

/**
 * Genera métricas K6 válidas
 */
const arbMetricKey = fc.oneof(
  // Built-in K6 metrics
  fc.constantFrom(
    'http_req_duration',
    'http_req_failed',
    'http_req_blocked',
    'http_req_connecting',
    'http_req_tls_handshaking',
    'http_req_sending',
    'http_req_waiting',
    'http_req_receiving',
    'http_reqs',
    'vus',
    'vus_max',
    'iterations'
  ),
  // Custom metrics válidas (1-128 caracteres, solo letras/dígitos/guiones bajos)
  fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/)
);

/**
 * Genera una expresión de threshold K6 válida (no vacía)
 */
const arbThresholdExpression = fc.oneof(
  // Percentiles
  fc.nat({ min: 1, max: 99 }).chain((p) =>
    fc.nat({ min: 100, max: 10000 }).map((ms) => `p(${p}) < ${ms}`)
  ),
  // Rates
  fc.double({ min: 0, max: 1, noNaN: true }).map((r) => `rate < ${r.toFixed(2)}`),
  // Averages
  fc.nat({ min: 100, max: 5000 }).map((ms) => `avg < ${ms}`),
  // Max
  fc.nat({ min: 500, max: 10000 }).map((ms) => `max < ${ms}`)
);

/**
 * Genera un ThresholdDraft válido
 */
const arbThresholdDraft: fc.Arbitrary<ThresholdDraft> = fc.record({
  metric: arbMetricKey,
  expressions: fc.array(arbThresholdExpression, { minLength: 1, maxLength: 10 })
});

/**
 * Genera un ProfileDraft válido
 * Para ser export-ready, un perfil habilitado debe tener al menos 1 stage
 */
const arbProfileDraft: fc.Arbitrary<ProfileDraft> = fc.record({
  type: arbProfileType,
  enabled: fc.boolean(),
  stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 20 }), // Mínimo 1 stage para validez
  thresholds: fc.array(arbThresholdDraft, { minLength: 0, maxLength: 10 })
});

/**
 * Genera una URL absoluta válida
 */
const arbAbsoluteUrl = fc
  .tuple(
    fc.constantFrom('http', 'https'),
    fc.domain(),
    fc.option(fc.nat({ max: 65535 }).map(String), { nil: undefined }),
    fc.option(
      fc.array(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), { maxLength: 5 }).map((parts) => '/' + parts.join('/')),
      { nil: undefined }
    )
  )
  .map(([protocol, domain, port, path]) => {
    let url = `${protocol}://${domain}`;
    if (port) url += `:${port}`;
    if (path) url += path;
    return url;
  });

/**
 * Genera un JSON object válido simple (no primitivos)
 */
const arbJsonObject: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  fc.oneof(
    fc.string({ maxLength: 50 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  ),
  { maxKeys: 10 }
);

/**
 * Genera un EndpointDraft válido
 */
const arbEndpointDraft: fc.Arbitrary<EndpointDraft> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
  url: arbAbsoluteUrl,
  method: arbHttpMethod,
  headersText: arbJsonObject.map((obj) => JSON.stringify(obj)),
  payloadText: arbJsonObject.map((obj) => JSON.stringify(obj)),
  expectedStatus: fc.integer({ min: 100, max: 599 }),
  maxRetries: fc.nat({ max: 10 }),
  thinkTimeSeconds: fc.nat({ max: 60 }),
  profiles: fc.tuple(
    arbProfileDraft.map((p) => ({ ...p, type: 'loadtest' as ProfileType })),
    arbProfileDraft.map((p) => ({ ...p, type: 'stresstest' as ProfileType })),
    arbProfileDraft.map((p) => ({ ...p, type: 'capacitytest' as ProfileType })),
    arbProfileDraft.map((p) => ({ ...p, type: 'stabilitytest' as ProfileType }))
  ).map(([load, stress, capacity, stability]) => [load, stress, capacity, stability])
});

/**
 * Genera un AppState válido con uno o más endpoints
 */
const arbAppState: fc.Arbitrary<AppState> = fc.record({
  endpoints: fc.array(arbEndpointDraft, { minLength: 1, maxLength: 50 }),
  activeEndpointId: fc.oneof(
    fc.constant(null),
    fc.uuid()
  )
});

/**
 * Verifica si un string es JavaScript sintácticamente válido
 * usando el parser de JavaScript del runtime
 */
function isValidJavaScript(code: string): boolean {
  try {
    // Usar Function constructor para verificar sintaxis
    // No ejecutamos el código, solo lo parseamos
    new Function(code);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si un string es un ES module válido
 * Debe contener "export default" y ser JavaScript sintácticamente válido
 */
function isValidESModule(code: string): boolean {
  // Debe contener export default
  if (!code.includes('export default')) {
    return false;
  }

  // Extraer la parte después de "export default" para validar sintaxis
  // Convertimos "export default X" a "const _temp = X" para validación
  const transformed = code.replace(/export\s+default\s+/, 'const _temp = ');
  
  return isValidJavaScript(transformed);
}

/**
 * Genera un ProfileDraft con enabled/disabled aleatorio
 */
const arbProfileDraftWithToggle: fc.Arbitrary<ProfileDraft> = fc.record({
  type: arbProfileType,
  enabled: fc.boolean(),
  stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 20 }),
  thresholds: fc.array(arbThresholdDraft, { minLength: 0, maxLength: 10 })
});

/**
 * Genera un EndpointDraft con perfiles habilitados y deshabilitados aleatorios
 */
const arbEndpointDraftMixedProfiles: fc.Arbitrary<EndpointDraft> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
  url: arbAbsoluteUrl,
  method: arbHttpMethod,
  headersText: arbJsonObject.map((obj) => JSON.stringify(obj)),
  payloadText: arbJsonObject.map((obj) => JSON.stringify(obj)),
  expectedStatus: fc.integer({ min: 100, max: 599 }),
  maxRetries: fc.nat({ max: 10 }),
  thinkTimeSeconds: fc.nat({ max: 60 }),
  profiles: fc.tuple(
    arbProfileDraftWithToggle.map((p) => ({ ...p, type: 'loadtest' as ProfileType })),
    arbProfileDraftWithToggle.map((p) => ({ ...p, type: 'stresstest' as ProfileType })),
    arbProfileDraftWithToggle.map((p) => ({ ...p, type: 'capacitytest' as ProfileType })),
    arbProfileDraftWithToggle.map((p) => ({ ...p, type: 'stabilitytest' as ProfileType }))
  ).map(([load, stress, capacity, stability]) => [load, stress, capacity, stability])
});

/**
 * Genera un AppState con endpoints que tienen mezcla de perfiles enabled/disabled
 */
const arbAppStateMixedProfiles: fc.Arbitrary<AppState> = fc.record({
  endpoints: fc.array(arbEndpointDraftMixedProfiles, { minLength: 1, maxLength: 50 }),
  activeEndpointId: fc.oneof(
    fc.constant(null),
    fc.uuid()
  )
});

describe('Feature: config-builder-ui, Property 10: Serialización de GET con query params', () => {
  describe('**Validates: Requirements 3.5**', () => {
    it('debe serializar método GET con payload como query params en la URL', () => {
      fc.assert(
        fc.property(
          arbJsonObject, // Objeto JSON con pares clave-valor aleatorios
          arbAbsoluteUrl,
          (payload, baseUrl) => {
            // Arrange: crear un endpoint GET con payload
            const draft: EndpointDraft = {
              id: fc.sample(fc.uuid(), 1)[0],
              name: 'Test GET Endpoint',
              description: 'GET endpoint with query params',
              url: baseUrl,
              method: 'GET',
              headersText: '{"Accept": "application/json"}',
              payloadText: JSON.stringify(payload),
              expectedStatus: 200,
              maxRetries: 3,
              thinkTimeSeconds: 1,
              profiles: []
            };

            // Act: serializar el endpoint
            const serialized = serializeEndpoint(draft);

            // Assert: la URL debe contener los query params del payload
            const serializedUrl = serialized.url as string;
            
            // Verificar que la URL base está presente
            expect(serializedUrl).toContain(baseUrl.split('?')[0]);
            
            // Verificar que cada clave-valor del payload está en la URL como query param
            Object.entries(payload).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                const url = new URL(serializedUrl);
                const paramValue = url.searchParams.get(key);
                
                // El valor debe estar presente en los query params
                expect(paramValue).toBe(String(value));
              }
            });

            // Verificar que NO hay un campo "payload" separado (está en la URL)
            expect(serialized.payload).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe preservar la URL original para métodos POST/PUT/PATCH/DELETE con payload', () => {
      fc.assert(
        fc.property(
          arbJsonObject,
          arbAbsoluteUrl,
          fc.constantFrom<'POST' | 'PUT' | 'PATCH' | 'DELETE'>('POST', 'PUT', 'PATCH', 'DELETE'),
          (payload, baseUrl, method) => {
            // Arrange: crear un endpoint con método no-GET
            const draft: EndpointDraft = {
              id: fc.sample(fc.uuid(), 1)[0],
              name: `Test ${method} Endpoint`,
              description: `${method} endpoint with payload`,
              url: baseUrl,
              method: method,
              headersText: '{"Content-Type": "application/json"}',
              payloadText: JSON.stringify(payload),
              expectedStatus: 200,
              maxRetries: 3,
              thinkTimeSeconds: 1,
              profiles: []
            };

            // Act: serializar el endpoint
            const serialized = serializeEndpoint(draft);

            // Assert: la URL debe permanecer sin cambios
            expect(serialized.url).toBe(baseUrl);
            
            // El payload debe estar como campo separado (no en la URL)
            expect(serialized.payload).toBeDefined();
            expect(serialized.payload).toEqual(payload);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe manejar payload vacío en GET sin modificar la URL', () => {
      fc.assert(
        fc.property(
          arbAbsoluteUrl,
          (baseUrl) => {
            // Arrange: crear un endpoint GET con payload vacío
            const draft: EndpointDraft = {
              id: fc.sample(fc.uuid(), 1)[0],
              name: 'Test GET Endpoint Empty',
              description: 'GET endpoint without payload',
              url: baseUrl,
              method: 'GET',
              headersText: '{"Accept": "application/json"}',
              payloadText: '{}',
              expectedStatus: 200,
              maxRetries: 3,
              thinkTimeSeconds: 1,
              profiles: []
            };

            // Act: serializar el endpoint
            const serialized = serializeEndpoint(draft);

            // Assert: la URL no debe tener query params (pero puede estar normalizada con /)
            const serializedUrl = serialized.url as string;
            const url = new URL(serializedUrl);
            
            // Verificar que no hay query params
            expect(url.searchParams.toString()).toBe('');
            
            // Verificar que la URL base (sin query string) es la misma que la original normalizada
            const expectedUrl = new URL(baseUrl);
            expect(url.origin + url.pathname).toBe(expectedUrl.origin + expectedUrl.pathname);
            
            // No debe haber campo payload
            expect(serialized.payload).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe codificar correctamente caracteres especiales en query params', () => {
      fc.assert(
        fc.property(
          arbAbsoluteUrl,
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 50 }),
            special: fc.constantFrom('hello world', 'test@example.com', 'a+b=c', '50%')
          }),
          (baseUrl, payload) => {
            // Arrange: crear un endpoint GET con caracteres especiales
            const draft: EndpointDraft = {
              id: fc.sample(fc.uuid(), 1)[0],
              name: 'Test GET Special Chars',
              description: 'GET with special characters',
              url: baseUrl,
              method: 'GET',
              headersText: '{}',
              payloadText: JSON.stringify(payload),
              expectedStatus: 200,
              maxRetries: 3,
              thinkTimeSeconds: 1,
              profiles: []
            };

            // Act: serializar el endpoint
            const serialized = serializeEndpoint(draft);

            // Assert: verificar que los valores están correctamente codificados
            const url = new URL(serialized.url as string);
            
            Object.entries(payload).forEach(([key, value]) => {
              const paramValue = url.searchParams.get(key);
              expect(paramValue).toBe(String(value));
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Feature: config-builder-ui, Property 4: Serialización produce JavaScript sintácticamente válido', () => {
  describe('**Validates: Requirements 6.1**', () => {
    it('debe producir JavaScript ES module sintácticamente válido para cualquier AppState válido', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Act: serializar el estado
          const serialized = serialize(state);

          // Assert: el resultado debe ser un ES module sintácticamente válido
          expect(serialized).toBeTruthy();
          expect(typeof serialized).toBe('string');
          expect(serialized.length).toBeGreaterThan(0);
          
          // Verificar que contiene la estructura esperada
          expect(serialized).toContain('export default');
          expect(serialized).toContain('endpoints:');
          
          // Verificar que es sintácticamente válido
          const isValid = isValidESModule(serialized);
          
          if (!isValid) {
            // Si falla, mostrar el código generado para debug
            console.error('Código JavaScript inválido generado:');
            console.error(serialized);
          }
          
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('debe producir salida que contiene exactamente "export default" seguido de objeto', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          const serialized = serialize(state);
          
          // Verificar que la estructura es "export default { ... };"
          expect(serialized).toMatch(/^export default \{[\s\S]*\};\s*$/);
        }),
        { numRuns: 100 }
      );
    });

    it('debe producir salida con array de endpoints no vacío para estados con endpoints', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          const serialized = serialize(state);
          
          // Debe contener endpoints array
          expect(serialized).toContain('endpoints: [');
          
          // Si hay endpoints, el array no debe estar vacío
          if (state.endpoints.length > 0) {
            expect(serialized).toMatch(/endpoints: \[[\s\S]+\]/);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('debe generar código que puede ser evaluado sin errores de sintaxis', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          const serialized = serialize(state);
          
          // Intentar parsear como módulo transformando a statement válido
          const transformed = serialized.replace(/export\s+default\s+/, 'const _config = ');
          
          let parseError = null;
          try {
            new Function(transformed);
          } catch (error) {
            parseError = error;
          }
          
          if (parseError) {
            console.error('Error de parseo:', parseError);
            console.error('Código generado:', serialized);
            console.error('Código transformado:', transformed);
          }
          
          expect(parseError).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });
});

describe('Feature: config-builder-ui, Property 9: El orden de stages se preserva en la serialización', () => {
  describe('**Validates: Requirements 4.5**', () => {
    it('debe preservar el orden exacto de stages en un perfil habilitado', () => {
      fc.assert(
        fc.property(
          // Generar un perfil habilitado con múltiples stages
          fc.record({
            type: arbProfileType,
            enabled: fc.constant(true), // Siempre habilitado para verificar serialización
            stages: fc.array(arbStageDraft, { minLength: 2, maxLength: 20 }), // Al menos 2 para verificar orden
            thresholds: fc.array(arbThresholdDraft, { minLength: 0, maxLength: 10 })
          }),
          (profile: ProfileDraft) => {
            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert: el perfil debe serializarse (no null porque está habilitado)
            expect(serialized).not.toBeNull();
            
            if (serialized) {
              // Verificar que tiene la propiedad stages
              expect(serialized).toHaveProperty('stages');
              expect(Array.isArray(serialized.stages)).toBe(true);
              
              const serializedStages = serialized.stages as Array<{ duration: string; target: number }>;
              
              // Verificar que el número de stages es el mismo
              expect(serializedStages.length).toBe(profile.stages.length);
              
              // Verificar que el orden se preserva comparando cada stage en su posición
              profile.stages.forEach((originalStage, index) => {
                expect(serializedStages[index].duration).toBe(originalStage.duration);
                expect(serializedStages[index].target).toBe(originalStage.target);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe preservar el orden de stages después de cualquier permutación', () => {
      fc.assert(
        fc.property(
          // Generar un array de stages y luego permutarlo
          fc.array(arbStageDraft, { minLength: 3, maxLength: 10 }).chain((originalStages) =>
            // Generar una permutación aleatoria del array
            fc.shuffledSubarray(originalStages, { minLength: originalStages.length, maxLength: originalStages.length }).map((permutedStages) => ({
              original: originalStages,
              permuted: permutedStages as StageDraft[]
            }))
          ),
          ({ permuted }) => {
            // Crear un perfil habilitado con los stages permutados
            const profile: ProfileDraft = {
              type: 'loadtest',
              enabled: true,
              stages: permuted,
              thresholds: []
            };

            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert: verificar que el orden de los stages permutados se preserva
            expect(serialized).not.toBeNull();
            
            if (serialized) {
              const serializedStages = serialized.stages as Array<{ duration: string; target: number }>;
              
              expect(serializedStages.length).toBe(permuted.length);
              
              // Verificar que cada stage está en la posición correcta según la permutación
              permuted.forEach((stage, index) => {
                expect(serializedStages[index].duration).toBe(stage.duration);
                expect(serializedStages[index].target).toBe(stage.target);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe preservar el orden de stages en serialización completa de endpoint', () => {
      fc.assert(
        fc.property(
          arbEndpointDraft,
          (endpoint) => {
            // Modificar el endpoint para tener al menos un perfil habilitado con múltiples stages
            const modifiedEndpoint: EndpointDraft = {
              ...endpoint,
              profiles: endpoint.profiles.map((profile, index) => {
                // Habilitar el primer perfil con al menos 2 stages
                if (index === 0) {
                  return {
                    ...profile,
                    enabled: true,
                    stages: profile.stages.length >= 2 ? profile.stages : [
                      { duration: '30s', target: 10 },
                      { duration: '1m', target: 50 },
                      { duration: '30s', target: 0 }
                    ]
                  };
                }
                return profile;
              })
            };

            // Act: serializar el endpoint completo
            const serialized = serializeEndpoint(modifiedEndpoint);

            // Assert: verificar que el primer perfil habilitado mantiene el orden de stages
            const firstProfile = modifiedEndpoint.profiles[0];
            const profileKey = firstProfile.type;
            
            expect(serialized).toHaveProperty(profileKey);
            
            const serializedProfile = serialized[profileKey] as Record<string, unknown>;
            expect(serializedProfile).toHaveProperty('stages');
            
            const serializedStages = serializedProfile.stages as Array<{ duration: string; target: number }>;
            
            // Verificar orden preservado
            firstProfile.stages.forEach((stage, index) => {
              expect(serializedStages[index].duration).toBe(stage.duration);
              expect(serializedStages[index].target).toBe(stage.target);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe preservar el orden de stages en la serialización completa del AppState', () => {
      fc.assert(
        fc.property(
          // Generar un AppState con al menos un perfil habilitado
          arbAppState.map((state): AppState => ({
            ...state,
            endpoints: state.endpoints.map((endpoint, index) => {
              // Asegurar que al menos el primer endpoint tiene un perfil habilitado con múltiples stages
              if (index === 0) {
                return {
                  ...endpoint,
                  profiles: endpoint.profiles.map((profile, profileIndex) => {
                    // Habilitar el primer perfil con al menos 2 stages
                    if (profileIndex === 0) {
                      return {
                        ...profile,
                        enabled: true,
                        stages: profile.stages.length >= 2 ? profile.stages : [
                          { duration: '30s', target: 10 },
                          { duration: '1m', target: 50 },
                          { duration: '30s', target: 0 }
                        ]
                      };
                    }
                    return profile;
                  })
                };
              }
              return endpoint;
            })
          })),
          (state) => {
            // Act: serializar cada endpoint individualmente (más simple y directo)
            state.endpoints.forEach((endpoint) => {
              const serialized = serializeEndpoint(endpoint);

              // Verificar que cada perfil habilitado mantiene el orden de stages
              endpoint.profiles.forEach((profile) => {
                if (profile.enabled && profile.stages.length > 0) {
                  const profileKey = profile.type;
                  
                  // Verificar que el perfil existe en la salida
                  expect(serialized).toHaveProperty(profileKey);
                  
                  const serializedProfile = serialized[profileKey] as Record<string, unknown>;
                  expect(serializedProfile).toHaveProperty('stages');
                  
                  const serializedStages = serializedProfile.stages as Array<{ duration: string; target: number }>;
                  
                  // Verificar que el orden se preserva
                  expect(serializedStages.length).toBe(profile.stages.length);
                  
                  profile.stages.forEach((stage, stageIndex) => {
                    expect(serializedStages[stageIndex].duration).toBe(stage.duration);
                    expect(serializedStages[stageIndex].target).toBe(stage.target);
                  });
                }
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Feature: config-builder-ui, Property 6: Identidad entre preview y download', () => {
  describe('**Validates: Requirements 6.2**', () => {
    it('debe producir contenido byte-por-byte idéntico en múltiples serializaciones del mismo estado', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Act: serializar el mismo estado dos veces (simulando preview y download)
          const preview = serialize(state);
          const download = serialize(state);

          // Assert: ambos resultados deben ser idénticos byte-por-byte
          expect(preview).toBe(download);
          expect(preview.length).toBe(download.length);
          
          // Verificación adicional: comparar carácter por carácter
          for (let i = 0; i < preview.length; i++) {
            if (preview[i] !== download[i]) {
              console.error(`Diferencia en posición ${i}:`);
              console.error(`Preview: "${preview.substring(i - 10, i + 10)}"`);
              console.error(`Download: "${download.substring(i - 10, i + 10)}"`);
              expect(preview[i]).toBe(download[i]);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('debe producir el mismo hash para múltiples serializaciones consecutivas', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Act: serializar el estado tres veces
          const first = serialize(state);
          const second = serialize(state);
          const third = serialize(state);

          // Assert: todos deben ser idénticos
          expect(first).toBe(second);
          expect(second).toBe(third);
          expect(first).toBe(third);
          
          // Verificar que tienen exactamente el mismo contenido
          const uniqueValues = new Set([first, second, third]);
          expect(uniqueValues.size).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('debe producir contenido idéntico independientemente del momento de serialización', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Act: serializar inmediatamente
          const immediate = serialize(state);
          
          // Simular paso de tiempo (aunque no debería afectar)
          // La serialización no debe incluir timestamps ni datos volátiles
          
          // Serializar de nuevo después de "tiempo"
          const delayed = serialize(state);

          // Assert: el contenido debe ser completamente idéntico
          expect(immediate).toBe(delayed);
          
          // Verificar que no hay timestamps, UUIDs generados, o datos aleatorios
          // El contenido debe ser puramente determinista basado en el estado de entrada
          expect(immediate).not.toMatch(/\d{4}-\d{2}-\d{2}/); // No fechas ISO
          expect(immediate).not.toMatch(/\d{13}/); // No timestamps en ms
        }),
        { numRuns: 100 }
      );
    });

    it('debe permitir que preview y download sean intercambiables sin pérdida de información', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Arrange: simular flujo de usuario
          // 1. Usuario visualiza preview
          const previewContent = serialize(state);
          
          // 2. Usuario decide descargar
          const downloadContent = serialize(state);
          
          // Assert: lo que vio en preview es exactamente lo que descarga
          expect(previewContent).toBe(downloadContent);
          
          // No debe haber sorpresas: el archivo descargado contiene
          // exactamente lo que el usuario revisó en la vista previa
          expect(previewContent.length).toBe(downloadContent.length);
          
          // Verificar que ambos son válidos y tienen la misma estructura
          expect(previewContent).toContain('export default');
          expect(downloadContent).toContain('export default');
          expect(previewContent).toContain('endpoints:');
          expect(downloadContent).toContain('endpoints:');
        }),
        { numRuns: 100 }
      );
    });

    it('debe mantener identidad incluso con estados complejos que incluyen perfiles y thresholds', () => {
      fc.assert(
        fc.property(arbAppState, (state) => {
          // Este test verifica que la identidad se mantiene incluso cuando:
          // - Hay múltiples endpoints
          // - Algunos perfiles están habilitados y otros deshabilitados
          // - Hay thresholds con múltiples expresiones
          // - Hay stages con orden específico
          
          const firstSerialization = serialize(state);
          const secondSerialization = serialize(state);

          // Assert: la complejidad del estado no debe afectar la identidad
          expect(firstSerialization).toBe(secondSerialization);
          
          // Verificar que todos los elementos estructurales están presentes consistentemente
          const countOccurrences = (str: string, substr: string): number => {
            return (str.match(new RegExp(substr, 'g')) || []).length;
          };
          
          // El número de apariciones de palabras clave estructurales debe ser idéntico
          expect(countOccurrences(firstSerialization, 'stages:')).toBe(
            countOccurrences(secondSerialization, 'stages:')
          );
          expect(countOccurrences(firstSerialization, 'thresholds:')).toBe(
            countOccurrences(secondSerialization, 'thresholds:')
          );
          expect(countOccurrences(firstSerialization, 'duration:')).toBe(
            countOccurrences(secondSerialization, 'duration:')
          );
          expect(countOccurrences(firstSerialization, 'target:')).toBe(
            countOccurrences(secondSerialization, 'target:')
          );
        }),
        { numRuns: 100 }
      );
    });
  });
});


describe('Feature: config-builder-ui, Property 13: Thresholds se serializan como arrays de strings', () => {
  describe('**Validates: Requirements 5.5**', () => {
    it('debe serializar thresholds como objeto con métricas como claves y arrays de strings como valores', () => {
      fc.assert(
        fc.property(
          // Generar un perfil habilitado con thresholds
          fc.record({
            type: arbProfileType,
            enabled: fc.constant(true), // Siempre habilitado para verificar serialización
            stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 5 }),
            thresholds: fc.array(arbThresholdDraft, { minLength: 1, maxLength: 10 })
          }),
          (profile: ProfileDraft) => {
            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert: el perfil debe serializarse (no null porque está habilitado)
            expect(serialized).not.toBeNull();
            
            if (serialized && profile.thresholds.length > 0) {
              // Verificar que tiene la propiedad thresholds
              expect(serialized).toHaveProperty('thresholds');
              
              const serializedThresholds = serialized.thresholds as Record<string, string[]>;
              expect(serializedThresholds).toBeDefined();
              expect(typeof serializedThresholds).toBe('object');
              expect(Array.isArray(serializedThresholds)).toBe(false);

              // Verificar que cada expresión de cada threshold está presente en la salida
              profile.thresholds.forEach((threshold) => {
                // La métrica debe existir como clave
                expect(serializedThresholds).toHaveProperty(threshold.metric);
                
                // El valor debe ser un array de strings
                const expressions = serializedThresholds[threshold.metric];
                expect(Array.isArray(expressions)).toBe(true);
                
                // Cada expresión del threshold debe estar presente en el array serializado
                threshold.expressions.forEach((expr) => {
                  expect(expressions).toContain(expr);
                  expect(typeof expr).toBe('string');
                });
              });

              // Verificar que el número total de expresiones es correcto
              // Si hay thresholds duplicados (misma métrica), las expresiones se concatenan
              Object.keys(serializedThresholds).forEach((metric) => {
                const allExpressionsForMetric = profile.thresholds
                  .filter(t => t.metric === metric)
                  .flatMap(t => t.expressions);
                
                const serializedExpressionsForMetric = serializedThresholds[metric];
                expect(serializedExpressionsForMetric.length).toBe(allExpressionsForMetric.length);
              });

              // Verificar que el formato coincide con el esperado por K6
              // K6 espera: { "metricName": ["expr1", "expr2"] }
              Object.entries(serializedThresholds).forEach(([metricName, expressions]) => {
                // Cada clave debe ser un string (nombre de métrica)
                expect(typeof metricName).toBe('string');
                expect(metricName.length).toBeGreaterThan(0);
                
                // Cada valor debe ser un array de strings (expresiones)
                expect(Array.isArray(expressions)).toBe(true);
                expect(expressions.length).toBeGreaterThan(0);
                expressions.forEach((expr) => {
                  expect(typeof expr).toBe('string');
                  expect(expr.length).toBeGreaterThan(0);
                });
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe omitir thresholds completamente cuando un perfil habilitado no tiene thresholds', () => {
      fc.assert(
        fc.property(
          // Generar un perfil habilitado sin thresholds
          fc.record({
            type: arbProfileType,
            enabled: fc.constant(true),
            stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 5 }),
            thresholds: fc.constant([]) // Sin thresholds
          }),
          (profile: ProfileDraft) => {
            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert: el perfil debe serializarse pero sin propiedad thresholds
            expect(serialized).not.toBeNull();
            
            if (serialized) {
              // No debe tener la propiedad thresholds si el array está vacío
              expect(serialized).not.toHaveProperty('thresholds');
              
              // Pero sí debe tener stages
              expect(serialized).toHaveProperty('stages');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe serializar correctamente múltiples métricas con múltiples expresiones cada una', () => {
      fc.assert(
        fc.property(
          // Generar un perfil con múltiples thresholds (múltiples métricas)
          fc.record({
            type: arbProfileType,
            enabled: fc.constant(true),
            stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 3 }),
            thresholds: fc.array(
              fc.record({
                metric: arbMetricKey,
                expressions: fc.array(arbThresholdExpression, { minLength: 2, maxLength: 10 }) // Mínimo 2 expresiones
              }),
              { minLength: 2, maxLength: 8 } // Mínimo 2 métricas
            )
          }),
          (profile: ProfileDraft) => {
            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert
            expect(serialized).not.toBeNull();
            
            if (serialized) {
              expect(serialized).toHaveProperty('thresholds');
              
              const serializedThresholds = serialized.thresholds as Record<string, string[]>;
              
              // Verificar que cada métrica tiene su array de expresiones
              profile.thresholds.forEach((threshold) => {
                expect(serializedThresholds).toHaveProperty(threshold.metric);
                
                const expressions = serializedThresholds[threshold.metric];
                
                // Verificar que es un array
                expect(Array.isArray(expressions)).toBe(true);
                
                // Verificar que todas las expresiones del threshold están presentes
                threshold.expressions.forEach((expr) => {
                  expect(expressions).toContain(expr);
                });
              });

              // Verificar que el número total de expresiones por métrica es correcto
              Object.keys(serializedThresholds).forEach((metric) => {
                const allExpressionsForMetric = profile.thresholds
                  .filter(t => t.metric === metric)
                  .flatMap(t => t.expressions);
                
                const serializedExpressionsForMetric = serializedThresholds[metric];
                expect(serializedExpressionsForMetric.length).toBe(allExpressionsForMetric.length);
              });

              // Verificar que el número de métricas serializadas es correcto
              const uniqueMetrics = new Set(profile.thresholds.map(t => t.metric));
              expect(Object.keys(serializedThresholds).length).toBe(uniqueMetrics.size);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe agrupar expresiones de la misma métrica en un solo array', () => {
      fc.assert(
        fc.property(
          arbMetricKey,
          fc.array(arbThresholdExpression, { minLength: 2, maxLength: 5 }),
          (metricName, expressions) => {
            // Arrange: crear un perfil con múltiples thresholds para la misma métrica
            // Dividir las expresiones en dos grupos para simular múltiples ThresholdDraft
            const midPoint = Math.ceil(expressions.length / 2);
            const firstGroup = expressions.slice(0, midPoint);
            const secondGroup = expressions.slice(midPoint);

            const profile: ProfileDraft = {
              type: 'loadtest',
              enabled: true,
              stages: [{ duration: '30s', target: 10 }],
              thresholds: [
                { metric: metricName, expressions: firstGroup },
                { metric: metricName, expressions: secondGroup }
              ]
            };

            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert: debe haber solo una entrada para la métrica
            expect(serialized).not.toBeNull();
            
            if (serialized) {
              expect(serialized).toHaveProperty('thresholds');
              
              const serializedThresholds = serialized.thresholds as Record<string, string[]>;
              
              // Debe haber solo una clave para la métrica
              const metricKeys = Object.keys(serializedThresholds).filter(key => key === metricName);
              expect(metricKeys.length).toBe(1);
              
              // El array debe contener todas las expresiones
              const allExpressions = serializedThresholds[metricName];
              expect(Array.isArray(allExpressions)).toBe(true);
              
              // Verificar que todas las expresiones originales están presentes
              // (pueden estar en orden diferente si hay deduplicación o procesamiento)
              firstGroup.forEach(expr => {
                expect(allExpressions).toContain(expr);
              });
              secondGroup.forEach(expr => {
                expect(allExpressions).toContain(expr);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe serializar thresholds en endpoints completos con formato K6 válido', () => {
      fc.assert(
        fc.property(
          arbEndpointDraft.map((endpoint): EndpointDraft => ({
            ...endpoint,
            profiles: endpoint.profiles.map((profile, index) => {
              // Habilitar al menos un perfil con thresholds
              if (index === 0) {
                return {
                  ...profile,
                  enabled: true,
                  thresholds: profile.thresholds.length > 0 
                    ? profile.thresholds 
                    : [{ metric: 'http_req_duration', expressions: ['p(95) < 2000', 'avg < 500'] }]
                };
              }
              return profile;
            })
          })),
          (endpoint) => {
            // Act: serializar el endpoint completo
            const serialized = serializeEndpoint(endpoint);

            // Assert: verificar que los thresholds están correctamente serializados
            endpoint.profiles.forEach((profile) => {
              if (profile.enabled && profile.thresholds.length > 0) {
                const profileKey = profile.type;
                
                expect(serialized).toHaveProperty(profileKey);
                
                const serializedProfile = serialized[profileKey] as Record<string, unknown>;
                expect(serializedProfile).toHaveProperty('thresholds');
                
                const thresholds = serializedProfile.thresholds as Record<string, string[]>;
                
                // Verificar formato K6 válido
                expect(typeof thresholds).toBe('object');
                expect(Array.isArray(thresholds)).toBe(false);
                
                Object.entries(thresholds).forEach(([metric, expressions]) => {
                  // Formato esperado por K6: { "metricName": ["expr1", "expr2"] }
                  expect(typeof metric).toBe('string');
                  expect(Array.isArray(expressions)).toBe(true);
                  expect(expressions.length).toBeGreaterThan(0);
                  
                  expressions.forEach((expr) => {
                    expect(typeof expr).toBe('string');
                    expect(expr.length).toBeGreaterThan(0);
                  });
                });
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('debe serializar thresholds con claves ordenadas alfabéticamente para determinismo', () => {
      fc.assert(
        fc.property(
          // Generar un perfil con múltiples métricas
          fc.record({
            type: arbProfileType,
            enabled: fc.constant(true),
            stages: fc.array(arbStageDraft, { minLength: 1, maxLength: 3 }),
            thresholds: fc.array(
              arbThresholdDraft,
              { minLength: 3, maxLength: 10 } // Al menos 3 métricas para verificar orden
            )
          }),
          (profile: ProfileDraft) => {
            // Act: serializar el perfil
            const serialized = serializeProfile(profile);

            // Assert
            expect(serialized).not.toBeNull();
            
            if (serialized && profile.thresholds.length > 0) {
              expect(serialized).toHaveProperty('thresholds');
              
              const serializedThresholds = serialized.thresholds as Record<string, string[]>;
              
              // Obtener las claves en el orden en que aparecen
              const keys = Object.keys(serializedThresholds);
              
              // Crear una copia ordenada alfabéticamente
              const sortedKeys = [...keys].sort();
              
              // Verificar que las claves están ordenadas alfabéticamente
              expect(keys).toEqual(sortedKeys);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Feature: config-builder-ui, Property 8: Perfiles deshabilitados se omiten de la salida', () => {
  describe('**Validates: Requirements 4.6**', () => {
    it('debe omitir perfiles deshabilitados y serializar solo perfiles habilitados', () => {
      fc.assert(
        fc.property(arbEndpointDraftMixedProfiles, (draft) => {
          // Act: serializar el endpoint
          const serialized = serializeEndpoint(draft);

          // Identificar perfiles habilitados vs deshabilitados
          const enabledProfiles = draft.profiles.filter((p) => p.enabled);
          const disabledProfiles = draft.profiles.filter((p) => !p.enabled);

          // Assert: todos los perfiles habilitados deben estar en la salida
          enabledProfiles.forEach((profile) => {
            expect(serialized).toHaveProperty(profile.type);
            expect(serialized[profile.type]).toBeDefined();
            expect(serialized[profile.type]).not.toBeNull();
            
            // Verificar que el perfil serializado contiene stages
            const serializedProfile = serialized[profile.type] as Record<string, unknown>;
            expect(serializedProfile).toHaveProperty('stages');
            expect(Array.isArray(serializedProfile.stages)).toBe(true);
          });

          // Assert: ningún perfil deshabilitado debe estar en la salida
          disabledProfiles.forEach((profile) => {
            expect(serialized).not.toHaveProperty(profile.type);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('debe serializar correctamente un endpoint con todos los perfiles deshabilitados', () => {
      fc.assert(
        fc.property(arbEndpointDraft, (draft) => {
          // Arrange: deshabilitar todos los perfiles
          const draftAllDisabled = {
            ...draft,
            profiles: draft.profiles.map((p) => ({ ...p, enabled: false }))
          };

          // Act: serializar el endpoint
          const serialized = serializeEndpoint(draftAllDisabled);

          // Assert: ningún perfil debe estar en la salida
          const profileTypes: ProfileType[] = ['loadtest', 'stresstest', 'capacitytest', 'stabilitytest'];
          profileTypes.forEach((type) => {
            expect(serialized).not.toHaveProperty(type);
          });

          // Verificar que los campos básicos sí están presentes
          expect(serialized).toHaveProperty('url');
          expect(serialized).toHaveProperty('method');
          expect(serialized).toHaveProperty('expectedStatus');
        }),
        { numRuns: 100 }
      );
    });

    it('debe serializar correctamente un endpoint con todos los perfiles habilitados', () => {
      fc.assert(
        fc.property(arbEndpointDraft, (draft) => {
          // Arrange: habilitar todos los perfiles
          const draftAllEnabled = {
            ...draft,
            profiles: draft.profiles.map((p) => ({ ...p, enabled: true }))
          };

          // Act: serializar el endpoint
          const serialized = serializeEndpoint(draftAllEnabled);

          // Assert: todos los perfiles deben estar en la salida
          const profileTypes: ProfileType[] = ['loadtest', 'stresstest', 'capacitytest', 'stabilitytest'];
          profileTypes.forEach((type) => {
            expect(serialized).toHaveProperty(type);
            expect(serialized[type]).toBeDefined();
            expect(serialized[type]).not.toBeNull();
          });
        }),
        { numRuns: 100 }
      );
    });

    it('debe serializar AppState completo omitiendo perfiles deshabilitados en todos los endpoints', () => {
      fc.assert(
        fc.property(arbAppStateMixedProfiles, (state) => {
          // Act: serializar el estado completo
          const serializedText = serialize(state);

          // Verificar que el resultado es válido
          expect(serializedText).toBeTruthy();
          expect(serializedText).toContain('export default');

          // Para cada endpoint, verificar la correspondencia enabled/disabled
          state.endpoints.forEach((endpoint) => {
            const serializedEndpoint = serializeEndpoint(endpoint);
            
            endpoint.profiles.forEach((profile) => {
              if (profile.enabled) {
                expect(serializedEndpoint).toHaveProperty(profile.type);
              } else {
                expect(serializedEndpoint).not.toHaveProperty(profile.type);
              }
            });
          });
        }),
        { numRuns: 100 }
      );
    });

    it('debe retornar null al serializar un perfil deshabilitado directamente', () => {
      fc.assert(
        fc.property(arbProfileDraftWithToggle, (profile) => {
          // Act: serializar el perfil directamente
          const serialized = serializeProfile(profile);

          // Assert: si deshabilitado, debe retornar null
          if (!profile.enabled) {
            expect(serialized).toBeNull();
          } else {
            // Si habilitado, debe retornar objeto con stages
            expect(serialized).not.toBeNull();
            expect(serialized).toHaveProperty('stages');
            expect(Array.isArray((serialized as Record<string, unknown>).stages)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
