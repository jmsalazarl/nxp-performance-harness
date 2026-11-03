/**
 * configReducer - State management reducer for Config Builder UI
 * 
 * This reducer handles all state transitions for the Config Builder application.
 * It manages endpoints, profiles, stages, and thresholds with immutable updates.
 * 
 * Features:
 * - Endpoint CRUD operations (add, update, delete, duplicate)
 * - Active endpoint selection
 * - Profile management (toggle enable/disable)
 * - Stage management (add, remove, reorder, update)
 * - Threshold management (add, remove, update expressions)
 * - Collection limit enforcement (MAX_ENDPOINTS, MAX_STAGES, MAX_EXPRESSIONS)
 * - Immutable state updates using spread operator
 * - Integration with DefaultsService for creating new entities
 * 
 * @validates Requirements 2.1-2.5, 3.1-3.8, 4.1-4.8, 5.1-5.6
 */

import { AppState } from '../models/AppState';
import { EndpointDraft } from '../models/EndpointDraft';
import { ProfileType } from '../models/ProfileDraft';
import { StageDraft } from '../models/StageDraft';
import { ThresholdDraft } from '../models/ThresholdDraft';
import { DefaultsService } from '../services/defaults.service';
import { MAX_ENDPOINTS, MAX_STAGES, MAX_EXPRESSIONS } from '../utils/constants';

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Union type of all possible actions for the config reducer
 */
export type ConfigAction =
  | { type: 'HYDRATE_STATE'; state: AppState }
  // Endpoint actions
  | { type: 'ADD_ENDPOINT' }
  | { type: 'UPDATE_ENDPOINT'; id: string; patch: Partial<EndpointDraft> }
  | { type: 'DELETE_ENDPOINT'; id: string }
  | { type: 'DUPLICATE_ENDPOINT'; id: string }
  | { type: 'SET_ACTIVE_ENDPOINT'; id: string | null }
  // Stage actions
  | { type: 'ADD_STAGE'; endpointId: string; profileType: ProfileType }
  | { type: 'DELETE_STAGE'; endpointId: string; profileType: ProfileType; stageIndex: number }
  | {
      type: 'REORDER_STAGES';
      endpointId: string;
      profileType: ProfileType;
      fromIndex: number;
      toIndex: number;
    }
  | {
      type: 'UPDATE_STAGE';
      endpointId: string;
      profileType: ProfileType;
      stageIndex: number;
      patch: Partial<StageDraft>;
    }
  // Profile actions
  | { type: 'TOGGLE_PROFILE'; endpointId: string; profileType: ProfileType }
  | {
      type: 'APPLY_PROFILE_TEMPLATE';
      endpointId: string;
      profileType: ProfileType;
      stages: StageDraft[];
      thresholds: ThresholdDraft[];
    }
  // Threshold actions
  | { type: 'ADD_THRESHOLD'; endpointId: string; profileType: ProfileType; metric: string }
  | { type: 'DELETE_THRESHOLD'; endpointId: string; profileType: ProfileType; metric: string }
  | {
      type: 'UPDATE_THRESHOLD_EXPRESSIONS';
      endpointId: string;
      profileType: ProfileType;
      metric: string;
      expressions: string[];
    };

// ============================================================================
// REDUCER IMPLEMENTATION
// ============================================================================

/**
 * Main reducer function for config state management
 * 
 * All updates are immutable - creates new objects/arrays instead of mutating.
 * Enforces collection limits before adding new items.
 * 
 * @param state - Current application state
 * @param action - Action to perform
 * @returns New state after applying the action
 */
