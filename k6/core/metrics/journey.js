import { Counter, Rate, Trend } from "k6/metrics";

export const journeyDuration = new Trend("journey_duration", true);
export const journeyFailed = new Rate("journey_failed");
export const journeyCompleted = new Counter("journey_completed");

export function journeyTags(journey, operation, method, type = "read") {
  return { project: "reference", journey, operation, method, type };
}

export function recordJourney(journey, start, failed, tags) {
  journeyDuration.add(Date.now() - start, tags);
  journeyFailed.add(failed, tags);
  if (!failed) journeyCompleted.add(1, tags);
}
