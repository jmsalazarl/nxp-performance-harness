import http from "k6/http";
import { check } from "k6";
import { recordStageCheck, recordStageRequest, stageTags } from "../stages/context.js";

function bodyFor(method, payload) {
  if (["GET", "DELETE"].includes(method) || payload === undefined) return undefined;
  return JSON.stringify(payload);
}

function urlForGet(url, payload) {
  if (!payload || Object.keys(payload).length === 0) return url;
  const query = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `${url}${url.includes("?") ? "&" : "?"}${query}` : url;
}

export function request(baseUrl, method, path, payload, tags, expectedStatus = 200, headers = {}) {
  const normalizedMethod = method.toUpperCase();
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const enrichedTags = stageTags(tags);
  const params = { headers: { "Content-Type": "application/json", ...headers }, tags: enrichedTags };
  const requestUrl = normalizedMethod === "GET" ? urlForGet(url, payload) : url;
  const response = http.request(normalizedMethod, requestUrl, bodyFor(normalizedMethod, payload), params);
  const ok = check(response, { [`${tags.operation} status ${expectedStatus}`]: (value) => value.status === expectedStatus }, enrichedTags);
  recordStageCheck(ok);
  recordStageRequest(response.timings.duration, !ok);
  return { response, ok };
}
