# Documento De Requerimientos

## Introduccion

El orchestrator `nxp-performance` ejecuta el perfil `capacity-discovery` del adapter de referencia en un contenedor k6, coordina la captura de observabilidad local y conserva los resultados de cada corrida.

## Alcance

- Aceptar el comando `run reference capacity-discovery`.
- Crear un identificador y un directorio de resultados por corrida.
- Iniciar el collector antes de k6.
- Esperar una captura inicial configurable.
- Ejecutar k6 con red host y nombre determinista.
- Limpiar collector y contenedor al finalizar.
- Enriquecer `run-config.json` con metadata no sensible del host.

## Fuera De Alcance Inicial

- Sizing productivo.
- Limites artificiales de CPU o memoria.
- Orquestacion de despliegues.
- Ejecucion paralela de multiples perfiles.

## Requerimientos

### Requirement 1: Ejecucion Coordinada

**User Story:** Como tester, quiero ejecutar una corrida reproducible con un solo comando.

#### Acceptance Criteria

1. WHEN el comando es `./nxp-performance run reference capacity-discovery`, THE Orchestrator SHALL crear la corrida y ejecutar collector y k6.
2. IF el comando no coincide con el contrato soportado, THEN THE Orchestrator SHALL mostrar el uso y finalizar con codigo 2.
3. IF Docker o Node.js no estan disponibles, THEN THE Orchestrator SHALL informar la dependencia faltante y finalizar con codigo 2.

### Requirement 2: Resultados

**User Story:** Como tester, quiero encontrar todos los artefactos de una corrida en un directorio identificable.

#### Acceptance Criteria

1. WHEN inicia una corrida, THE Orchestrator SHALL generar `summary.json`, `summary.html`, `run-config.json` y `docker-host-stats.csv` bajo `results/reference/<run-id>`.
2. THE Orchestrator SHALL registrar el tipo de ejecucion como `UNCONSTRAINED LOCAL CAPACITY DISCOVERY`.
3. THE Orchestrator SHALL conservar el codigo de salida de k6.

### Requirement 3: Limpieza Segura

**User Story:** Como desarrollador, quiero que una corrida fallida no deje procesos auxiliares activos.

#### Acceptance Criteria

1. WHEN k6 termina o recibe una señal de terminacion, THE Orchestrator SHALL detener el collector.
2. WHEN finaliza la corrida, THE Orchestrator SHALL eliminar el contenedor k6 determinista.
3. IF ya existe el contenedor esperado, THEN THE Orchestrator SHALL rechazar la corrida sin reemplazarlo automaticamente.
