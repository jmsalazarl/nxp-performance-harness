# Tareas De Implementacion

## Overview

El adapter esta implementado. Estas tareas documentan la trazabilidad de la funcionalidad actual y sus validaciones.

## Tasks

- [x] 1. Implementar el entrypoint del adapter de referencia
  - Crear la carga de perfil, dataset, journeys y variables de entorno.
  - _Requerimiento: Requirement 1, Requirement 2_
  - _Capa: Performance_
  - _Depende de: Ninguno_

- [x] 2. Implementar journeys y metricas por flujo
  - Registrar resultado, tags y checks por journey.
  - _Requerimiento: Requirement 1, Requirement 3_
  - _Capa: Performance_
  - _Depende de: Tarea 1

- [x] 3. Implementar resumen local saneado
  - Exportar resumen JSON, HTML y configuracion sin secretos.
  - _Requerimiento: Requirement 3_
  - _Capa: Performance / Seguridad_
  - _Depende de: Tarea 2

## Notes

- Las operaciones de escritura y transaccion requieren habilitacion explicita.
- No se deben agregar credenciales ni datos sensibles a datasets o resultados.
