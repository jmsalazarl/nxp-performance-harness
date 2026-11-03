export const REFERENCE_DEFAULTS = {
  project: "reference",
  baseUrl: "http://localhost:8080",
  enabledJourneys: ["list", "detail"],
  weights: { list: 70, detail: 30, write: 0, transaction: 0, transaction_status: 0, health: 0 },
};
