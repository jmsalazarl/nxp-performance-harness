# Requirements Document

## Introduction

El framework necesita convertir mediciones de performance en recomendaciones concretas de recursos para desplegar una aplicación. Esta funcionalidad agrega perfiles genéricos de recursos ejecutados mediante límites de contenedores, sin depender de un proveedor cloud ni de una tecnología específica de infraestructura.

El objetivo es comparar la capacidad sostenible de una aplicación bajo diferentes combinaciones de CPU, memoria y almacenamiento, identificar el primer cuello de botella y producir una recomendación de hardware mínimo, recomendado y de crecimiento. La recomendación debe conservar la evidencia de las pruebas y distinguir datos medidos de valores estimados.

## Glossary

- **Resource profile**: configuración reproducible de recursos asignados a los servicios bajo prueba.
- **Service allocation**: CPU, memoria, almacenamiento y límites operativos asignados a un servicio.
- **Hardware profile**: suma y distribución de recursos disponibles para una ejecución completa.
- **Safe capacity**: mayor carga sostenida que cumple los SLO definidos sin presión operacional crítica.
- **Pressure point**: primera carga o recurso que muestra presión significativa, aunque el sistema todavía responda.
- **Growth tier**: perfil recomendado para un rango superior de carga.
- **Headroom**: margen reservado para variación, picos y crecimiento no medido.
- **Sizing recommendation**: salida que relaciona carga objetivo, recursos, capacidad, margen, evidencia y confianza.
- **Measured value**: valor obtenido directamente de una ejecución.
- **Derived value**: valor calculado a partir de mediciones, configuración o reglas documentadas.
- **Unconstrained run**: ejecución sin límites artificiales de CPU o memoria usada como referencia.

## Requirements

### Requirement 1: Definición de perfiles genéricos

**User Story:** Como responsable de infraestructura, quiero definir perfiles reproducibles de CPU, memoria y almacenamiento, para comparar el comportamiento de la aplicación en diferentes tamaños de máquina.

#### Acceptance Criteria

1. WHEN se define un resource profile, THE Framework SHALL registrar un identificador, CPU, memoria, almacenamiento, servicios incluidos y asignación por servicio.
2. WHEN se ejecuta un resource profile, THE Framework SHALL aplicar sus límites a los servicios configurados sin depender de nombres privados en el core.
3. WHERE un recurso no está limitado o disponible para ser medido, THE Framework SHALL marcarlo como no disponible y no inventar un valor.
4. WHEN dos ejecuciones usan el mismo resource profile, THE Framework SHALL conservar una configuración equivalente y comparable.
5. THE Framework SHALL permitir perfiles genéricos sin nombres ni propiedades específicas de proveedores cloud.

### Requirement 2: Ejecución comparable por perfil

**User Story:** Como analista de performance, quiero ejecutar el mismo workload contra varios perfiles, para medir el impacto real de los recursos asignados.

#### Acceptance Criteria

1. WHEN se solicita una matriz de perfiles, THE Orchestrator SHALL ejecutar cada perfil con el mismo workload, stages, thresholds y criterios de aborto.
2. WHEN una ejecución de perfil termina, THE Framework SHALL asociar el resultado con el identificador y la configuración exacta del perfil.
3. WHEN se comparan perfiles, THE Framework SHALL separar warm-up, transición y measurement windows.
4. WHEN una ejecución no es comparable por cambios de workload, configuración o estado inicial, THE Framework SHALL marcarla como no comparable.
5. THE Framework SHALL conservar los resultados de cada perfil sin sobrescribir ejecuciones anteriores.

### Requirement 3: Medición de capacidad por perfil

**User Story:** Como analista, quiero conocer la capacidad segura de cada perfil, para establecer límites operativos basados en evidencia.

#### Acceptance Criteria

1. WHEN finaliza una ejecución válida, THE Framework SHALL identificar la mayor tasa sostenida que cumple los SLO y las reglas operacionales.
2. WHEN una etapa presenta presión significativa de CPU, memoria, almacenamiento, latencia, errores o dropped iterations, THE Framework SHALL registrar el recurso y la etapa asociada.
3. WHEN el sistema no alcanza saturación durante el rango probado, THE Framework SHALL distinguir capacidad segura observada de capacidad máxima desconocida.
4. WHEN existen valores de etapas anteriores, THE Framework SHALL construir una curva de capacidad ordenada por carga y perfil.
5. THE Framework SHALL conservar por separado valores medidos, valores derivados y conclusiones analíticas.

### Requirement 4: Recomendación de hardware

**User Story:** Como responsable de despliegue, quiero recibir una recomendación de recursos para una carga objetivo, para desplegar la aplicación con un margen operacional explícito.

#### Acceptance Criteria

