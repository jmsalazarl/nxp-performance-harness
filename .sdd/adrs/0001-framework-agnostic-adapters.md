# ADR-0001: Framework Agnostico Y Adaptadores Externos

## Estado

Aceptada

## Contexto

NXP Performance Harness es un repositorio publico para ejecutar pruebas de rendimiento, recolectar observabilidad y normalizar resultados. Los journeys, datasets, endpoints, autenticacion y thresholds de una aplicacion pertenecen al proyecto que se esta probando, no al framework.

## Decision

- El core permanece agnostico de aplicaciones, dominios de negocio y proveedores cloud.
- `k6/projects/reference/` es solo una implementacion de referencia para smoke tests y desarrollo del framework.
- Los proyectos externos pueden proporcionar un adapter mediante un identificador de proyecto, un manifest y una ruta externa al entrypoint k6.
- El orchestrator recibe `PROJECT_ID`, `ADAPTER_PATH` y `DOCKER_CONTAINERS` por entorno, con valores genericos para la implementacion de referencia.
- Los resultados pertenecen al framework y se escriben en `results/<project-id>/<run-id>-<profile>/`.
- `results/`, reportes y datos de ejecucion permanecen excluidos del repositorio publico.
- La observabilidad recibe nombres de contenedores; no interpreta la tecnologia ni la semantica privada de cada servicio.
- Capacity discovery y resource profiles son independientes de AWS, DigitalOcean y cualquier otro proveedor.

## Contrato Externo Conceptual

```json
{
  "projectId": "project-a",
  "adapter": "/external/path/project-a/main.js",
  "baseUrl": "http://localhost:8080",
  "defaultProfile": "smoke"
}
```

El manifest no debe contener passwords, tokens, llaves ni datos sensibles.

## Consecuencias

- El framework puede probar aplicaciones privadas sin incorporar sus archivos al repositorio publico.
- El adapter de referencia no debe recibir logica de negocio de una aplicacion real.
- El orchestrator requiere validaciones adicionales cuando se usa un adapter externo.
- La integracion completa con registro dinamico de adapters queda como evolucion futura y no bloquea la ejecucion actual.
