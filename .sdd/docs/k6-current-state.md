# K6 Current State

## Files

- `config.js`: exports endpoint and scenario configuration.
- `performancetest.js`: imports the config, builds K6 scenarios, executes HTTP requests, and records metrics.

## Execution

The runner requires `TEST_TYPE`:

```bash
k6 run -e TEST_TYPE=loadtest performancetest.js
```

Supported values:

- `loadtest`
- `stresstest`
- `capacitytest`
- `stabilitytest`

## Request Behavior

- Endpoints are filtered by the selected test profile.
- One K6 scenario is created per matching endpoint.
- Request values are injected through scenario environment variables.
- `GET` requests convert payload object fields into query parameters.
- `POST`, `PUT`, `PATCH`, and `DELETE` send the serialized payload.

## Metrics

The runner uses K6 built-in HTTP metrics and custom metrics:

- `waiting_time`
- `Errors`
- `Total_Reqs`
- `retries`
- `transaction_duration`
- `transactions_per_second`
- `active_vus`

## Capacity Discovery

El run anterior de `capacity-discovery` se clasifica como `UNCONSTRAINED LOCAL RAMP DISCOVERY`. Su perfil utilizó `ramping-arrival-rate` con `startRate=3` y rampas lineales hacia 3, 5, 10, 20 y 40 iteraciones por segundo. Alcanzar 40 iteraciones por segundo confirma que el target fue alcanzado, pero no demuestra una meseta sostenida de cuatro minutos a esa tasa.

El perfil `capacity-stepped` separa warm-up, transiciones y ventanas `measurement` sostenidas de 20, 40, 60 y 80 iteraciones por segundo. Solo las ventanas `measurement` se utilizan para determinar capacidad sostenida.

El archivo `stage-summary.json` contiene métricas por ventana y la correlación posterior con `docker-host-stats.csv`. Los adapters externos deben permanecer fuera del repositorio público y consumir las utilidades core de stages para obtener métricas completas.
