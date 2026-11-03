# Requirements Document

## Introduction

Esta funcionalidad proporciona una interfaz web local en el navegador que guía a los testers a través de la configuración de endpoints y escenarios, valida la entrada, muestra una vista previa del JavaScript generado y permite descargar un `config.js` listo para ejecutar.

## Glossary

- **System**: La aplicación web Config Builder UI que se ejecuta localmente en el navegador.
- **Endpoint**: Una configuración de destino API individual que contiene URL, método, headers, payload y ajustes de perfil de prueba.
- **Profile**: Una definición de forma de carga con nombre (loadtest, stresstest, capacitytest o stabilitytest) que contiene stages y thresholds.
- **Stage**: Un paso dentro de un perfil que define una `duration` y un `target` de usuarios virtuales.
- **Threshold**: Una regla de aprobación/fallo expresada como cadena (ej., `"p(95) < 2000"`) aplicada a una métrica de K6.
- **Draft_Config**: El estado de configuración en progreso mantenido en la sesión del navegador antes de exportar.
- **Export**: La acción de generar y descargar el archivo final `config.js`.
- **Runner**: El script K6 `performancetest.js` que importa y ejecuta la configuración generada.

## Requirements

### Requirement 1: Interfaz Web Local

**User Story:** Como tester, quiero una interfaz web local, para poder crear configuraciones K6 sin editar JavaScript manualmente.

#### Acceptance Criteria

1. WHEN la aplicación se abre en un navegador desde un archivo HTML estático, THE System SHALL mostrar el espacio de trabajo del config builder con un área de lista de endpoints y un área de edición de detalles, sin requerir backend ni conexión de red.
2. WHEN la aplicación se inicializa sin datos de sesión previos, THE System SHALL mostrar una lista de endpoints vacía con un control visible para crear un nuevo endpoint.
3. WHEN el usuario edita datos, THE System SHALL mantener el estado borrador en la memoria del navegador durante la sesión de página actual, de modo que la navegación dentro de la aplicación no descarte cambios sin guardar.
4. WHEN el usuario recarga la página en v1, THE System SHALL cargar un estado vacío fresco sin requerir datos del lado del servidor, y cualquier estado borrador previo de la sesión anterior puede descartarse.
5. IF el navegador no soporta ES modules, THEN THE System SHALL mostrar un mensaje indicando que se requiere un navegador moderno con soporte de ES modules.

### Requirement 2: Gestión de Endpoints

**User Story:** Como tester, quiero gestionar múltiples endpoints, para que una configuración pueda cubrir múltiples transacciones API.

#### Acceptance Criteria

1. WHEN el usuario crea un endpoint, THE System SHALL agregarlo a la lista de endpoints con una etiqueta por defecto que lo distinga de las entradas existentes, hasta un máximo de 50 endpoints.
2. WHEN el usuario selecciona un endpoint, THE System SHALL indicar visualmente el endpoint seleccionado en la lista y mostrar sus detalles editables (URL, método, headers, payload, perfiles y thresholds).
3. WHEN el usuario duplica un endpoint, THE System SHALL crear un endpoint separado e independientemente editable con todos los valores de campos copiados de la fuente y una etiqueta modificada indicando que es una copia.
4. WHEN el usuario elimina un endpoint, THE System SHALL presentar un diálogo de confirmación y, tras la aceptación del usuario, eliminar el endpoint de la configuración borrador.
5. IF no existen endpoints en la configuración borrador, THEN THE System SHALL deshabilitar la acción de exportar y mostrar un mensaje indicando que se requiere al menos un endpoint.

### Requirement 3: Configuración de Detalles de Solicitud

**User Story:** Como tester, quiero configurar los detalles de la solicitud, para que la configuración generada represente con precisión mi llamada API.

#### Acceptance Criteria

1. WHEN un endpoint es editado, THE System SHALL permitir editar URL, método, estado esperado (entero, 100 a 599), reintentos máximos (entero, 0 a 10), y tiempo de espera en segundos (número, 0 a 60).
2. WHEN un método es seleccionado, THE System SHALL restringir el valor a `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
3. WHEN los headers son editados, THE System SHALL validar que los headers sean un objeto JSON (rechazando arrays, primitivos y JSON malformado).
4. WHEN el payload es editado, THE System SHALL validar que el payload sea JSON válido.
5. WHEN el método seleccionado es `GET`, THE System SHALL etiquetar el campo de payload como parámetros de consulta y serializar sus pares clave-valor JSON como parámetros de consulta URL en la configuración generada.
6. WHEN un campo pierde el foco o su valor cambia, THE System SHALL ejecutar la validación y mostrar cualquier mensaje de error en línea junto al campo relacionado dentro de 500 milisegundos.
7. IF el campo URL está vacío o no comienza con `http://` o `https://`, THEN THE System SHALL mostrar un error de validación junto al campo URL.
8. IF un valor de campo numérico está fuera de su rango permitido, THEN THE System SHALL mostrar un error de validación indicando los valores mínimo y máximo aceptados.

### Requirement 4: Configuración Visual de Perfiles

**User Story:** Como tester, quiero configurar perfiles de prueba visualmente, para poder definir formas de carga sin escribir objetos de configuración a mano.

#### Acceptance Criteria

