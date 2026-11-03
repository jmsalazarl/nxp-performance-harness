/**
 * StageDraft - Draft state of a traffic stage
 * 
 * A stage defines a time period and target virtual user count within a test profile.
 */

/**
 * A traffic stage within a test profile
 */
export interface StageDraft {
  /** Duration in K6 time format (e.g., "30s", "2m", "1h") */
  duration: string;
  
  /** Target number of virtual users (0-10000) */
  target: number;
}
