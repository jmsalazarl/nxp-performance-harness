# Requirements Document

## Introduction

El framework necesita conocer el contexto de negocio y el comportamiento esperado de una aplicación antes de diseñar una prueba de performance. Esta funcionalidad agrega una encuesta inicial que transforma respuestas del usuario en un modelo de carga, supuestos explícitos y un plan de pruebas revisable.

La encuesta no debe presentar estimaciones como mediciones reales. Debe mostrar cómo se obtuvieron los valores, qué datos fueron proporcionados por el usuario, qué valores fueron derivados y qué supuestos requieren validación. El plan aprobado alimentará `stepped-capacity-discovery` y posteriormente `resource-profile-sizing`.

## Glossary

- **Analysis intake**: proceso inicial para recopilar contexto, demanda, comportamiento y SLO.
- **Workload model**: representación cuantitativa de usuarios, sesiones, operaciones, requests y picos esperados.
- **Business journey**: flujo de negocio que debe medirse como una unidad, por ejemplo búsqueda, checkout o login.
- **Peak window**: periodo de mayor demanda esperado dentro de una unidad de tiempo.
- **Peak multiplier**: factor aplicado a la carga normal para representar una condición pico o de estrés.
- **Arrival rate**: cantidad de iteraciones o journeys iniciados por unidad de tiempo.
- **Request rate**: cantidad de requests generados por unidad de tiempo.
- **Concurrency**: cantidad estimada de sesiones o journeys activos simultáneamente.
- **SLO**: objetivo medible de latencia, errores, disponibilidad u otra métrica de calidad.
- **Assumption**: valor no medido que se usa temporalmente para construir el modelo.
- **Confidence**: nivel de confianza del modelo según la calidad y cobertura de sus datos.
- **Reference source**: documento o investigación que respalda un rango o supuesto de comportamiento.

## Requirements

### Requirement 1: Creación de un análisis

**User Story:** Como responsable de una aplicación, quiero iniciar un análisis de performance con información de mi negocio, para obtener pruebas relacionadas con mi demanda real.

#### Acceptance Criteria

1. WHEN un usuario crea un análisis, THE Application SHALL solicitar el tipo de aplicación, objetivo del análisis, horizonte de crecimiento y contexto de despliegue.
2. WHEN se guarda una encuesta incompleta, THE Application SHALL conservar el progreso sin generar un plan ejecutable.
3. WHEN se completa una encuesta, THE Application SHALL registrar la versión de la encuesta y la fecha de generación del modelo.
4. THE Application SHALL permitir crear más de un análisis sin sobrescribir análisis anteriores.
5. THE Application SHALL not solicitar secretos, contraseñas, tokens, datos de tarjeta ni credenciales de infraestructura.

### Requirement 2: Demanda y crecimiento

**User Story:** Como usuario, quiero registrar cuántos clientes y usuarios espero tener, para proyectar la carga de los próximos meses.

#### Acceptance Criteria

1. WHEN el usuario responde la sección de demanda, THE Application SHALL solicitar valores actuales y proyectados para horizontes configurables, incluyendo seis y doce meses cuando apliquen.
2. WHEN el usuario proporciona usuarios activos diarios o mensuales, THE Application SHALL registrar la métrica, unidad, periodo y fuente del dato.
3. WHEN solo se proporciona una cantidad de clientes registrados, THE Application SHALL marcar como faltantes los datos necesarios para estimar usuarios activos.
4. WHEN se define crecimiento, THE Application SHALL distinguir crecimiento lineal, porcentaje periódico, evento puntual y valor manual.
5. THE Application SHALL mostrar los valores faltantes que pueden afectar la validez del workload model.

### Requirement 3: Comportamiento de usuarios y journeys

**User Story:** Como analista, quiero describir cómo usan los usuarios la aplicación, para convertir comportamiento de negocio en operaciones medibles.

#### Acceptance Criteria

1. WHEN se define un business journey, THE Application SHALL solicitar nombre, prioridad, porcentaje de usuarios, frecuencia, duración, operaciones y proporción de lectura/escritura.
2. WHEN un journey contiene varias operaciones, THE Application SHALL conservar su orden y cantidad esperada por ejecución.
3. WHEN el usuario identifica una operación crítica, THE Application SHALL permitir asociar SLO y prioridad específica.
4. WHEN faltan requests por operación, THE Application SHALL marcar el request rate como estimado y solicitar confirmación antes de generar el plan.
5. THE Application SHALL permitir declarar journeys síncronos, asíncronos y batch de forma separada.

### Requirement 4: Conversión a modelo de carga

**User Story:** Como analista, quiero que el sistema convierta las respuestas en tasas de carga, para preparar pruebas de capacidad, estrés y crecimiento.

#### Acceptance Criteria

1. WHEN existen usuarios activos, frecuencia, duración y distribución de pico, THE Application SHALL calcular arrival rate y concurrencia estimada.
2. WHEN existe el número de operaciones por journey, THE Application SHALL calcular request rate por journey y agregado.
3. WHEN existe un peak multiplier, THE Application SHALL generar escenarios normal, pico y estrés con sus supuestos visibles.
4. WHEN faltan datos para una conversión, THE Application SHALL dejar el valor como no disponible y explicar qué respuesta falta.
5. THE Application SHALL conservar valores ingresados, valores derivados y fórmulas utilizadas por separado.
6. THE Application SHALL not convertir usuarios registrados directamente en requests sin datos de actividad y comportamiento.

