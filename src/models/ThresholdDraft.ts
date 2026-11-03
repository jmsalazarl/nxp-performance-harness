/**
 * ThresholdDraft - Draft state of a threshold configuration
 * 
 * A threshold defines success/failure rules for a K6 metric.
 * Each metric can have 1-10 threshold expressions.
 */

/**
 * A threshold configuration for a specific metric
 */
export interface ThresholdDraft {
  /** K6 metric name (e.g., "http_req_duration", "http_req_failed") or custom metric */
  metric: string;
  
  /** Array of threshold expressions (e.g., ["p(95) < 2000", "avg < 500"]) */
  expressions: string[];
}
