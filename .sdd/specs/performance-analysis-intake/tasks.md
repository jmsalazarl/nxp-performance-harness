# Tasks

## Overview

Implementar una encuesta inicial que capture contexto de negocio y comportamiento de usuarios, genere un workload model versionado y produzca un workload contract aprobado para `stepped-capacity-discovery` y `resource-profile-sizing`.

## Tasks

- [x] 1. Definir el esquema versionado de analysis intake
  - Crear los modelos de análisis, respuestas, journeys, referencias, supuestos, SLO y estados.
  - Definir unidades, fuentes de valores y niveles de confianza.
  - Validar que no se acepten secretos ni credenciales.
  - _Requerimiento: Requirement 1, Requirement 6_
  - _Capa: Core / Contratos_
  - _Depende de: ninguno_
  - _Terminado cuando: un análisis puede guardarse como borrador y cada valor conserva fuente, unidad y versión._

- [x] 2. Diseñar e implementar el wizard de encuesta
  - Implementar secciones de contexto, demanda, crecimiento, usuarios, journeys, integraciones, SLO y objetivos.
  - Mostrar progreso, datos obligatorios, campos faltantes y errores de unidad o rango.
  - Permitir guardar y reanudar borradores.
  - _Requerimiento: Requirement 1, Requirement 2, Requirement 3, Requirement 5_
  - _Capa: Frontend / UX_
  - _Depende de: 1_
  - _Terminado cuando: el usuario puede completar, guardar y retomar un análisis sin perder respuestas._

- [x] 3. Implementar validaciones de demanda y crecimiento
  - Validar clientes, usuarios activos, frecuencia, horizontes, porcentajes y ventanas pico.
  - Identificar cuándo clientes registrados no son suficientes para calcular actividad.
  - Distinguir crecimiento lineal, periódico, puntual y manual.
  - _Requerimiento: Requirement 2_
  - _Capa: Core / Validación_
  - _Depende de: 1_
  - _Terminado cuando: valores inválidos producen errores y datos insuficientes producen faltantes explícitos._

- [x] 4. Implementar modelo de business journeys
  - Permitir crear journeys síncronos, asíncronos y batch.
  - Registrar operaciones, orden, cantidad, lectura/escritura, frecuencia, duración y prioridad.
  - Asociar SLO específicos a journeys críticos.
  - _Requerimiento: Requirement 3, Requirement 5_
  - _Capa: Core / Frontend_
  - _Depende de: 1, 2_
  - _Terminado cuando: un journey completo conserva su secuencia y puede validarse sin perder operaciones._

- [x] 5. Implementar cálculos determinísticos de workload
  - Calcular usuarios activos, sesiones diarias, arrival rate, request rate y concurrencia.
  - Conservar entradas, fórmulas, unidades, valores derivados y confidence.
  - Generar escenarios normal, pico, estrés y soak cuando correspondan.
  - _Requerimiento: Requirement 4_
  - _Capa: Core / Analysis_
  - _Depende de: 3, 4_
  - _Terminado cuando: los casos conocidos producen resultados esperados y los datos faltantes no se convierten en cero._

- [x] 6. Implementar catálogo de referencias y supuestos
  - Permitir registrar título, URL, fecha, contexto, dato respaldado y alcance de una referencia.
  - Clasificar valores como ingresados, derivados, referenciados o predeterminados.
  - Calcular confidence y mostrar contradicciones o datos faltantes.
  - _Requerimiento: Requirement 6_
  - _Capa: Core / Reporting_
  - _Depende de: 1, 5_
  - _Terminado cuando: cada supuesto visible tiene fuente, descripción y nivel de confianza._

- [x] 7. Generar y revisar el plan de pruebas
  - Crear escenarios con targets, duración, stages, SLO y criterios de aceptación.
  - Proponer configuración para `capacity-stepped` sin iniciar el benchmark.
  - Resaltar supuestos de baja confianza y bloquear aprobación si faltan datos mínimos.
  - _Requerimiento: Requirement 5, Requirement 7_
  - _Capa: Analysis / UX_
  - _Depende de: 5, 6_
  - _Terminado cuando: el usuario puede revisar el plan, corregir respuestas y aprobarlo explícitamente._

- [x] 8. Implementar versionado y aprobación inmutable
  - Congelar respuestas y plan al aprobar.
  - Crear nueva versión cuando cambie una respuesta aprobada.
  - Marcar contratos anteriores como obsoletos sin sobrescribir artefactos.
  - _Requerimiento: Requirement 1, Requirement 7, Requirement 8_
  - _Capa: Persistencia / Core_
  - _Depende de: 1, 7_
  - _Terminado cuando: cada contrato aprobado tiene versión y digest reproducibles._

- [x] 9. Exportar workload contract para las specs consumidoras
  - Exportar escenarios y SLO compatibles con `stepped-capacity-discovery`.
  - Exportar analysis ID, versión, digest, assumptions y confidence para `resource-profile-sizing`.
  - Bloquear comparación con runs de otra versión de contrato.
  - _Requerimiento: Requirement 8_
  - _Capa: Integración / Contratos_
  - _Depende de: 7, 8_
  - _Terminado cuando: ambas specs pueden consumir un contrato aprobado y trazable._

- [x] 10. Agregar pruebas y documentación del flujo completo
  - Probar wizard, validaciones, fórmulas, versionado, aprobación y exportación.
  - Probar casos de clientes sin usuarios activos, porcentajes inválidos, journeys incompletos y datos contradictorios.
  - Documentar límites de interpretación y política de referencias.
  - _Requerimiento: Requirement 1, Requirement 4, Requirement 6, Requirement 7, Requirement 8_
  - _Capa: QA / Docs_
  - _Depende de: 2, 3, 4, 5, 6, 7, 8, 9_
  - _Terminado cuando: el flujo completo genera un contrato aprobado y las pruebas automatizadas pasan._

- [x] 11. Implementar gates de calidad y seguridad
  - Ejecutar typecheck, pruebas, cobertura minima, auditoria de dependencias y revision de secretos.
  - Separar el pipeline en stages de validacion, pruebas, calidad, seguridad y build.
  - Endurecer el contenedor estatico con usuario sin privilegios, healthcheck y headers HTTP de seguridad.
  - _Requerimiento: Requirement 1, Requirement 7, Requirement 8_
  - _Capa: QA / Seguridad / CI-CD_
  - _Depende de: 7_
  - _Terminado cuando: `npm run verify` y el build del contenedor pasan sin vulnerabilidades altas o criticas._

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3", "4"] },
    { "id": 2, "tasks": ["5", "6"] },
    { "id": 3, "tasks": ["7"] },
    { "id": 4, "tasks": ["8", "9"] },
    { "id": 5, "tasks": ["10"] },
    { "id": 6, "tasks": ["11"] }
  ]
}
```

## Notes

- La encuesta produce una hipótesis de carga; no reemplaza una medición real.
- La búsqueda web automática queda fuera del MVP.
- Las referencias externas deben ser revisables y versionadas.
- No se deben solicitar secretos, tokens, contraseñas ni datos de tarjeta.
- El contrato aprobado debe consumirse antes de ejecutar capacity-stepped o resource-profile-sizing.
- El headroom y el número mínimo de repeticiones se configuran en sizing y QA, no se inventan desde clientes registrados.
