# Tasks

## Overview

Implementar sizing genérico de recursos sobre `capacity-stepped`, usando límites Docker reproducibles por servicio y generando recomendaciones trazables de CPU, memoria, almacenamiento declarado y crecimiento. La implementación no debe depender de AWS, DigitalOcean ni de otro proveedor.

## Tasks

- [ ] 1. Definir el contrato declarativo de resource profiles
  - Crear el esquema de perfiles con identificador, orden, recursos totales, asignaciones por servicio y runtime.
  - Validar CPU, memoria, almacenamiento, servicios requeridos y campos desconocidos.
  - _Requerimiento: Requirement 1, Requirement 6_
  - _Capa: Core / Configuración_
  - _Depende de: ninguno_
  - _Terminado cuando: un archivo válido se carga y un archivo inválido produce errores accionables sin iniciar una prueba._

- [ ] 2. Implementar la aplicación reproducible de límites Docker
  - Traducir CPU y memoria del perfil a límites del runtime por servicio.
  - Registrar los límites aplicados y los recursos no soportados como no disponibles.
  - Evitar nombres de contenedores privados en el core.
  - _Requerimiento: Requirement 1_
  - _Capa: Orchestrator / Runtime_
  - _Depende de: 1_
  - _Terminado cuando: una ejecución de prueba muestra límites aplicados por servicio en `run-config.json`._

- [ ] 3. Implementar la matriz de ejecución por perfil
  - Ejecutar el mismo adapter, workload, stage plan y thresholds para cada perfil seleccionado.
  - Aislar cada resultado con su `run-id`, `profile-id` y digest de configuración.
  - Detener la matriz cuando falle un precheck global crítico.
  - _Requerimiento: Requirement 2, Requirement 7_
  - _Capa: Orchestrator_
  - _Depende de: 1, 2_
  - _Terminado cuando: dos perfiles producen resultados separados y comparables con la misma configuración de workload._

- [ ] 4. Registrar comparabilidad y validez de ejecuciones
  - Comparar workload, stage plan, thresholds, estado inicial, versión del perfil y artefactos requeridos.
  - Marcar ejecuciones incompletas, inválidas o no comparables.
  - No permitir que resultados inválidos participen en recomendaciones.
  - _Requerimiento: Requirement 2, Requirement 7_
  - _Capa: Reporting / Validación_
  - _Depende de: 3_
  - _Terminado cuando: cada ejecución tiene estado `valid`, `invalid`, `incomplete` o `not_comparable` con razón._

- [ ] 5. Implementar análisis de capacidad por perfil
  - Consumir `stage-summary.json`, `run-config.json` y recursos correlacionados.
  - Calcular capacidad segura, presión por recurso y estado de saturación observado.
  - Distinguir valores medidos, derivados y conclusiones analíticas.
  - _Requerimiento: Requirement 3_
  - _Capa: Reporting / Analysis_
  - _Depende de: 4_
  - _Terminado cuando: cada perfil válido produce un resultado de capacidad por etapa de medición._

- [ ] 6. Implementar cálculo de headroom y selección de perfil
  - Calcular la carga requerida con headroom configurable.
  - Seleccionar el perfil validado más pequeño que cumpla carga y SLO.
  - Reportar ausencia de recomendación cuando ningún perfil sea suficiente.
  - _Requerimiento: Requirement 4_
  - _Capa: Analysis / Recommendation_
  - _Depende de: 5_
  - _Terminado cuando: casos con perfil suficiente, insuficiente y datos faltantes generan resultados distintos y trazables._

- [ ] 7. Implementar proyección de crecimiento
  - Ordenar perfiles por capacidad segura y recursos.
  - Identificar siguiente perfil validado para una carga futura.
  - Clasificar crecimiento vertical, horizontal no medido y rango no evaluado.
  - _Requerimiento: Requirement 5_
  - _Capa: Analysis / Recommendation_
  - _Depende de: 5, 6_
  - _Terminado cuando: el reporte identifica el siguiente perfil validado o declara explícitamente que falta una prueba._

- [ ] 8. Generar artefacto y reporte de sizing
  - Crear un artefacto normalizado con perfiles, runs, métricas, capacidad, recomendaciones, evidencia y confianza.
  - Incluir distribución de recursos por servicio y razones de cada conclusión.
  - Conservar `null` y razones para recursos no medidos.
  - _Requerimiento: Requirement 4, Requirement 6_
  - _Capa: Reporting_
  - _Depende de: 6, 7_
  - _Terminado cuando: el artefacto puede reconstruir la recomendación sin consultar logs fuera del run._

- [ ] 9. Agregar pruebas unitarias y de integración
  - Probar validación de perfiles, aplicación de límites, comparabilidad, capacidad segura, headroom y crecimiento.
  - Probar ejecuciones inválidas, collector incompleto y recursos no disponibles.
  - Probar que no se recomienden perfiles con evidencia inválida.
  - _Requerimiento: Requirement 7_
  - _Capa: QA_
  - _Depende de: 2, 4, 5, 6, 7, 8_
  - _Terminado cuando: las pruebas automatizadas cubren los casos críticos y pasan en CI/local._

- [ ] 10. Ejecutar validación controlada de sizing
  - Ejecutar como mínimo dos perfiles genéricos con el mismo workload y stage plan.
  - Verificar capacidad, presión de recursos, artefactos y recomendación final.
  - Documentar límites de interpretación del resultado.
  - _Requerimiento: Requirement 2, Requirement 3, Requirement 4, Requirement 6_
  - _Capa: QA / Operación / Docs_
  - _Depende de: 1, 2, 3, 4, 5, 6, 7, 8, 9_
  - _Terminado cuando: existe un reporte reproducible que identifica un perfil recomendado y un rango de crecimiento validado o no validado._

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3"] },
    { "id": 2, "tasks": ["4", "5"] },
    { "id": 3, "tasks": ["6", "7"] },
    { "id": 4, "tasks": ["8", "9"] },
    { "id": 5, "tasks": ["10"] }
  ]
}
```

## Notes

- Los perfiles son genéricos y no representan proveedores cloud.
- Docker se utiliza para reproducibilidad; el reporte debe declarar que es una aproximación de una máquina virtual lógica.
- No se deben generar ni aplicar recursos de producción automáticamente.
- El sizing de almacenamiento e IOPS queda condicionado a la disponibilidad de métricas específicas.
- No se deben mezclar resultados de `capacity-discovery` y `capacity-stepped` sin declarar la diferencia.
- La spec existente `stepped-capacity-discovery` continúa siendo la fuente para stages y capacidad sostenida; esta spec agrega la comparación bajo recursos controlados.
