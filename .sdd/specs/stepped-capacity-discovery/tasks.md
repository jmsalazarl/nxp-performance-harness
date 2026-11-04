# Tasks

## Overview

Implementar `capacity-stepped`, métricas independientes por ventana, correlación de recursos y ejecución privada controlada sin modificar el resultado anterior.

## Tasks

- [x] 1. Definir el plan de stages de `capacity-stepped`
  - Agregar warm-up, transiciones y holds derivados del profile.
  - _Requerimiento: Requirement 1, Requirement 2_
  - _Capa: K6 Core_
  - _Depende de: ninguno_

- [x] 2. Implementar contexto y métricas por stage
  - Registrar iteraciones, requests, checks, errores, duración, VUs y tags.
  - _Requerimiento: Requirement 2, Requirement 3_
  - _Capa: K6 Core_
  - _Depende de: 1_

- [x] 3. Generar `stage-summary.json`
  - Normalizar métricas por etapa y distinguir valores derivados.
  - _Requerimiento: Requirement 3, Requirement 5_
  - _Capa: K6 Core / Reporting_
  - _Depende de: 2_

- [x] 4. Correlacionar recursos por ventana
  - Agregar servicios configurados, roles opcionales y métricas de host.
  - _Requerimiento: Requirement 4_
  - _Capa: Reporting / Orchestrator_
  - _Depende de: 3_

- [x] 5. Mantener compatibilidad de CLI y documentar ramp discovery
  - Conservar perfiles existentes y clasificar correctamente el run anterior.
  - _Requerimiento: Requirement 1, Requirement 5_
  - _Capa: Orchestrator / Docs_
  - _Depende de: 1_

- [x] 6. Ejecutar prechecks, pruebas y stepped capacity
  - Validar build, tests, inspect, collector, privacidad, salud y recursos antes del run.
  - _Requerimiento: Requirement 6_
  - _Capa: QA / Operación_
  - _Depende de: 2, 3, 4, 5_

- [x] 7. Parametrizar targets de stepped capacity
  - Permitir `CAPACITY_STEPS` y duraciones externas sin crear profiles específicos por rango.
  - _Requerimiento: Requirement 1_
  - _Capa: K6 Core / Orchestrator_
  - _Depende de: 1_

## Notes

- El resultado anterior de `capacity-discovery` no se modifica ni elimina.
- El adapter privado permanece fuera del repositorio público.
- No se ejecutan límites de recursos ni pruebas de 100 iteraciones por segundo.
