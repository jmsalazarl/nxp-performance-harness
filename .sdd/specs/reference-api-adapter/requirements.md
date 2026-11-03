# Documento De Requerimientos

## Introduccion

El adapter de referencia conecta el runner reutilizable de k6 con journeys HTTP genericos. Permite ejecutar escenarios representativos usando una URL configurable, datos controlados y perfiles de carga existentes.

## Alcance

- Ejecutar journeys de salud, listado, detalle, escritura y transaccion.
- Seleccionar journeys mediante configuracion de entorno.
- Mantener escritura y transaccion deshabilitadas por defecto.
- Registrar metricas y resultados por journey.
- Exportar un resumen local con metadatos no sensibles.

## Fuera De Alcance Inicial

- Integraciones reales con proveedores externos.
- Persistencia externa de resultados.
- Credenciales reales dentro del repositorio.

## Requerimientos

### Requirement 1: Seleccion De Journeys

**User Story:** Como tester de rendimiento, quiero seleccionar los journeys de referencia para ejecutar solo el flujo que necesito.

#### Acceptance Criteria

1. WHEN el runner inicia, THE Reference Adapter SHALL cargar los journeys habilitados desde `ENABLED_JOURNEYS` o sus valores predeterminados.
2. IF `transaction` no esta habilitado, THEN THE Reference Adapter SHALL excluirlo de la ejecucion.
3. IF `transaction_status` no esta habilitado, THEN THE Reference Adapter SHALL excluirlo de la ejecucion.
4. IF no existe ningun journey habilitado, THEN THE Reference Adapter SHALL finalizar con un error explicito.

### Requirement 2: Configuracion Externa

**User Story:** Como tester de rendimiento, quiero cambiar la URL y los datos del escenario sin editar el codigo del adapter.

#### Acceptance Criteria

1. WHEN `BASE_URL` esta definido, THE Reference Adapter SHALL usarlo como URL base.
2. WHEN `DATASET_JSON` contiene datos validos, THE Reference Adapter SHALL combinarlos con el dataset predeterminado.
3. WHEN `JOURNEY_WEIGHTS` contiene pesos validos, THE Reference Adapter SHALL usarlos para seleccionar journeys.
4. THE Reference Adapter SHALL mantener credenciales e integraciones externas fuera del codigo fuente.

### Requirement 3: Metricas Y Resultados

**User Story:** Como tester de rendimiento, quiero distinguir los resultados por journey para analizar el comportamiento de una API.

#### Acceptance Criteria

1. WHEN un journey termina, THE Reference Adapter SHALL registrar su resultado con tags de proyecto, journey, operacion y metodo.
2. WHEN k6 genera el resumen, THE Reference Adapter SHALL incluir metricas globales y metricas por journey.
3. THE Reference Adapter SHALL generar archivos locales sin incluir secretos ni datos sensibles.

## Seguridad Y QA

- Los valores sensibles deben ingresar solo mediante variables de entorno seguras.
- Las pruebas automatizadas deben cubrir seleccion determinista, journeys opcionales y generacion del resumen.
