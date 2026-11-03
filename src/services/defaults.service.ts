/**
 * DefaultsService - Provides default values for creating and duplicating drafts
 * 
 * This service centralizes all default value logic for endpoints, stages, and profiles.
 * It ensures consistency across the UI when creating new entities.
 * 
 * @validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 2.3
 */

import { EndpointDraft } from '../models/EndpointDraft';
import { StageDraft } from '../models/StageDraft';
import { ProfileDraft, ProfileType } from '../models/ProfileDraft';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for defaults service operations
 */
export interface IDefaultsService {
  createEndpoint(existingNames: string[]): EndpointDraft;
  createStage(): StageDraft;
  duplicateEndpoint(source: EndpointDraft): EndpointDraft;
}

/**
 * Creates a new endpoint with safe default values
 * 
 * Default values (Requirements 7.1-7.8):
 * - method: POST
 * - headersText: {"Content-Type":"application/json"}
 * - payloadText: {}
 * - expectedStatus: 200
 * - maxRetries: 3
 * - thinkTimeSeconds: 1
 * - url: "" (empty, marked invalid until user provides valid URL)
 * - profiles: 4 disabled profiles (loadtest, stresstest, capacitytest, stabilitytest)
 * 
 * @param existingNames - Array of existing endpoint names to avoid duplicates
 * @returns A new EndpointDraft with default values
 */
export function createEndpoint(existingNames: string[]): EndpointDraft {
  // Generate unique name
  let counter = 1;
  let candidateName = `Endpoint ${counter}`;
  while (existingNames.includes(candidateName)) {
    counter++;
    candidateName = `Endpoint ${counter}`;
  }

  // Create 4 disabled profiles (one per type)
  const profileTypes: ProfileType[] = ['loadtest', 'stresstest', 'capacitytest', 'stabilitytest'];
  const profiles: ProfileDraft[] = profileTypes.map((type) => ({
    type,
    enabled: false,
    stages: [],
    thresholds: [],
  }));

  return {
    id: uuidv4(),
    name: candidateName,
    description: '',
    url: '', // Empty, invalid until user provides URL (Requirement 7.8)
    method: 'POST', // Requirement 7.1
    headersText: '{"Content-Type":"application/json"}', // Requirement 7.2
    payloadText: '{}', // Requirement 7.3
    expectedStatus: 200, // Requirement 7.4
    maxRetries: 3, // Requirement 7.5
    thinkTimeSeconds: 1, // Requirement 7.6
    profiles, // 4 disabled profiles
  };
}

/**
 * Creates a new stage with safe default values
 * 
 * Default values (Requirement 7.7):
 * - duration: "30s"
 * - target: 1
 * 
 * @returns A new StageDraft with default values
 */
export function createStage(): StageDraft {
  return {
    duration: '30s', // Requirement 7.7
    target: 1, // Requirement 7.7
  };
}

/**
 * Duplicates an existing endpoint with a new ID and modified name
 * 
 * Creates a deep copy of the source endpoint with:
 * - New UUID
 * - Modified name indicating it's a copy
 * - All other fields (url, method, headers, payload, profiles, stages, thresholds) copied
 * 
 * Modifications to the duplicate do not affect the original (Requirement 2.3).
 * 
 * @param source - The endpoint to duplicate
 * @returns A new EndpointDraft that is an independent copy of the source
 */
export function duplicateEndpoint(source: EndpointDraft): EndpointDraft {
  // Deep clone the source to ensure independence
  const duplicate: EndpointDraft = {
    id: uuidv4(), // New unique ID
    name: `${source.name} (copy)`, // Modified name indicating copy
    description: source.description,
    url: source.url,
    method: source.method,
    headersText: source.headersText,
    payloadText: source.payloadText,
    expectedStatus: source.expectedStatus,
    maxRetries: source.maxRetries,
    thinkTimeSeconds: source.thinkTimeSeconds,
    // Deep clone profiles to ensure independence
    profiles: source.profiles.map((profile) => ({
      type: profile.type,
      enabled: profile.enabled,
      // Deep clone stages
      stages: profile.stages.map((stage) => ({
        duration: stage.duration,
        target: stage.target,
      })),
      // Deep clone thresholds
      thresholds: profile.thresholds.map((threshold) => ({
        metric: threshold.metric,
        expressions: [...threshold.expressions], // Clone array
      })),
    })),
  };

  return duplicate;
}

/**
 * Concrete implementation of IDefaultsService
 */
export const DefaultsService: IDefaultsService = {
  createEndpoint,
  createStage,
  duplicateEndpoint,
};