1. WHEN se proporciona una carga objetivo y un conjunto de ejecuciones válidas, THE Framework SHALL recomendar el perfil más pequeño que cumpla la carga, los SLO y el headroom requerido.
2. WHEN ningún perfil cumple la carga objetivo, THE Framework SHALL reportar que no existe una recomendación validada y señalar el siguiente perfil o prueba necesaria.
3. WHEN se genera una recomendación, THE Framework SHALL incluir CPU, memoria, almacenamiento, distribución por servicio, capacidad observada, carga objetivo, headroom y nivel de confianza.
4. WHEN una recomendación usa extrapolación o valores derivados, THE Framework SHALL identificar explícitamente los supuestos y la evidencia faltante.
5. THE Framework SHALL not presentar una recomendación como validada si depende de una ejecución fallida, no comparable o incompleta.

### Requirement 5: Proyección de crecimiento

**User Story:** Como responsable de producto, quiero conocer cómo crecerá la infraestructura cuando aumente la carga, para planear el siguiente tamaño de recursos.

#### Acceptance Criteria

1. WHEN existen al menos dos perfiles comparables, THE Framework SHALL ordenar los perfiles por capacidad segura y recursos asignados.
2. WHEN se define una carga superior a la capacidad segura actual, THE Framework SHALL identificar el siguiente perfil validado que pueda soportarla.
3. WHEN no existe un perfil validado para una carga futura, THE Framework SHALL reportar el rango no validado y proponer una prueba específica sin ejecutarla automáticamente.
4. WHEN la distribución de recursos cambia el cuello de botella, THE Framework SHALL conservar el cambio de cuello de botella en la proyección.
5. THE Framework SHALL distinguir crecimiento vertical, crecimiento horizontal y crecimiento no evaluado.

### Requirement 6: Artefactos y trazabilidad

**User Story:** Como consumidor del framework, quiero revisar la evidencia detrás de una recomendación, para auditar y repetir el sizing.

#### Acceptance Criteria

1. WHEN finaliza el análisis de perfiles, THE Framework SHALL generar un artefacto normalizado con perfiles, ejecuciones, métricas, clasificación y recomendaciones.
2. THE Framework SHALL incluir la configuración del workload, del perfil, del host y de los servicios observados en cada resultado.
3. WHEN una recomendación se genera, THE Framework SHALL referenciar los run IDs y artefactos que la sustentan.
4. THE Framework SHALL conservar los resultados bajo `results/<project-id>/<run-id>/` sin versionarlos en Git.
5. THE Framework SHALL not include secretos, credenciales, identificadores privados de aplicaciones o datos sensibles en el código público ni en ejemplos.

### Requirement 7: Seguridad operacional y calidad de datos

**User Story:** Como operador, quiero evitar recomendaciones basadas en ejecuciones inválidas, para no tomar decisiones incorrectas de infraestructura.

#### Acceptance Criteria

1. WHEN un precheck crítico falla, THE Orchestrator SHALL no iniciar la matriz de perfiles.
2. WHEN una ejecución presenta OOMKilled, reinicios, pérdida de datos, errores masivos o imposibilidad de generar la carga, THE Framework SHALL marcar el perfil como inválido para recomendación.
3. WHEN un collector no tiene datos suficientes, THE Framework SHALL marcar las métricas afectadas como no disponibles.
4. WHEN existe variación relevante entre repeticiones, THE Framework SHALL reportar la variabilidad antes de recomendar un perfil.
5. THE Framework SHALL permitir revisar y repetir una recomendación sin modificar resultados históricos.

## Alcance MVP

- Resource profiles genéricos basados en CPU, memoria y almacenamiento.
- Límites Docker reproducibles por servicio.
- Ejecución del mismo workload en varios perfiles.
- Comparación de capacidad segura por perfil.
- Identificación del primer cuello de botella observado.
- Recomendación de perfil mínimo y recomendado para una carga objetivo.
- Proyección de crecimiento hacia perfiles validados.
- Artefacto normalizado con evidencia y trazabilidad.
- Reporte sin dependencia de AWS, DigitalOcean u otro proveedor.

## Fuera De Alcance Inicial

- Despliegue automático de infraestructura.
- Generación de Terraform, CloudFormation, CDK o manifiestos de un proveedor.
- Precios o costos monetarios.
- Alta disponibilidad distribuida entre nodos físicos.
- Pruebas de red, latencia geográfica o balanceadores externos.
- Dimensionamiento definitivo de almacenamiento e IOPS sin una medición específica.
- Predicción estadística de cargas no representadas por el workload.

## Supuestos Iniciales

- Los límites Docker son una aproximación reproducible de una máquina virtual lógica, no una réplica perfecta de hardware físico.
- El workload representa una operación de negocio identificable y debe documentar su relación con usuarios o requests reales.
- El perfil sin límites se usa como referencia, no como recomendación de despliegue.
- La recomendación requiere al menos una ejecución válida bajo recursos controlados.
- El headroom debe ser configurable y visible en el resultado.

## Preguntas Abiertas

- El valor predeterminado de headroom debe definirse antes de generar recomendaciones finales.
- La conversión entre iteraciones por segundo, requests por segundo y usuarios concurrentes debe ser proporcionada por el workload o por una configuración explícita.
- La política mínima de repeticiones para considerar un perfil estable debe definirse en la estrategia de QA.