### Requirement 5: SLO, calidad y objetivos de prueba

**User Story:** Como responsable del producto, quiero declarar la calidad esperada, para que el framework determine cuándo una configuración deja de ser aceptable.

#### Acceptance Criteria

1. WHEN se completa la encuesta, THE Application SHALL solicitar objetivos de latencia p95, tasa máxima de errores y disponibilidad cuando apliquen.
2. WHEN el usuario define diferentes prioridades, THE Application SHALL permitir SLO por business journey.
3. WHEN no se proporciona un SLO, THE Application SHALL marcarlo como pendiente y no presentarlo como validado.
4. WHEN se define un objetivo de análisis, THE Application SHALL permitir seleccionar capacidad, carga, estrés, resistencia, regresión o combinación de estos.
5. THE Application SHALL mostrar qué criterios se utilizarán para aceptar o rechazar cada escenario.

### Requirement 6: Supuestos, referencias y confianza

**User Story:** Como usuario, quiero conocer de dónde salen las estimaciones, para decidir si el plan representa mi aplicación.

#### Acceptance Criteria

1. WHEN un valor es derivado o no fue medido, THE Application SHALL registrarlo como assumption con descripción y nivel de confianza.
2. WHEN una referencia externa respalda un rango, THE Application SHALL registrar título, URL, fecha de consulta, contexto y dato respaldado.
3. THE Application SHALL permitir referencias técnicas y académicas sin depender de una consulta web durante la ejecución del benchmark.
4. WHEN la información es insuficiente o contradictoria, THE Application SHALL reducir la confianza y solicitar revisión.
5. THE Application SHALL distinguir confianza alta, media y baja con reglas documentadas.

### Requirement 7: Generación y aprobación del plan

**User Story:** Como responsable de performance, quiero revisar el plan generado antes de ejecutar cargas, para evitar pruebas basadas en supuestos incorrectos.

#### Acceptance Criteria

1. WHEN el workload model tiene datos mínimos válidos, THE Application SHALL generar escenarios de carga con targets, duración, perfil de prueba y criterios de aceptación.
2. WHEN se genera un plan, THE Application SHALL proponer stages para `capacity-stepped` sin ejecutar la prueba automáticamente.
3. WHEN el plan contiene supuestos de baja confianza, THE Application SHALL resaltarlos antes de solicitar aprobación.
4. WHEN el usuario aprueba el plan, THE Application SHALL congelar la versión de entrada y asociarla al análisis.
5. WHEN el usuario modifica una respuesta aprobada, THE Application SHALL crear una nueva versión y marcar el plan anterior como obsoleto sin sobrescribirlo.

### Requirement 8: Integración con sizing y trazabilidad

**User Story:** Como consumidor del framework, quiero usar el plan aprobado en sizing de recursos, para relacionar demanda de negocio con hardware medido.

#### Acceptance Criteria

1. WHEN existe un plan aprobado, THE Framework SHALL exportar un workload contract consumible por `stepped-capacity-discovery`.
2. WHEN `resource-profile-sizing` utiliza un workload contract, THE Framework SHALL registrar el analysis ID, versión y supuestos de origen.
3. THE Framework SHALL conservar trazabilidad entre respuestas, valores derivados, escenarios, runs y recomendaciones de recursos.
4. WHEN el workload contract cambia, THE Framework SHALL impedir la comparación silenciosa con runs de otra versión.
5. THE Framework SHALL mantener los datos de análisis separados de secretos y configuraciones privadas del adapter.

## Alcance MVP

- Wizard de encuesta para contexto, demanda, journeys, SLO y objetivos de prueba.
- Persistencia versionada de respuestas.
- Cálculo de arrival rate, request rate y concurrencia estimada.
- Escenarios normal, pico y estrés con supuestos visibles.
- Registro de referencias externas de forma manual y reproducible.
- Nivel de confianza y lista de datos faltantes.
- Generación de workload contract y plan revisable.
- Aprobación explícita antes de ejecutar pruebas.
- Integración documentada con `stepped-capacity-discovery` y `resource-profile-sizing`.

## Fuera De Alcance Inicial

- Búsqueda web automática durante una ejecución.
- Decisiones automáticas de hardware sin medición controlada.
- Interpretación automática de cualquier investigación sin revisión humana.
- Predicción exacta de usuarios a partir únicamente de clientes registrados.
- Recomendación de proveedores cloud.
- Recolección automática de datos privados de analítica del negocio.

## Supuestos Iniciales

- El usuario conoce o puede estimar al menos un journey de negocio.
- El workload contract es una hipótesis hasta que una ejecución real lo valide.
- La primera versión usará reglas determinísticas y fórmulas visibles.
- El headroom y las repeticiones pertenecerán a la configuración de sizing y QA, aunque la encuesta pueda capturar contexto para recomendarlos.
- Las referencias externas se almacenarán como evidencia, no como autoridad automática.

## Preguntas Abiertas

- Debe definirse el conjunto inicial de tipos de aplicación y journeys sugeridos.
- Debe definirse el mínimo de respuestas requerido para cada tipo de prueba.
- Debe definirse el rango de escenarios por defecto para normal, pico y estrés.
- Debe definirse la política de privacidad y retención para datos de negocio ingresados en el análisis.
