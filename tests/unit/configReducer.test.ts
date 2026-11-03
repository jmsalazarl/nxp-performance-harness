/**
 * Unit tests for configReducer
 * 
 * Tests all action types and state transitions for the Config Builder reducer.
 * Validates immutability, collection limits, and proper state updates.
 * 
 * @validates Requirements 2.1-2.5, 3.1-3.8, 4.1-4.8, 5.1-5.6
 */

import { describe, it, expect } from 'vitest';
import { configReducer, createInitialState, ConfigAction } from '../../src/context/configReducer';
import { AppState } from '../../src/models/AppState';
import { EndpointDraft } from '../../src/models/EndpointDraft';
import { ProfileType } from '../../src/models/ProfileDraft';
import { PROFILE_TEMPLATES } from '../../src/services/profileTemplates.service';

describe('configReducer', () => {
  describe('createInitialState', () => {
    it('should create initial state with empty endpoints and no selection (Requirement 1.2)', () => {
      const state = createInitialState();

      expect(state.endpoints).toEqual([]);
      expect(state.activeEndpointId).toBeNull();
    });
  });

  describe('ADD_ENDPOINT', () => {
    it('should add endpoint with default values and set as active', () => {
      const state = createInitialState();
      const action: ConfigAction = { type: 'ADD_ENDPOINT' };

      const newState = configReducer(state, action);

      expect(newState.endpoints).toHaveLength(1);
      expect(newState.endpoints[0].name).toBe('Endpoint 1');
      expect(newState.endpoints[0].method).toBe('POST');
      expect(newState.activeEndpointId).toBe(newState.endpoints[0].id);
    });

    it('should generate unique endpoint names', () => {
      let state = createInitialState();

      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      expect(state.endpoints).toHaveLength(3);
      expect(state.endpoints[0].name).toBe('Endpoint 1');
      expect(state.endpoints[1].name).toBe('Endpoint 2');
      expect(state.endpoints[2].name).toBe('Endpoint 3');
    });

    it('should enforce MAX_ENDPOINTS limit (Requirement 2.1)', () => {
      let state = createInitialState();

      // Add 50 endpoints (the maximum)
      for (let i = 0; i < 50; i++) {
        state = configReducer(state, { type: 'ADD_ENDPOINT' });
      }

      expect(state.endpoints).toHaveLength(50);

      // Try to add one more - should be ignored
      const newState = configReducer(state, { type: 'ADD_ENDPOINT' });

      expect(newState.endpoints).toHaveLength(50);
      expect(newState).toBe(state); // State should be unchanged
    });

    it('should not mutate original state', () => {
      const state = createInitialState();
      const originalEndpoints = state.endpoints;

      configReducer(state, { type: 'ADD_ENDPOINT' });

      // Original state should remain unchanged
      expect(state.endpoints).toBe(originalEndpoints);
      expect(state.endpoints).toHaveLength(0);
    });
  });

  describe('UPDATE_ENDPOINT', () => {
    it('should update endpoint fields immutably', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      const action: ConfigAction = {
        type: 'UPDATE_ENDPOINT',
        id: endpointId,
        patch: {
          url: 'https://api.example.com',
          method: 'GET',
          expectedStatus: 201,
        },
      };

      const newState = configReducer(state, action);

      expect(newState.endpoints[0].url).toBe('https://api.example.com');
      expect(newState.endpoints[0].method).toBe('GET');
      expect(newState.endpoints[0].expectedStatus).toBe(201);

      // Other fields should remain unchanged
      expect(newState.endpoints[0].maxRetries).toBe(3);
      expect(newState.endpoints[0].thinkTimeSeconds).toBe(1);

      // Original state should be unchanged
      expect(state.endpoints[0].url).toBe('');
      expect(state.endpoints[0].method).toBe('POST');
    });

    it('should only update the specified endpoint', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const targetId = state.endpoints[1].id;

      const newState = configReducer(state, {
        type: 'UPDATE_ENDPOINT',
        id: targetId,
        patch: { url: 'https://modified.com' },
      });

      expect(newState.endpoints[0].url).toBe('');
      expect(newState.endpoints[1].url).toBe('https://modified.com');
      expect(newState.endpoints[2].url).toBe('');
    });

    it('should update endpoint name for rename support', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      const newState = configReducer(state, {
        type: 'UPDATE_ENDPOINT',
        id: endpointId,
        patch: { name: 'Renamed API' },
      });

      expect(newState.endpoints[0].name).toBe('Renamed API');
      expect(state.endpoints[0].name).toBe('Endpoint 1');
    });
  });

  describe('DELETE_ENDPOINT', () => {
    it('should remove endpoint from state (Requirement 2.4)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const deleteId = state.endpoints[1].id;

      const newState = configReducer(state, {
        type: 'DELETE_ENDPOINT',
        id: deleteId,
      });

      expect(newState.endpoints).toHaveLength(2);
      expect(newState.endpoints.find((ep) => ep.id === deleteId)).toBeUndefined();
    });

    it('should clear active selection if deleting active endpoint', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      expect(state.activeEndpointId).toBe(endpointId);

      const newState = configReducer(state, {
        type: 'DELETE_ENDPOINT',
        id: endpointId,
      });

      expect(newState.activeEndpointId).toBeNull();
      expect(newState.endpoints).toHaveLength(0);
    });

    it('should select first remaining endpoint if deleting active endpoint', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const firstId = state.endpoints[0].id;
      const secondId = state.endpoints[1].id;

      // Set first endpoint as active
      state = configReducer(state, {
        type: 'SET_ACTIVE_ENDPOINT',
        id: firstId,
      });

      // Delete first endpoint
      const newState = configReducer(state, {
        type: 'DELETE_ENDPOINT',
        id: firstId,
      });

      // Should auto-select the new first endpoint (was second)
      expect(newState.activeEndpointId).toBe(secondId);
    });
  });

  describe('DUPLICATE_ENDPOINT', () => {
    it('should create independent copy of endpoint (Requirement 2.3)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const originalId = state.endpoints[0].id;

      // Modify the original
      state = configReducer(state, {
        type: 'UPDATE_ENDPOINT',
        id: originalId,
        patch: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      // Duplicate it
      const newState = configReducer(state, {
        type: 'DUPLICATE_ENDPOINT',
        id: originalId,
      });

      expect(newState.endpoints).toHaveLength(2);
      expect(newState.endpoints[1].id).not.toBe(originalId);
      expect(newState.endpoints[1].name).toBe('Endpoint 1 (copy)');
      expect(newState.endpoints[1].url).toBe('https://api.example.com');
      expect(newState.endpoints[1].method).toBe('GET');
    });

    it('should set duplicated endpoint as active', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const originalId = state.endpoints[0].id;

      const newState = configReducer(state, {
        type: 'DUPLICATE_ENDPOINT',
        id: originalId,
      });

      expect(newState.activeEndpointId).toBe(newState.endpoints[1].id);
      expect(newState.activeEndpointId).not.toBe(originalId);
    });

    it('should enforce MAX_ENDPOINTS limit when duplicating', () => {
      let state = createInitialState();

      // Add 50 endpoints
      for (let i = 0; i < 50; i++) {
        state = configReducer(state, { type: 'ADD_ENDPOINT' });
      }

      const firstId = state.endpoints[0].id;

      // Try to duplicate - should be ignored
      const newState = configReducer(state, {
        type: 'DUPLICATE_ENDPOINT',
        id: firstId,
      });

      expect(newState.endpoints).toHaveLength(50);
      expect(newState).toBe(state);
    });
  });

  describe('SET_ACTIVE_ENDPOINT', () => {
    it('should set active endpoint selection (Requirement 2.2)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const targetId = state.endpoints[1].id;

      const newState = configReducer(state, {
        type: 'SET_ACTIVE_ENDPOINT',
        id: targetId,
      });

      expect(newState.activeEndpointId).toBe(targetId);
    });

    it('should allow clearing active selection', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const newState = configReducer(state, {
        type: 'SET_ACTIVE_ENDPOINT',
        id: null,
      });

      expect(newState.activeEndpointId).toBeNull();
    });

    it('should ignore invalid endpoint ID', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });

      const newState = configReducer(state, {
        type: 'SET_ACTIVE_ENDPOINT',
        id: 'invalid-id',
      });

      expect(newState).toBe(state);
    });
  });

  describe('ADD_STAGE', () => {
    it('should add stage with default values to specified profile', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      const newState = configReducer(state, {
        type: 'ADD_STAGE',
        endpointId,
        profileType: 'loadtest',
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.stages).toHaveLength(1);
      expect(profile?.stages[0].duration).toBe('30s');
      expect(profile?.stages[0].target).toBe(1);
    });

    it('should enforce MAX_STAGES limit per profile (Requirement 4.2)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      // Add 20 stages (the maximum)
      for (let i = 0; i < 20; i++) {
        state = configReducer(state, {
          type: 'ADD_STAGE',
          endpointId,
          profileType: 'loadtest',
        });
      }

      const profile = state.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.stages).toHaveLength(20);

      // Try to add one more - should be ignored
      const newState = configReducer(state, {
        type: 'ADD_STAGE',
        endpointId,
        profileType: 'loadtest',
      });

      const newProfile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(newProfile?.stages).toHaveLength(20);
    });
  });

  describe('DELETE_STAGE', () => {
    it('should remove stage at specified index', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      // Add 3 stages
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });

      // Delete middle stage
      const newState = configReducer(state, {
        type: 'DELETE_STAGE',
        endpointId,
        profileType: 'loadtest',
        stageIndex: 1,
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.stages).toHaveLength(2);
    });
  });

  describe('REORDER_STAGES', () => {
    it('should reorder stages preserving order in output (Requirement 4.5)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      // Add 3 stages
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });

      // Modify each stage to be distinguishable
      state = configReducer(state, {
        type: 'UPDATE_STAGE',
        endpointId,
        profileType: 'loadtest',
        stageIndex: 0,
        patch: { target: 10 },
      });
      state = configReducer(state, {
        type: 'UPDATE_STAGE',
        endpointId,
        profileType: 'loadtest',
        stageIndex: 1,
        patch: { target: 20 },
      });
      state = configReducer(state, {
        type: 'UPDATE_STAGE',
        endpointId,
        profileType: 'loadtest',
        stageIndex: 2,
        patch: { target: 30 },
      });

      // Reorder: move stage 0 to position 2
      const newState = configReducer(state, {
        type: 'REORDER_STAGES',
        endpointId,
        profileType: 'loadtest',
        fromIndex: 0,
        toIndex: 2,
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.stages[0].target).toBe(20);
      expect(profile?.stages[1].target).toBe(30);
      expect(profile?.stages[2].target).toBe(10);
    });
  });

  describe('UPDATE_STAGE', () => {
    it('should update stage fields immutably', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;
      state = configReducer(state, { type: 'ADD_STAGE', endpointId, profileType: 'loadtest' });

      const newState = configReducer(state, {
        type: 'UPDATE_STAGE',
        endpointId,
        profileType: 'loadtest',
        stageIndex: 0,
        patch: { duration: '2m', target: 50 },
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.stages[0].duration).toBe('2m');
      expect(profile?.stages[0].target).toBe(50);

      // Original state should be unchanged
      const originalProfile = state.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(originalProfile?.stages[0].duration).toBe('30s');
      expect(originalProfile?.stages[0].target).toBe(1);
    });
  });

  describe('TOGGLE_PROFILE', () => {
    it('should toggle profile enabled state (Requirement 4.1, 4.6)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      const profile = state.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.enabled).toBe(false);

      // Enable profile
      let newState = configReducer(state, {
        type: 'TOGGLE_PROFILE',
        endpointId,
        profileType: 'loadtest',
      });

      let newProfile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(newProfile?.enabled).toBe(true);

      // Disable profile
      newState = configReducer(newState, {
        type: 'TOGGLE_PROFILE',
        endpointId,
        profileType: 'loadtest',
      });

      newProfile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(newProfile?.enabled).toBe(false);
    });
  });

  describe('APPLY_PROFILE_TEMPLATE', () => {
    it('should replace only the selected profile and enable it', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;
      const template = PROFILE_TEMPLATES.find((item) => item.profileType === 'stresstest');

      expect(template).toBeDefined();

      const newState = configReducer(state, {
        type: 'APPLY_PROFILE_TEMPLATE',
        endpointId,
        profileType: 'stresstest',
        stages: template!.stages,
        thresholds: template!.thresholds,
      });

      const stressProfile = newState.endpoints[0].profiles.find((p) => p.type === 'stresstest');
      const loadProfile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');

      expect(stressProfile?.enabled).toBe(true);
      expect(stressProfile?.stages).toEqual(template!.stages);
      expect(stressProfile?.thresholds).toEqual(template!.thresholds);
      expect(loadProfile?.stages).toEqual([]);
      expect(loadProfile?.thresholds).toEqual([]);
    });

    it('should clone template arrays instead of sharing references', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;
      const template = PROFILE_TEMPLATES[0];

      const newState = configReducer(state, {
        type: 'APPLY_PROFILE_TEMPLATE',
        endpointId,
        profileType: template.profileType,
        stages: template.stages,
        thresholds: template.thresholds,
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === template.profileType);

      expect(profile?.stages).not.toBe(template.stages);
      expect(profile?.thresholds).not.toBe(template.thresholds);
      expect(profile?.thresholds[0].expressions).not.toBe(template.thresholds[0].expressions);
    });
  });

  describe('ADD_THRESHOLD', () => {
    it('should add threshold with empty expressions array', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      const newState = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.thresholds).toHaveLength(1);
      expect(profile?.thresholds[0].metric).toBe('http_req_duration');
      expect(profile?.thresholds[0].expressions).toEqual([]);
    });

    it('should not add duplicate threshold for same metric', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      // Try to add same metric again
      const newState = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.thresholds).toHaveLength(1);
    });
  });

  describe('DELETE_THRESHOLD', () => {
    it('should remove threshold for specified metric', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });
      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_failed',
      });

      const newState = configReducer(state, {
        type: 'DELETE_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      expect(profile?.thresholds).toHaveLength(1);
      expect(profile?.thresholds[0].metric).toBe('http_req_failed');
    });
  });

  describe('UPDATE_THRESHOLD_EXPRESSIONS', () => {
    it('should update threshold expressions array (Requirement 5.2, 5.5)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      const newState = configReducer(state, {
        type: 'UPDATE_THRESHOLD_EXPRESSIONS',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
        expressions: ['p(95) < 2000', 'avg < 500'],
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      const threshold = profile?.thresholds.find((t) => t.metric === 'http_req_duration');
      expect(threshold?.expressions).toEqual(['p(95) < 2000', 'avg < 500']);
    });

    it('should enforce MAX_EXPRESSIONS limit (Requirement 5.2)', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      // Try to add 11 expressions (more than MAX_EXPRESSIONS = 10)
      const tooManyExpressions = Array.from({ length: 11 }, (_, i) => `expr${i}`);

      const newState = configReducer(state, {
        type: 'UPDATE_THRESHOLD_EXPRESSIONS',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
        expressions: tooManyExpressions,
      });

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      const threshold = profile?.thresholds.find((t) => t.metric === 'http_req_duration');
      // Should remain empty since update was rejected
      expect(threshold?.expressions).toEqual([]);
    });

    it('should create immutable copy of expressions array', () => {
      let state = createInitialState();
      state = configReducer(state, { type: 'ADD_ENDPOINT' });
      const endpointId = state.endpoints[0].id;

      state = configReducer(state, {
        type: 'ADD_THRESHOLD',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
      });

      const expressions = ['p(95) < 2000'];
      const newState = configReducer(state, {
        type: 'UPDATE_THRESHOLD_EXPRESSIONS',
        endpointId,
        profileType: 'loadtest',
        metric: 'http_req_duration',
        expressions,
      });

      // Modify original array
      expressions.push('avg < 500');

      const profile = newState.endpoints[0].profiles.find((p) => p.type === 'loadtest');
      const threshold = profile?.thresholds.find((t) => t.metric === 'http_req_duration');
      
      // Should not include the pushed value
      expect(threshold?.expressions).toEqual(['p(95) < 2000']);
    });
  });
});