export function configReducer(state: AppState, action: ConfigAction): AppState {
  switch (action.type) {
    case 'HYDRATE_STATE': {
      return {
        endpoints: action.state.endpoints,
        activeEndpointId: action.state.activeEndpointId,
      };
    }

    // ========================================================================
    // ENDPOINT ACTIONS
    // ========================================================================

    case 'ADD_ENDPOINT': {
      // Enforce MAX_ENDPOINTS limit (Requirement 2.1)
      if (state.endpoints.length >= MAX_ENDPOINTS) {
        console.warn(`Cannot add endpoint: Maximum of ${MAX_ENDPOINTS} endpoints reached`);
        return state;
      }

      const existingNames = state.endpoints.map((ep) => ep.name);
      const newEndpoint = DefaultsService.createEndpoint(existingNames);

      return {
        ...state,
        endpoints: [...state.endpoints, newEndpoint],
        activeEndpointId: newEndpoint.id, // Auto-select newly created endpoint
      };
    }

    case 'UPDATE_ENDPOINT': {
      const { id, patch } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) =>
          endpoint.id === id
            ? { ...endpoint, ...patch } // Immutable update with spread
            : endpoint
        ),
      };
    }

    case 'DELETE_ENDPOINT': {
      const { id } = action;

      const filteredEndpoints = state.endpoints.filter((ep) => ep.id !== id);

      // If deleting the active endpoint, clear selection or select first remaining
      let newActiveId = state.activeEndpointId;
      if (state.activeEndpointId === id) {
        newActiveId = filteredEndpoints.length > 0 && filteredEndpoints[0] ? filteredEndpoints[0].id : null;
      }

      return {
        ...state,
        endpoints: filteredEndpoints,
        activeEndpointId: newActiveId,
      };
    }

    case 'DUPLICATE_ENDPOINT': {
      const { id } = action;

      // Enforce MAX_ENDPOINTS limit
      if (state.endpoints.length >= MAX_ENDPOINTS) {
        console.warn(`Cannot duplicate endpoint: Maximum of ${MAX_ENDPOINTS} endpoints reached`);
        return state;
      }

      const sourceEndpoint = state.endpoints.find((ep) => ep.id === id);
      if (!sourceEndpoint) {
        console.warn(`Cannot duplicate endpoint: Endpoint with id ${id} not found`);
        return state;
      }

      // Use DefaultsService to create independent duplicate (Requirement 2.3)
      const duplicateEndpoint = DefaultsService.duplicateEndpoint(sourceEndpoint);

      return {
        ...state,
        endpoints: [...state.endpoints, duplicateEndpoint],
        activeEndpointId: duplicateEndpoint.id, // Auto-select duplicated endpoint
      };
    }

    case 'SET_ACTIVE_ENDPOINT': {
      const { id } = action;

      // Validate that the endpoint exists (unless setting to null)
      if (id !== null && !state.endpoints.find((ep) => ep.id === id)) {
        console.warn(`Cannot set active endpoint: Endpoint with id ${id} not found`);
        return state;
      }

      return {
        ...state,
        activeEndpointId: id,
      };
    }

    // ========================================================================
    // STAGE ACTIONS
    // ========================================================================

    case 'ADD_STAGE': {
      const { endpointId, profileType } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              // Enforce MAX_STAGES limit (Requirement 4.2)
              if (profile.stages.length >= MAX_STAGES) {
                console.warn(
                  `Cannot add stage: Maximum of ${MAX_STAGES} stages per profile reached`
                );
                return profile;
              }

              const newStage = DefaultsService.createStage();

              return {
                ...profile,
                stages: [...profile.stages, newStage],
              };
            }),
          };
        }),
      };
    }

    case 'DELETE_STAGE': {
      const { endpointId, profileType, stageIndex } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                stages: profile.stages.filter((_, index) => index !== stageIndex),
              };
            }),
          };
        }),
      };
    }

    case 'REORDER_STAGES': {
      const { endpointId, profileType, fromIndex, toIndex } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              // Create new array with reordered stages (Requirement 4.5)
              const newStages = [...profile.stages];
              const [movedStage] = newStages.splice(fromIndex, 1);
              if (movedStage) {
                newStages.splice(toIndex, 0, movedStage);
              }

              return {
                ...profile,
                stages: newStages,
              };
            }),
          };
        }),
      };
    }

    case 'UPDATE_STAGE': {
      const { endpointId, profileType, stageIndex, patch } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                stages: profile.stages.map((stage, index) =>
                  index === stageIndex
                    ? { ...stage, ...patch } // Immutable update
                    : stage
                ),
              };
            }),
          };
        }),
      };
    }

    // ========================================================================
    // PROFILE ACTIONS
    // ========================================================================

    case 'TOGGLE_PROFILE': {
      const { endpointId, profileType } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                enabled: !profile.enabled, // Toggle enabled state
              };
            }),
          };
        }),
      };
    }

    case 'APPLY_PROFILE_TEMPLATE': {
      const { endpointId, profileType, stages, thresholds } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                enabled: true,
                stages: stages.map((stage) => ({ ...stage })),
                thresholds: thresholds.map((threshold) => ({
                  metric: threshold.metric,
                  expressions: [...threshold.expressions],
                })),
              };
            }),
          };
        }),
      };
    }

    // ========================================================================
    // THRESHOLD ACTIONS
    // ========================================================================

    case 'ADD_THRESHOLD': {
      const { endpointId, profileType, metric } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              // Check if threshold for this metric already exists
              const existingThreshold = profile.thresholds.find((t) => t.metric === metric);
              if (existingThreshold) {
                console.warn(`Threshold for metric ${metric} already exists`);
                return profile;
              }

              // Create new threshold with empty expressions array
              const newThreshold = {
                metric,
                expressions: [],
              };

              return {
                ...profile,
                thresholds: [...profile.thresholds, newThreshold],
              };
            }),
          };
        }),
      };
    }

    case 'DELETE_THRESHOLD': {
      const { endpointId, profileType, metric } = action;

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                thresholds: profile.thresholds.filter((threshold) => threshold.metric !== metric),
              };
            }),
          };
        }),
      };
    }

    case 'UPDATE_THRESHOLD_EXPRESSIONS': {
      const { endpointId, profileType, metric, expressions } = action;

      // Enforce MAX_EXPRESSIONS limit (Requirement 5.2)
      if (expressions.length > MAX_EXPRESSIONS) {
        console.warn(
          `Cannot update threshold expressions: Maximum of ${MAX_EXPRESSIONS} expressions per metric`
        );
        return state;
      }

      return {
        ...state,
        endpoints: state.endpoints.map((endpoint) => {
          if (endpoint.id !== endpointId) return endpoint;

          return {
            ...endpoint,
            profiles: endpoint.profiles.map((profile) => {
              if (profile.type !== profileType) return profile;

              return {
                ...profile,
                thresholds: profile.thresholds.map((threshold) =>
                  threshold.metric === metric
                    ? { ...threshold, expressions: [...expressions] } // Immutable copy of expressions
                    : threshold
                ),
              };
            }),
          };
        }),
      };
    }

    // ========================================================================
    // DEFAULT CASE
    // ========================================================================

    default:
      // TypeScript should ensure this is never reached with proper typing
      console.warn('Unknown action type:', (action as { type: string }).type);
      return state;
  }
}

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

/**
 * Creates the initial state for the Config Builder application
 * 
 * The initial state has no endpoints and no active selection.
 * This matches Requirement 1.2: app starts with empty endpoint list.
 * 
 * @returns Initial AppState
 */
export function createInitialState(): AppState {
  return {
    endpoints: [],
    activeEndpointId: null,
  };
}
