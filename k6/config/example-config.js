export default {
  endpoints: [
    {
      name: "Create resource",
      description: "Generic write endpoint example",
      url: "https://api.example.com/v1/resources",
      method: "POST",
      payload: { name: "Sample resource", value: "example" },
      headers: { "Content-Type": "application/json" },
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      loadtest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "2m", target: 10 },
          { duration: "30s", target: 0 }
        ]
,
        thresholds: {
          http_req_duration: ["p(95) < 2000"],
          http_req_failed: ["rate < 0.01"],
          waiting_time: ["avg < 1600"],
          Errors: ["count < 5"],
          iterations: ["count > 500"]
        }
      },
      stresstest: {
        stages: [
          { duration: "30s", target: 50 },
          { duration: "1m", target: 10 },
          { duration: "1m", target: 15 },
          { duration: "30s", target: 0 }
        ]
,
        thresholds: {
          http_req_duration: ["p(95) < 5000"],
          waiting_time: ["avg < 3500"],
          Errors: ["count < 20"],
          retries: ["count < 10"]
        }
      },
    },
    {
      name: "Get resource",
      url: "https://api.example.com/v1/resources/sample-resource",
      method: "GET",
      headers: { Authorization: "Bearer <token>" },
      expectedStatus: 200,
      maxRetries: 2,
      thinkTimeSeconds: 0.5,
      capacitytest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "1m", target: 20 },
          { duration: "1m", target: 15 },
          { duration: "30s", target: 0 }
        ]
,
        thresholds: {
          http_req_duration: ["p(95) < 3000"],
          waiting_time: ["avg < 1200"],
          Errors: ["count < 2"],
          http_req_failed: ["rate < 0.05"]
        }
      },
      stabilitytest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "2m", target: 10 },
          { duration: "30s", target: 0 }
        ]
,
        thresholds: {
          http_req_duration: ["avg < 2000", "p(95) < 2500"],
          waiting_time: ["avg < 1500"],
          Errors: ["count < 2"],
          http_req_failed: ["rate < 0.01"]
        }
      },
    }
  ]
};
