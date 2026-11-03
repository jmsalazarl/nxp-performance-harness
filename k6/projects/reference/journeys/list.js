import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";

export function listJourney(baseUrl) {
  return [
    ["GET", "/api/v1/resources", "resources"],
    ["GET", "/api/v1/resources/filters", "filters"],
    ["GET", "/api/v1/resource-groups", "resource_groups"],
    ["GET", "/api/v1/resource-groups/featured", "featured_groups"],
  ].map(([method, path, operation]) => request(baseUrl, method, path, undefined, journeyTags("list", operation, method), 200));
}
