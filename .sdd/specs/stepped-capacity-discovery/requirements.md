# Requirements Document

## Introduction

El framework necesita distinguir una exploración de capacidad basada en rampas de una medición de capacidad sostenida. La nueva funcionalidad agrega el perfil `capacity-stepped`, que mantiene tasas estables en ventanas de medición y produce métricas independientes por etapa sin incorporar datos de aplicaciones privadas al repositorio público.

El run anterior de `capacity-discovery` permanece válido y se clasifica como `UNCONSTRAINED LOCAL RAMP DISCOVERY`: alcanzó 40 iteraciones por segundo, pero no mantuvo una meseta independiente de cuatro minutos a esa tasa.

## Glossary

- **Ramp**: etapa de transición lineal entre tasas objetivo.
- **Hold**: etapa estable usada para medir capacidad sostenida.
- **Measurement window**: ventana temporal de un hold, excluyendo warm-up y rampas.
- **Stage**: etapa declarada por el perfil con tipo, tasa objetivo y duración.
- **Adapter externo**: entrypoint k6 proporcionado fuera del repositorio público.
- **Resource correlation**: agregación de recursos del host y servicios configurados para una ventana de medición.

## Requirements

### Requirement 1: Perfil de capacidad escalonada

**User Story:** Como responsable de performance, quiero ejecutar cargas sostenidas de 20, 40, 60 y 80 iteraciones por segundo, para distinguir capacidad estable de capacidad alcanzada momentáneamente.

#### Acceptance Criteria

1. WHEN se solicita `capacity-stepped`, THE Framework SHALL ejecutar `ramping-arrival-rate` con warm-up, transiciones y holds definidos por el perfil.
2. WHERE el perfil no recibe una configuración alternativa, THE Framework SHALL usar 10 iteraciones por segundo durante 2 minutos, transiciones de 30 segundos y holds de 20, 40, 60 y 80 iteraciones por segundo con duraciones de 3, 4, 4 y 4 minutos respectivamente.
3. WHEN se ejecuta `capacity-discovery`, THE Framework SHALL conservar su comportamiento existente y clasificarlo como `UNCONSTRAINED LOCAL RAMP DISCOVERY`.
4. THE Framework SHALL mantener `preAllocatedVUs=30` y `maxVUs=100` como valores predeterminados para `capacity-stepped`, salvo configuración explícita.

### Requirement 2: Clasificación de etapas

**User Story:** Como analista, quiero diferenciar warm-up, transición y medición, para no mezclar rampas con resultados sostenidos.

#### Acceptance Criteria

1. WHEN una ejecución inicia, THE Framework SHALL identificar cada etapa con un tipo `warmup`, `transition` o `measurement` derivado del perfil.
2. WHEN se calculan resultados de capacidad sostenida, THE Framework SHALL utilizar únicamente etapas de tipo `measurement`.
3. WHEN una métrica se registra durante una etapa, THE Framework SHALL asociarla con un identificador de carga y el tipo de etapa activo.

### Requirement 3: Métricas independientes por etapa

**User Story:** Como analista, quiero obtener métricas por ventana de medición, para evaluar cada tasa sin contaminación de otras etapas.

#### Acceptance Criteria

1. WHEN finaliza una ejecución con etapas declaradas, THE Framework SHALL generar métricas para tasa objetivo, tasa real, requests, iteraciones, checks, errores, dropped iterations, VUs y latencia.
2. WHEN se calcula latencia por etapa, THE Framework SHALL generar p50, p90, p95, p99 y máximo usando únicamente la ventana de esa etapa.
3. WHEN se calcula `dropped_iterations` de una ventana, THE Framework SHALL distinguir el valor medido del valor derivado contra la carga esperada.
4. WHEN el adapter no produce una métrica requerida, THE Framework SHALL representarla como no disponible y no inventar un valor.

### Requirement 4: Correlación de recursos

**User Story:** Como analista, quiero correlacionar recursos por ventana, para identificar presión del sistema bajo cada carga sostenida.

#### Acceptance Criteria

1. WHEN existe `docker-host-stats.csv`, THE Framework SHALL correlacionar recursos con cada ventana de medición usando timestamps.
2. THE Framework SHALL calcular CPU promedio, p95 y máximo, y RAM promedio, p95 y máximo por servicio configurado.
3. THE Framework SHALL calcular CPU del host, memoria disponible, swap, load average e iowait por ventana.
4. THE Framework SHALL utilizar los servicios y roles definidos por el adapter u orchestrator y no nombres privados embebidos en el core.

### Requirement 5: Artefacto normalizado y privacidad

**User Story:** Como consumidor del framework, quiero un artefacto normalizado y seguro, para automatizar análisis sin exponer información privada.

#### Acceptance Criteria

1. WHEN finaliza `capacity-stepped`, THE Framework SHALL generar `stage-summary.json` además de los artefactos existentes.
2. THE Framework SHALL conservar los resultados bajo `results/<project-id>/<run-id>/` sin versionarlos en Git.
3. THE Framework SHALL permitir que el adapter permanezca fuera del repositorio público.
4. THE Framework SHALL not include private project identifiers in public source files, examples, or tests.

### Requirement 6: Preflight y seguridad operacional

**User Story:** Como operador, quiero que la prueba solo se ejecute con prechecks aprobados, para evitar resultados inválidos o daños operacionales.

#### Acceptance Criteria

1. WHEN cualquier precheck crítico falla, THE Orchestrator SHALL reportar `RUN NOT EXECUTED` y no iniciar k6.
2. WHEN ocurre OOMKilled, reinicio de contenedor, Docker unavailable, filesystem critical, memoria crítica, 5xx masivo sostenido, swap severa sostenida o imposibilidad de generar la carga, THE Orchestrator SHALL abortar la ejecución.
3. THE Orchestrator SHALL not abortar por un spike aislado de CPU, latencia o por `swap_used > 0`.

## Alcance MVP

- Profile genérico `capacity-stepped`.
- Stage tagging reusable.
- Métricas de etapa en k6.
- `stage-summary.json`.
- Correlación de recursos configurables.
- Compatibilidad con adapters externos.
- Documentación de la diferencia entre ramp discovery y stepped capacity.

## Fuera De Alcance Inicial

- Límites de CPU o RAM.
- Resource profiles `small`, `medium` y `large`.
- Mapeo a AWS o DigitalOcean.
- Ejecución automática del siguiente rango después de 80 iteraciones por segundo.
- Inclusión de adapters privados en el repositorio.

## Preguntas Abiertas

- La definición de saturación continúa siendo analítica y no fija umbrales universales de CPU o latencia.
