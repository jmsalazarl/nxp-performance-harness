import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";

export function healthJourney(baseUrl) {
  return [request(baseUrl, "GET", "/health", undefined, journeyTags("health", "health", "GET"), 200)];
}
