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

## Reporting Gap

The current runner does not export a standard summary JSON. The `k6-summary-export` spec defines the minimal `handleSummary(data)` addition needed for dashboard uploads.