1. WHEN el usuario abre la edición de perfiles, THE System SHALL mostrar controles de alternancia para cada uno de los cuatro tipos de perfil: loadtest, stresstest, capacitytest y stabilitytest.
2. WHEN el usuario habilita un perfil, THE System SHALL mostrar una lista de stages para ese perfil y permitir agregar stages hasta un máximo de 20 stages por perfil.
3. WHEN el usuario edita un stage, THE System SHALL proporcionar campos de entrada para `duration` (una cadena de tiempo en formato K6, ej. "30s", "2m", "1h") y `target` (un entero de 0 a 10000 representando usuarios virtuales).
4. IF el usuario ingresa un valor de `duration` que no coincide con el formato de tiempo K6 o un valor de `target` fuera del rango 0–10000, THEN THE System SHALL mostrar un error de validación en el campo correspondiente e impedir guardar ese stage.
5. WHEN el usuario reordena stages mediante arrastrar o controles de movimiento, THE System SHALL preservar el nuevo orden en la salida de configuración generada.
6. WHEN el usuario deshabilita un perfil, THE System SHALL omitir ese perfil de la configuración del endpoint generada.
7. IF un perfil habilitado tiene cero stages definidos, THEN THE System SHALL deshabilitar la acción de exportar y mostrar una indicación identificando cuál perfil carece de stages.
8. IF ningún perfil está habilitado, THEN THE System SHALL deshabilitar la acción de exportar e indicar que al menos un perfil debe estar habilitado.

### Requirement 5: Configuración de Thresholds

**User Story:** Como tester, quiero configurar thresholds con sugerencias de métricas, para que las reglas de aprobación/fallo sean más fáciles de definir correctamente.

#### Acceptance Criteria

1. WHEN el usuario edita thresholds, THE System SHALL mostrar las siguientes métricas K6 como sugerencias seleccionables: `http_req_duration`, `http_req_failed`, `http_reqs`, `http_req_waiting`, `http_req_blocked`, `http_req_connecting`, `http_req_receiving`, `http_req_tls_handshaking`, `http_req_sending`, `iteration_duration`, `iterations`, y cualquier métrica personalizada del proyecto definida en la configuración borrador actual.
2. WHEN el usuario selecciona una métrica, THE System SHALL permitir entre 1 y 10 expresiones de threshold para esa métrica.
3. WHEN el usuario ingresa un nombre de métrica personalizada, THE System SHALL permitirlo si el nombre contiene entre 1 y 128 caracteres consistiendo solo en letras, dígitos y guiones bajos, y no es solo espacios en blanco.
4. IF una expresión de threshold está vacía o contiene solo espacios en blanco, THEN THE System SHALL bloquear la exportación y mostrar un error de validación junto a la expresión inválida.
5. WHEN los thresholds son generados, THE System SHALL serializar los valores como arrays de cadenas que coincidan con el formato de threshold de K6 (ej., `["p(95) < 2000", "avg < 500"]`).
6. IF una métrica ha sido agregada pero no tiene expresiones de threshold definidas, THEN THE System SHALL bloquear la exportación e indicar que se requiere al menos una expresión para cada métrica.

### Requirement 6: Vista Previa y Descarga

**User Story:** Como tester, quiero revisar y descargar la configuración generada, para poder verificar el archivo final antes de ejecutar K6.

#### Acceptance Criteria

1. WHEN la configuración borrador es válida, THE System SHALL generar una vista previa mostrando el contenido completo del archivo `config.js` como JavaScript de módulo ES sintácticamente válido usando la estructura `export default { ... }`.
2. WHEN el usuario hace clic en descargar, THE System SHALL descargar un archivo nombrado `config.js` cuyo contenido sea byte por byte idéntico al contenido de la vista previa.
3. IF la configuración borrador es inválida, THEN THE System SHALL deshabilitar la acción de descarga y mostrar un mensaje indicando cuáles errores de validación deben resolverse.
4. WHEN la vista previa se muestra, THE System SHALL renderizar la salida con indentación consistente de 2 espacios y ordenamiento de claves alfabéticamente estable de modo que entrada idéntica siempre produzca salida idéntica.
5. WHEN uno o más perfiles están configurados, THE System SHALL mostrar un comando sugerido `k6 run -e TEST_TYPE=<profile> performancetest.js` por cada perfil configurado, listando solo perfiles que estén habilitados en al menos un endpoint.

### Requirement 7: Valores por Defecto Seguros

**User Story:** Como tester, quiero valores por defecto seguros, para poder crear una solicitud válida rápidamente.

#### Acceptance Criteria

1. WHEN un nuevo endpoint es creado, THE System SHALL establecer `method` por defecto a `POST`.
2. WHEN un nuevo endpoint es creado, THE System SHALL establecer headers por defecto a `{ "Content-Type": "application/json" }`.
3. WHEN un nuevo endpoint es creado, THE System SHALL establecer payload por defecto a `{}`.
4. WHEN un nuevo endpoint es creado, THE System SHALL establecer `expectedStatus` por defecto a `200`.
5. WHEN un nuevo endpoint es creado, THE System SHALL establecer `maxRetries` por defecto a `3`.
6. WHEN un nuevo endpoint es creado, THE System SHALL establecer `thinkTimeSeconds` por defecto a `1`.
7. WHEN un nuevo stage es creado dentro de cualquier perfil, THE System SHALL establecerlo por defecto a `{ duration: "30s", target: 1 }`.
8. WHEN un nuevo endpoint es creado, THE System SHALL establecer `url` por defecto a una cadena vacía y marcar el endpoint como inválido para exportación hasta que el usuario proporcione una URL no vacía.
9. IF el usuario limpia un campo con valor por defecto (`method`, `expectedStatus`, `maxRetries`, o `thinkTimeSeconds`) a un valor vacío, THEN THE System SHALL mostrar un error de validación en ese campo y bloquear la exportación hasta que se restaure un valor válido.
