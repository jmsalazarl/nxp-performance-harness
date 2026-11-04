import { Counter, Rate, Trend } from "k6/metrics";
import { recordStageIteration, stageTags } from "../stages/context.js";
import { envString } from "../config/env.js";

export const journeyDuration = new Trend("journey_duration", true);
export const journeyFailed = new Rate("journey_failed");
export const journeyCompleted = new Counter("journey_completed");

export function journeyTags(journey, operation, method, type = "read") {
  return stageTags({ project: envString("PROJECT", "reference"), journey, operation, method, type });
}

export function recordJourney(journey, start, failed, tags) {
  const duration = Date.now() - start;
  const enrichedTags = stageTags(tags);
  journeyDuration.add(duration, enrichedTags);
  journeyFailed.add(failed, enrichedTags);
  if (!failed) journeyCompleted.add(1, enrichedTags);
  recordStageIteration(failed, duration);
}
