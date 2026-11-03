import { request } from "../../../core/http/request.js";
import { journeyTags } from "../../../core/metrics/journey.js";
import { selectByVu } from "../../../core/data/select.js";

export function writeJourney(baseUrl, data) {
  const itemCode = selectByVu(data.itemCodes);
  return [
    request(baseUrl, "GET", "/api/v1/resources", undefined, journeyTags("write", "list", "GET"), 200),
    request(baseUrl, "POST", "/api/v1/resources", { ...data.resource, itemCode }, journeyTags("write", "create", "POST", "write"), 201),
    request(baseUrl, "POST", "/api/v1/resources/validate", undefined, journeyTags("write", "validate", "POST", "write"), 200),
  ];
}
