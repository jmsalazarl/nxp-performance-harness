import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";

export function transactionStatusJourney(baseUrl, transactionId) {
  return [
    request(baseUrl, "GET", `/api/v1/transactions/${encodeURIComponent(transactionId)}/status`, undefined, journeyTags("transaction_status", "status", "GET"), 200),
  ];
}
