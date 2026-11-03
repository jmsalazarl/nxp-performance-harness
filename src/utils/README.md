# Utils - Constantes y Tipos Utilitarios

Este módulo contiene constantes, tipos y funciones utilitarias compartidas por toda la aplicación Config Builder UI.

## Archivo: `downloader.ts`

### Función: `downloadTextFile(content: string, filename: string): void`

Utilidad pura para generar archivos descargables desde contenido de texto. Genera un Blob del contenido y dispara una descarga del navegador mediante un link temporal.

**Parámetros:**
- `content`: Contenido del archivo como string (ej. JavaScript generado)
- `filename`: Nombre del archivo a descargar (ej. "config.js")

**Uso:**
```typescript
import { downloadTextFile } from './utils/downloader';

const jsCode = 'export default { endpoints: [...] };';
downloadTextFile(jsCode, 'config.js');
```

**Implementación:**
1. Crea un Blob con tipo MIME `application/javascript;charset=utf-8`
2. Genera una URL temporal usando `URL.createObjectURL`
3. Crea un elemento `<a>` con href al Blob y atributo download
4. Dispara click programático para iniciar descarga
5. Limpia el DOM y libera la URL del Blob

**Testing:**
- Tests unitarios en `tests/unit/downloader.test.ts`
- Verifica creación de Blob, generación de URL, descarga y limpieza

## Archivo: `constants.ts`

### Límites de Colección

- `MAX_ENDPOINTS = 50`: Número máximo de endpoints permitidos
- `MAX_STAGES = 20`: Número máximo de stages por perfil
- `MAX_EXPRESSIONS = 10`: Número máximo de expresiones de threshold por métrica

### Métodos HTTP y Tipos de Perfil

- `HTTP_METHODS`: Array readonly con los métodos permitidos: GET, POST, PUT, PATCH, DELETE
- `HttpMethod`: Tipo TypeScript derivado de HTTP_METHODS
- `PROFILE_TYPES`: Array readonly con los 4 tipos de perfil: loadtest, stresstest, capacitytest, stabilitytest
- `ProfileType`: Tipo TypeScript derivado de PROFILE_TYPES

### Métricas K6

- `K6_METRICS`: Array readonly con las 11 métricas K6 estándar sugeridas para thresholds
- `K6Metric`: Tipo TypeScript derivado de K6_METRICS

### Validación

#### Funciones de validación:

```typescript
isValidK6Duration(duration: string): boolean
// Valida formato de duración K6: "30s", "2m", "1h", "1h30m", etc.

isValidMetricName(name: string): boolean
// Valida nombre de métrica personalizada: 1-128 caracteres, solo letras, dígitos y guiones bajos

hasValidUrlPrefix(url: string): boolean
// Valida que URL comience con http:// o https://
```

#### Regex expuestos:

- `K6_DURATION_REGEX`: Patrón para validar duraciones K6
- `METRIC_NAME_REGEX`: Patrón para validar nombres de métricas

### Rangos Numéricos

Objetos readonly con `min` y `max`:

- `EXPECTED_STATUS_RANGE`: 100-599
- `MAX_RETRIES_RANGE`: 0-10
- `THINK_TIME_RANGE`: 0-60
- `STAGE_TARGET_RANGE`: 0-10000

### Valores por Defecto

- `DEFAULT_ENDPOINT_VALUES`: Valores por defecto para nuevo endpoint
- `DEFAULT_STAGE_VALUES`: Valores por defecto para nuevo stage

### Mensajes de Error

- `VALIDATION_ERRORS`: Objeto readonly con mensajes de error estandarizados

### Configuración

- `VALIDATION_DEBOUNCE_MS = 500`: Tiempo de debounce para validación de campos

## Uso

```typescript
import {
  MAX_ENDPOINTS,
  HTTP_METHODS,
  isValidK6Duration,
  VALIDATION_ERRORS,
} from './utils/constants';

// Verificar límites
if (endpoints.length >= MAX_ENDPOINTS) {
  console.error(VALIDATION_ERRORS.MAX_ENDPOINTS_REACHED);
}

// Validar duración
if (!isValidK6Duration('30s')) {
  console.error(VALIDATION_ERRORS.DURATION_INVALID_FORMAT);
}

// Usar tipo
const method: HttpMethod = 'POST'; // TypeScript valida que sea uno de los métodos permitidos
```

## Testing

Los tests unitarios para este módulo se encuentran en `tests/unit/constants.test.ts` y verifican:
- Valores correctos de constantes
- Comportamiento de funciones de validación
- Patrones de regex
- Tipos TypeScript
