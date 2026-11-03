/**
 * ProfileDraft - Draft state of a test profile configuration
 * 
 * Each endpoint has 4 profiles (one per ProfileType).
 * A profile can be enabled or disabled. Only enabled profiles are exported.
 */

import { StageDraft } from './StageDraft';
import { ThresholdDraft } from './ThresholdDraft';

/**
 * Test profile types supported by K6 runner
 */
export type ProfileType = 'loadtest' | 'stresstest' | 'capacitytest' | 'stabilitytest';

/**
 * A test profile draft being configured
 */
export interface ProfileDraft {
  /** Profile type identifier */
  type: ProfileType;
  
  /** Whether this profile is enabled for the endpoint */
  enabled: boolean;
  
  /** Array of traffic stages (up to 20 per profile) */
  stages: StageDraft[];
  
  /** Array of threshold configurations */
  thresholds: ThresholdDraft[];
}
