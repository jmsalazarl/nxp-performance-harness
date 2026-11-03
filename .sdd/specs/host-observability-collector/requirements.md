# Documento De Requerimientos

## Introduccion

El collector local registra metricas del host y de contenedores Docker para contextualizar una corrida k6. Su salida es un CSV append-only destinado al analisis posterior.

## Alcance

- Capturar CPU, memoria, load average y actividad de swap del host.
- Capturar CPU, memoria, PIDs y estado de contenedores objetivo.
- Incluir los contenedores configurados de la API, la interfaz web, la base de datos, el almacenamiento y k6.
- Permitir reemplazar la lista mediante `DOCKER_CONTAINERS`.
- Marcar k6 como `NOT_DETECTED` antes de su inicio.

## Requerimientos

### Requirement 1: Captura Del Host

**User Story:** Como tester, quiero observar recursos del host para interpretar resultados de rendimiento.

#### Acceptance Criteria

1. WHILE el collector esta activo, THE Host Collector SHALL escribir muestras con el intervalo configurado.
2. THE Host Collector SHALL registrar CPU de usuario, sistema, idle e iowait.
3. THE Host Collector SHALL registrar memoria disponible, memoria usada y swap usada.
4. THE Host Collector SHALL registrar load average de 1, 5 y 15 minutos.

### Requirement 2: Captura De Contenedores

**User Story:** Como tester, quiero identificar consumo por contenedor durante la corrida.

#### Acceptance Criteria

1. WHEN `docker stats` devuelve un contenedor objetivo, THE Host Collector SHALL registrar CPU, memoria, porcentaje de memoria, PIDs y estado `OK`.
2. IF un contenedor objetivo no existe, THEN THE Host Collector SHALL registrar estado `MISSING`.
3. IF el contenedor k6 aun no existe, THEN THE Host Collector SHALL registrar estado `NOT_DETECTED`.

### Requirement 3: Formato Y Robustez

**User Story:** Como analista, quiero un CSV consistente que pueda procesarse despues de la corrida.

#### Acceptance Criteria

1. WHEN inicia la captura, THE Host Collector SHALL escribir una cabecera estable.
2. THE Host Collector SHALL crear el directorio de salida si no existe.
3. IF el contador de CPU o swap retrocede, THEN THE Host Collector SHALL evitar porcentajes o tasas invalidas.
