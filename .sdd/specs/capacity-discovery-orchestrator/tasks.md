# Tareas De Implementacion

## Overview

El orchestrator esta implementado y documentado como la unidad operativa de capacity discovery local.

## Tasks

- [x] 1. Implementar contrato CLI
  - Validar `run reference capacity-discovery` y dependencias del sistema.
  - _Requerimiento: Requirement 1_
  - _Capa: Operacion_
  - _Depende de: Ninguno_

- [x] 2. Coordinar collector y k6
  - Iniciar captura, esperar intervalo inicial y ejecutar el contenedor k6.
  - _Requerimiento: Requirement 1, Requirement 2_
  - _Capa: Operacion_
  - _Depende de: Tarea 1

- [x] 3. Implementar limpieza y metadata
  - Aplicar traps, eliminar el contenedor y enriquecer `run-config.json`.
  - _Requerimiento: Requirement 2, Requirement 3_
  - _Capa: Operacion / Observabilidad_
  - _Depende de: Tarea 2

## Notes

- La corrida es local y no representa sizing de produccion.
- El contenedor usa la red host para alcanzar los servicios locales.
