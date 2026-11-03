/**
 * EndpointDraft - Draft state of an endpoint configuration
 * 
 * This interface represents an endpoint while it's being edited in the UI.
 * Text fields (headersText, payloadText) store JSON as strings for editing.
 * Upon export, these are parsed and serialized into the final config.js.
 */

import { ProfileDraft } from './ProfileDraft';

/**
 * HTTP methods supported by K6
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * An endpoint draft being configured in the UI
 */
export interface EndpointDraft {
  /** Unique identifier for this endpoint draft (UUID) */
  id: string;
  
  /** Display name for the endpoint (e.g., "Endpoint 1") */
  name: string;
  
  /** Optional description of the endpoint */
  description: string;
  
  /** Target API URL (must start with http:// or https://) */
  url: string;
  
  /** HTTP method */
  method: HttpMethod;
  
  /** Headers as JSON text string (edited as text, validated as JSON object) */
  headersText: string;
  
  /** Payload as JSON text string (edited as text, validated as JSON) */
  payloadText: string;
  
  /** Expected HTTP status code (100-599) */
  expectedStatus: number;
  
  /** Maximum retry attempts on failure (0-10) */
  maxRetries: number;
  
  /** Think time between iterations in seconds (0-60) */
  thinkTimeSeconds: number;
  
  /** Array of 4 profile drafts (loadtest, stresstest, capacitytest, stabilitytest) */
  profiles: ProfileDraft[];
}
