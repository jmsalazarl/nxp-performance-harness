# Data Models

Este directorio contiene las interfaces TypeScript que definen los modelos de datos de la aplicación, incluyendo el Config Builder UI y el Performance Dashboard.

## Estructura del Modelo

```
AppState
├── endpoints: EndpointDraft[]
└── activeEndpointId: string | null

EndpointDraft
├── id, name, description
├── url, method, expectedStatus
├── headersText, payloadText
├── maxRetries, thinkTimeSeconds
└── profiles: ProfileDraft[]

ProfileDraft
├── type: ProfileType
├── enabled: boolean
├── stages: StageDraft[]
└── thresholds: ThresholdDraft[]

StageDraft
├── duration: string
└── target: number

ThresholdDraft
├── metric: string
└── expressions: string[]
```

## Interfaces Principales

### AppState
Estado raíz de la aplicación, mantenido en React Context. Contiene la lista de endpoints en edición y el ID del endpoint activo.

### EndpointDraft
Representa un endpoint mientras está siendo configurado en la UI. Los campos `headersText` y `payloadText` son strings de JSON para facilitar la edición en textareas.

### ProfileDraft
Configuración de un perfil de prueba (loadtest, stresstest, capacitytest, stabilitytest). Cada endpoint tiene 4 perfiles, pero solo los habilitados se exportan.

### StageDraft
Define un stage de tráfico con duración (formato K6: "30s", "2m", "1h") y target (número de usuarios virtuales).

### ThresholdDraft
Configuración de thresholds para una métrica K6. Cada threshold tiene un nombre de métrica y un array de expresiones.

### ValidationResult
Resultado de validación que contiene un flag `valid` y un array de `FieldError`.

### FieldError
Error de validación a nivel de campo, identifica el endpoint, campo y mensaje de error.

## Tipos Enumerados

- **HttpMethod**: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`
- **ProfileType**: `'loadtest' | 'stresstest' | 'capacitytest' | 'stabilitytest'`

## Archivos

### Config Builder UI
- `AppState.ts` - Estado raíz de la aplicación
- `EndpointDraft.ts` - Endpoint en edición + tipo HttpMethod
- `ProfileDraft.ts` - Perfil de prueba + tipo ProfileType
- `StageDraft.ts` - Stage de tráfico
- `ThresholdDraft.ts` - Threshold de métrica
- `ValidationResult.ts` - Resultado de validación + FieldError
- `config.types.ts` - Tipos del contrato K6 (existente)

### Performance Dashboard
- `report.ts` - Modelo principal del dashboard: ReportModel, Kpi, ThresholdResult, ChartSeries
- `errors.ts` - Tipos de error: ParseError, Result<T, E>
- `metrics.ts` - Tabla de mapeo de métricas K6 y tipo RawSummary

### Común
- `index.ts` - Barrel export para importaciones convenientes

## Importación

```typescript
// Importar múltiples tipos desde el barrel
import { AppState, EndpointDraft, ProfileType } from '@/models';

// O importar directamente desde archivos específicos
import { HttpMethod } from '@/models/EndpointDraft';
import { ValidationResult } from '@/models/ValidationResult';
```

## Validación

Los valores de los campos están documentados con sus rangos válidos:
- `expectedStatus`: 100-599
- `maxRetries`: 0-10
- `thinkTimeSeconds`: 0-60
- `target`: 0-10000
- `url`: debe comenzar con `http://` o `https://`
- `headersText`: debe ser un objeto JSON válido (no array, no primitivo)
- `payloadText`: debe ser JSON válido
- `duration`: debe coincidir con el formato de tiempo K6
- `metric`: 1-128 caracteres, solo letras, dígitos y guiones bajos

## Límites de Colección

- Máximo 50 endpoints por configuración
- Máximo 20 stages por perfil
- Máximo 10 expresiones por métrica de threshold

---

## Performance Dashboard Models

### ReportModel
Modelo principal que representa un reporte de rendimiento K6 completo. Contiene:
- `fileName`: Nombre del archivo JSON original
- `testType`: Tipo de prueba inferido ('loadtest' | 'stresstest' | 'capacitytest' | 'stabilitytest' | 'unknown')
- `kpis`: Array de indicadores clave de rendimiento
- `thresholds`: Array de resultados de thresholds (vacío si no hay datos)
- `charts`: Array de series de datos para gráficos
- `rawSummary`: Objeto JSON original de K6 para referencia

### Kpi
Indicador clave de rendimiento con:
- `key`: Identificador interno (ej. 'http_reqs')
- `label`: Etiqueta legible (ej. 'Total Requests')
- `value`: Valor formateado como string (ej. '1,234') o 'N/A' si no disponible
- `unit`: Unidad de medida ('ms', 'req/s', '%', 'count')
- `status`: Estado visual ('normal' | 'warning' | 'critical')

### ThresholdResult
Resultado de un threshold de K6:
- `metric`: Nombre de la métrica (ej. 'http_req_duration')
- `expression`: Expresión del threshold (ej. 'p(95)<500')
- `passed`: Boolean indicando si se cumplió el threshold

### ChartSeries
Serie de datos para gráficos:
- `key`: Identificador de la serie
- `label`: Etiqueta para la leyenda
- `values`: Array de valores numéricos

### ParseError
Error de parsing del JSON K6:
- `type`: 'INVALID_JSON' | 'MISSING_METRICS'
- `message`: Descripción del error

### Result<T, E>
Tipo funcional para manejo de errores:
```typescript
type Result<T, E> = 
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### METRIC_MAPPINGS
Constante que define el mapeo entre métricas K6 y campos del dashboard. Cada entrada contiene:
- `dashboardField`: Nombre del campo en el dashboard
- `path.primary`: Ruta principal en el objeto metrics de K6
- `path.fallback`: Ruta alternativa (opcional)
- `unit`: Unidad de medida
- `key`: Clave interna del KPI

## Referencias

### Config Builder UI
- Requirement 2.1, 2.2, 3.1, 4.1, 5.1 en `.sdd/specs/config-builder-ui/requirements.md`
- Sección "Data Models" en `.sdd/specs/config-builder-ui/design.md`

### Performance Dashboard
- Requirements 1.5, 2.1-2.9 en `.sdd/specs/performance-dashboard/requirements.md`
- Sección "Data Models" en `.sdd/specs/performance-dashboard/design.md`
