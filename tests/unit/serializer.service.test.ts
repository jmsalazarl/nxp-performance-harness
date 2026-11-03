/**
 * Unit tests for serializer.service
 * 
 * Tests the serialization logic that converts EndpointDraft objects
 * to JavaScript ES module text for config.js export.
 */

import { describe, it, expect } from 'vitest';
import { serialize, serializeEndpoint, serializeProfile } from '../../src/services/serializer.service';
import type { AppState } from '../../src/models/AppState';
import type { EndpointDraft } from '../../src/models/EndpointDraft';
import type { ProfileDraft } from '../../src/models/ProfileDraft';

describe('serializer.service', () => {
  describe('serializeProfile', () => {
    it('should return null for disabled profiles', () => {
      const profile: ProfileDraft = {
        type: 'loadtest',
        enabled: false,
        stages: [{ duration: '30s', target: 10 }],
        thresholds: [],
      };

      const result = serializeProfile(profile);
      expect(result).toBeNull();
    });

    it('should serialize enabled profile with stages', () => {
      const profile: ProfileDraft = {
        type: 'loadtest',
        enabled: true,
        stages: [
          { duration: '30s', target: 10 },
          { duration: '1m', target: 20 },
        ],
        thresholds: [],
      };

      const result = serializeProfile(profile);
      expect(result).toEqual({
        stages: [
          { duration: '30s', target: 10 },
          { duration: '1m', target: 20 },
        ],
      });
    });

    it('should serialize thresholds as arrays of strings', () => {
      const profile: ProfileDraft = {
        type: 'stresstest',
        enabled: true,
        stages: [{ duration: '30s', target: 10 }],
        thresholds: [
          { metric: 'http_req_duration', expressions: ['p(95) < 2000', 'avg < 500'] },
          { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
        ],
      };

      const result = serializeProfile(profile);
      expect(result).toEqual({
        stages: [{ duration: '30s', target: 10 }],
        thresholds: {
          http_req_duration: ['p(95) < 2000', 'avg < 500'],
          http_req_failed: ['rate < 0.01'],
        },
      });
    });

    it('should sort threshold keys alphabetically', () => {
      const profile: ProfileDraft = {
        type: 'loadtest',
        enabled: true,
        stages: [{ duration: '30s', target: 1 }],
        thresholds: [
          { metric: 'zebra_metric', expressions: ['value > 0'] },
          { metric: 'alpha_metric', expressions: ['value < 100'] },
        ],
      };

      const result = serializeProfile(profile);
      const keys = Object.keys((result as any).thresholds);
      expect(keys).toEqual(['alpha_metric', 'zebra_metric']);
    });
  });

  describe('serializeEndpoint', () => {
    it('should serialize basic endpoint with default values', () => {
      const draft: EndpointDraft = {
        id: '1',
        name: 'Test Endpoint',
        description: 'A test endpoint',
        url: 'https://api.example.com/test',
        method: 'POST',
        headersText: '{"Content-Type": "application/json"}',
        payloadText: '{"key": "value"}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [],
      };

      const result = serializeEndpoint(draft);
      
      expect(result.url).toBe('https://api.example.com/test');
      expect(result.method).toBe('POST');
      expect(result.expectedStatus).toBe(200);
      expect(result.maxRetries).toBe(3);
      expect(result.thinkTimeSeconds).toBe(1);
      expect(result.payload).toEqual({ key: 'value' });
      expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should serialize GET method with payload as query params', () => {
      const draft: EndpointDraft = {
        id: '2',
        name: 'GET Endpoint',
        description: 'Test GET',
        url: 'https://api.example.com/search',
        method: 'GET',
        headersText: '{}',
        payloadText: '{"q": "test", "limit": 10}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [],
      };

      const result = serializeEndpoint(draft);
      
      // URL should have query params appended
      expect(result.url).toContain('q=test');
      expect(result.url).toContain('limit=10');
      // For GET, payload should NOT be in the result (it's in the URL)
      expect(result.payload).toBeUndefined();
    });

    it('should include only enabled profiles', () => {
      const draft: EndpointDraft = {
        id: '3',
        name: 'Multi-profile Endpoint',
        description: 'Test profiles',
        url: 'https://api.example.com/test',
        method: 'POST',
        headersText: '{}',
        payloadText: '{}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [
          {
            type: 'loadtest',
            enabled: true,
            stages: [{ duration: '30s', target: 10 }],
            thresholds: [],
          },
          {
            type: 'stresstest',
            enabled: false,
            stages: [{ duration: '1m', target: 100 }],
            thresholds: [],
          },
          {
            type: 'capacitytest',
            enabled: true,
            stages: [{ duration: '2m', target: 50 }],
            thresholds: [],
          },
        ],
      };

      const result = serializeEndpoint(draft);
      
      expect(result.loadtest).toBeDefined();
      expect(result.stresstest).toBeUndefined();
      expect(result.capacitytest).toBeDefined();
    });

    it('should sort keys alphabetically', () => {
      const draft: EndpointDraft = {
        id: '4',
        name: 'Sorted Keys',
        description: 'Test key ordering',
        url: 'https://api.example.com/test',
        method: 'POST',
        headersText: '{}',
        payloadText: '{}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [],
      };

      const result = serializeEndpoint(draft);
      const keys = Object.keys(result);
      const sortedKeys = [...keys].sort();
      
      expect(keys).toEqual(sortedKeys);
    });
  });

  describe('serialize', () => {
    it('should generate valid ES module structure', () => {
      const state: AppState = {
        endpoints: [
          {
            id: '1',
            name: 'Endpoint 1',
            description: 'First endpoint',
            url: 'https://api.example.com/test',
            method: 'POST',
            headersText: '{"Content-Type": "application/json"}',
            payloadText: '{"test": true}',
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [],
          },
        ],
        activeEndpointId: '1',
      };

      const result = serialize(state);
      
      expect(result).toContain('export default {');
      expect(result).toContain('endpoints: [');
      expect(result).toContain('https://api.example.com/test');
      expect(result).toMatch(/}\s*;\s*$/); // Should end with }; and newline
    });

    it('should serialize multiple endpoints', () => {
      const state: AppState = {
        endpoints: [
          {
            id: '1',
            name: 'Endpoint 1',
            description: 'First',
            url: 'https://api.example.com/test1',
            method: 'POST',
            headersText: '{}',
            payloadText: '{}',
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [],
          },
          {
            id: '2',
            name: 'Endpoint 2',
            description: 'Second',
            url: 'https://api.example.com/test2',
            method: 'GET',
            headersText: '{}',
            payloadText: '{}',
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [],
          },
        ],
        activeEndpointId: '1',
      };

      const result = serialize(state);
      
      expect(result).toContain('test1');
      expect(result).toContain('test2');
      expect(result).toContain('POST');
      expect(result).toContain('GET');
    });

    it('should produce deterministic output with 2-space indentation', () => {
      const state: AppState = {
        endpoints: [
          {
            id: '1',
            name: 'Test',
            description: 'Test',
            url: 'https://api.example.com/test',
            method: 'POST',
            headersText: '{}',
            payloadText: '{}',
            expectedStatus: 200,
            maxRetries: 3,
            thinkTimeSeconds: 1,
            profiles: [],
          },
        ],
        activeEndpointId: '1',
      };

      const result1 = serialize(state);
      const result2 = serialize(state);
      
      // Should be byte-for-byte identical
      expect(result1).toBe(result2);
      
      // Should use 2-space indentation
      expect(result1).toContain('  endpoints: [');
    });
  });
});
