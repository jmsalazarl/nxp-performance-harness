import fc from "fast-check";

/**
 * Generadores fast-check para K6 Config Contract
 *
 * Estos arbitraries generan configuraciones K6 válidas e inválidas
 * para usar en property-based tests del spec k6-config-contract.
 */

/**
 * HTTP Methods soportados por K6
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Nombres de perfiles de prueba soportados
 */
export type ProfileName = "loadtest" | "stresstest" | "capacitytest" | "stabilitytest";

/**
 * Stage de un perfil de prueba
 */
export interface Stage {
  duration: string;
  target: number;
}

/**
 * Test Profile con stages y thresholds
 */
export interface TestProfile {
  stages: Stage[];
  thresholds?: Record<string, string[]>;
}

/**
 * Endpoint de configuración K6
 */
export interface Endpoint {
  url: string;
  method: HttpMethod;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  expectedStatus: number;
  maxRetries: number;
  thinkTimeSeconds: number;
  name?: string;
  description?: string;
  loadtest?: TestProfile;
  stresstest?: TestProfile;
  capacitytest?: TestProfile;
  stabilitytest?: TestProfile;
}

/**
 * Configuración completa K6
 */
export interface Config {
  endpoints: Endpoint[];
}

/**
 * Genera un HttpMethod válido aleatorio
 */
export const arbHttpMethod = fc.constantFrom<HttpMethod>(
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
);

/**
 * Genera un nombre de perfil válido aleatorio
 */
export const arbProfileName = fc.constantFrom<ProfileName>(
  "loadtest",
  "stresstest",
  "capacitytest",
  "stabilitytest"
);

/**
 * Genera una duración K6 válida (e.g., "30s", "2m", "1h")
 */
export const arbDuration = fc.oneof(
  fc.nat({ max: 300 }).map((n) => `${n}s`), // 0-300 segundos
  fc.nat({ max: 60 }).map((n) => `${n}m`),  // 0-60 minutos
  fc.nat({ max: 24 }).map((n) => `${n}h`)   // 0-24 horas
);

/**
 * Genera un Stage válido
 */
export const arbStage: fc.Arbitrary<Stage> = fc.record({
  duration: arbDuration,
  target: fc.nat({ max: 1000 }) // VUs de 0 a 1000
});

/**
 * Genera métricas built-in de K6 y custom del proyecto
 */
export const arbMetricKey = fc.oneof(
  // Built-in K6 metrics
  fc.constantFrom(
    "http_req_duration",
    "http_req_failed",
    "http_req_blocked",
    "http_req_connecting",
    "http_req_tls_handshaking",
    "http_req_sending",
    "http_req_waiting",
    "http_req_receiving",
    "http_reqs",
    "vus",
    "vus_max",
    "iterations"
  ),
  // Custom metrics del proyecto (preservar capitalización exacta)
  fc.constantFrom(
    "waiting_time",
    "Errors",
    "Total_Reqs",
    "retries",
    "transaction_duration",
    "transactions_per_second",
    "active_vus"
  )
);

/**
 * Genera una expresión de threshold K6 válida
 */
export const arbThresholdExpression = fc.oneof(
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
 * Genera un objeto de thresholds válido
 */
export const arbThresholds: fc.Arbitrary<Record<string, string[]>> = fc
  .array(
    fc.tuple(arbMetricKey, fc.array(arbThresholdExpression, { minLength: 1, maxLength: 3 })),
    { minLength: 1, maxLength: 5 }
  )
  .map((entries) => Object.fromEntries(entries));

/**
 * Genera un TestProfile válido
 */
export const arbTestProfile: fc.Arbitrary<TestProfile> = fc.record({
  stages: fc.array(arbStage, { minLength: 1, maxLength: 5 }),
  thresholds: fc.option(arbThresholds, { nil: undefined })
});

/**
 * Genera una URL absoluta válida
 */
export const arbAbsoluteUrl = fc
  .tuple(
    fc.constantFrom("http", "https"),
    fc.domain(),
    fc.option(fc.nat({ max: 65535 }).map(String), { nil: undefined }),
    fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }).map((parts) => "/" + parts.join("/")),
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
 * Genera un JSON object válido (no primitivos)
 */
const arbJsonObject: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(
    fc.string({ maxLength: 50 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  ),
  { maxKeys: 5 }
);

/**
 * Genera un Endpoint válido con perfiles opcionales
 */
export const arbEndpoint: fc.Arbitrary<Endpoint> = fc.record({
  url: arbAbsoluteUrl,
  method: arbHttpMethod,
  payload: fc.option(arbJsonObject, { nil: undefined }),
  headers: fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.string({ maxLength: 100 })
    ),
    { nil: undefined }
  ),
  expectedStatus: fc.integer({ min: 100, max: 599 }),
  maxRetries: fc.nat({ max: 10 }),
  thinkTimeSeconds: fc.nat({ max: 30 }),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  // Generar perfiles opcionales aleatoriamente
  loadtest: fc.option(arbTestProfile, { nil: undefined }),
  stresstest: fc.option(arbTestProfile, { nil: undefined }),
  capacitytest: fc.option(arbTestProfile, { nil: undefined }),
  stabilitytest: fc.option(arbTestProfile, { nil: undefined })
});

/**
 * Genera una Config válida con uno o más endpoints
 */
export const arbConfig: fc.Arbitrary<Config> = fc.record({
  endpoints: fc.array(arbEndpoint, { minLength: 1, maxLength: 10 })
});

