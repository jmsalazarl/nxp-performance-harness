export default {
  endpoints: [
    {
      name: "List resources",
      description: "Generic read endpoint for local or sandbox execution",
      url: "https://api.example.com/v1/resources",
      method: "GET",
      headers: { "Content-Type": "application/json" },
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      loadtest: {
        stages: [
          { duration: "30s", target: 5 },
          { duration: "2m", target: 5 },
          { duration: "30s", target: 0 }
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2000"],
          http_req_failed: ["rate < 0.01"]
        }
      },
      stresstest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "1m", target: 20 },
          { duration: "1m", target: 10 },
          { duration: "30s", target: 0 }
        ],
        thresholds: {
          http_req_duration: ["p(95) < 5000"],
          http_req_failed: ["rate < 0.01"]
        }
      },
      capacitytest: {
        stages: [
          { duration: "30s", target: 10 },
          { duration: "1m", target: 20 },
          { duration: "1m", target: 15 },
          { duration: "30s", target: 0 }
        ],
        thresholds: {
          http_req_duration: ["p(95) < 3000"],
          http_req_failed: ["rate < 0.05"]
        }
      },
      stabilitytest: {
        stages: [
          { duration: "30s", target: 5 },
          { duration: "2m", target: 5 },
          { duration: "30s", target: 0 }
        ],
        thresholds: {
          http_req_duration: ["p(95) < 2500"],
          http_req_failed: ["rate < 0.01"]
        }
      }
    }
  ]
};
