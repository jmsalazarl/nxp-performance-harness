# Metrics Catalog

## Built-In K6 Metrics

- `http_req_duration`: total time for an HTTP request.
- `http_req_failed`: rate of failed HTTP requests.
- `http_req_waiting`: time waiting for the first response byte.
- `http_req_blocked`: time blocked before request execution.
- `http_req_connecting`: TCP connection time.
- `http_req_receiving`: response body receiving time.
- `http_req_tls_handshaking`: TLS handshake time.
- `http_req_sending`: request sending time.
- `iterations`: completed iteration count.
- `checks`: check success rate.
- `vus`: active virtual users.
- `vus_max`: maximum virtual users.

## Custom Metrics In This Project

- `waiting_time`: response waiting time captured from response timings.
- `Errors`: count of failed attempts.
- `Total_Reqs`: count of request attempts including retries.
- `retries`: retry count.
- `transaction_duration`: full transaction duration measured inside the scenario.
- `transactions_per_second`: estimated transaction throughput.
- `active_vus`: active VU sample captured during scenario execution.

## Recommended Threshold Examples

```js
{
  http_req_duration: ["p(95) < 2000"],
  http_req_failed: ["rate < 0.01"],
  waiting_time: ["avg < 1600"],
  Errors: ["count < 5"],
  iterations: ["count > 500"],
  retries: ["count < 10"],
  transactions_per_second: ["avg >= 2"],
  active_vus: ["avg > 5"]
}
```
