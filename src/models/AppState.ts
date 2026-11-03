/**
 * AppState - Root state interface for the Config Builder UI
 * 
 * This represents the complete application state maintained in React Context.
 * The state is held in memory during the browser session and is not persisted
 * in v1 (no localStorage or backend).
 */

import { EndpointDraft } from './EndpointDraft';

/**
 * The root application state
 */
export interface AppState {
  /** Array of endpoint drafts being configured */
  endpoints: EndpointDraft[];
  
  /** ID of the currently selected endpoint, or null if none selected */
  activeEndpointId: string | null;
}
