import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";

export function transactionJourney(baseUrl, data) {
  const transaction = request(baseUrl, "POST", "/api/v1/transactions", data.transaction, journeyTags("transaction", "create", "POST", "write"), 201);
  const transactionId = transaction.response?.json?.("data")?.id || transaction.response?.json?.("id");
  if (!transactionId) return [transaction];
  return [transaction, request(baseUrl, "PATCH", `/api/v1/transactions/${encodeURIComponent(transactionId)}`, { status: "processed" }, journeyTags("transaction", "update", "PATCH", "write"), 200)];
}