/**
 * Generadores para configuraciones inválidas
 */

/**
 * Genera una URL inválida (vacía o relativa)
 */
export const arbInvalidUrl = fc.oneof(
  fc.constant(""),
  fc.constant("/relative/path"),
  fc.constant("not-a-url"),
  fc.string({ maxLength: 10 }).filter((s) => !s.includes("://"))
);

/**
 * Genera un método HTTP no soportado
 */
export const arbInvalidMethod = fc.constantFrom(
  "TRACE",
  "OPTIONS",
  "HEAD",
  "CONNECT",
  "INVALID"
);

/**
 * Genera un status HTTP fuera de rango
 */
export const arbInvalidStatus = fc.oneof(
  fc.integer({ max: 99 }),
  fc.integer({ min: 600 })
);

/**
 * Genera un Stage inválido
 */
export const arbInvalidStage = fc.oneof(
  // Duration vacío
  fc.record({
    duration: fc.constant(""),
    target: fc.nat({ max: 100 })
  }),
  // Target negativo
  fc.record({
    duration: arbDuration,
    target: fc.integer({ max: -1 })
  })
);

/**
 * Genera un TestProfile inválido (sin stages)
 */
export const arbInvalidTestProfile = fc.record({
  stages: fc.constant([]),
  thresholds: fc.option(arbThresholds, { nil: undefined })
});

/**
 * Genera thresholds inválidos (expresión vacía)
 */
export const arbInvalidThresholds = fc
  .array(
    fc.tuple(arbMetricKey, fc.constant([""])),
    { minLength: 1, maxLength: 3 }
  )
  .map((entries) => Object.fromEntries(entries));

/**
 * Genera un Endpoint inválido con al menos una violación del contrato
 */
export const arbInvalidEndpoint: fc.Arbitrary<Endpoint> = fc.oneof(
  // URL inválida
  arbEndpoint.chain((endpoint) =>
    arbInvalidUrl.map((url) => ({ ...endpoint, url }))
  ),
  // Método inválido
  arbEndpoint.chain((endpoint) =>
    arbInvalidMethod.map((method) => ({ ...endpoint, method: method as HttpMethod }))
  ),
  // Headers no objeto (null o array)
  arbEndpoint.chain((endpoint) =>
    fc.oneof(
      fc.constant(null as any),
      fc.array(fc.string()) as fc.Arbitrary<any>
    ).map((headers) => ({ ...endpoint, headers }))
  ),
  // Status inválido
  arbEndpoint.chain((endpoint) =>
    arbInvalidStatus.map((expectedStatus) => ({ ...endpoint, expectedStatus }))
  ),
  // Perfil sin stages
  arbEndpoint.chain((endpoint) =>
    fc.constantFrom("loadtest", "stresstest", "capacitytest", "stabilitytest").map((profileName) => ({
      ...endpoint,
      [profileName]: { stages: [], thresholds: undefined }
    }))
  ),
  // Stage inválido en perfil
  arbEndpoint.chain((endpoint) =>
    fc.tuple(
      fc.constantFrom("loadtest", "stresstest", "capacitytest", "stabilitytest"),
      arbInvalidStage
    ).map(([profileName, invalidStage]) => ({
      ...endpoint,
      [profileName]: { stages: [invalidStage], thresholds: undefined }
    }))
  ),
  // Threshold expression vacía
  arbEndpoint.chain((endpoint) =>
    fc.constantFrom("loadtest", "stresstest", "capacitytest", "stabilitytest").map((profileName) => ({
      ...endpoint,
      [profileName]: { stages: [{ duration: "30s", target: 10 }], thresholds: { "http_req_duration": [""] } }
    }))
  )
);

/**
 * Genera una Config inválida con al menos un endpoint inválido
 */
export const arbInvalidConfig: fc.Arbitrary<Config> = fc.record({
  endpoints: fc.array(
    fc.oneof(arbEndpoint, arbInvalidEndpoint),
    { minLength: 1, maxLength: 5 }
  )
}).filter((config) => {
  // Asegurar que al menos un endpoint sea inválido
  return config.endpoints.some((endpoint) => {
    // Verificar violaciones básicas
    const hasInvalidUrl = !endpoint.url || !endpoint.url.includes("://");
    const hasInvalidMethod = !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method);
    const hasInvalidStatus = endpoint.expectedStatus < 100 || endpoint.expectedStatus > 599;
    const hasInvalidHeaders = endpoint.headers !== undefined && 
                               (endpoint.headers === null || Array.isArray(endpoint.headers));
    
    // Verificar perfiles sin stages o con stages inválidos
    const profiles: Array<TestProfile | undefined> = [
      endpoint.loadtest,
      endpoint.stresstest,
      endpoint.capacitytest,
      endpoint.stabilitytest
    ];
    
    const hasInvalidProfile = profiles.some((profile) => {
      if (!profile) return false;
      if (profile.stages.length === 0) return true;
      
      const hasInvalidStage = profile.stages.some(
        (stage) => !stage.duration || stage.target < 0
      );
      
      const hasInvalidThreshold = profile.thresholds && 
        Object.values(profile.thresholds).some((rules) => 
          rules.some((rule) => rule === "")
        );
      
      return hasInvalidStage || hasInvalidThreshold;
    });
    
    return hasInvalidUrl || hasInvalidMethod || hasInvalidStatus || 
           hasInvalidHeaders || hasInvalidProfile;
  });
});
