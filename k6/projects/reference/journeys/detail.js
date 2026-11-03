import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";
import { selectByVu } from "../../../core/data/select.js";

export function detailJourney(baseUrl, data) {
  const resourceId = selectByVu(data.resourceIds);
  return [
    request(baseUrl, "GET", `/api/v1/resources/${encodeURIComponent(resourceId)}`, undefined, journeyTags("detail", "resource", "GET"), 200),
    request(baseUrl, "GET", `/api/v1/resources/${encodeURIComponent(resourceId)}/metadata`, undefined, journeyTags("detail", "metadata", "GET"), 200),
  ];
}
