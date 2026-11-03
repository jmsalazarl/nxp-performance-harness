# Tareas De Implementacion

## Overview

El collector esta implementado y se ejecuta como proceso auxiliar del orchestrator.

## Tasks

- [x] 1. Implementar muestreo del host
  - Leer `/proc` y generar metricas de CPU, memoria, carga y swap.
  - _Requerimiento: Requirement 1_
  - _Capa: Observabilidad_
  - _Depende de: Ninguno_

- [x] 2. Implementar muestreo Docker
  - Registrar contenedores objetivo y estados de deteccion.
  - _Requerimiento: Requirement 2_
  - _Capa: Observabilidad_
  - _Depende de: Tarea 1

- [x] 3. Implementar CSV y protecciones de deltas
  - Crear cabecera, directorio y manejo de contadores invalidos.
  - _Requerimiento: Requirement 3
  - _Capa: Observabilidad / QA_
  - _Depende de: Tarea 2

## Notes

- Las metricas describen el entorno local de la corrida.
- No se pretende reemplazar Prometheus, Grafana o una plataforma de observabilidad productiva.
