/**
 * Unit tests for DefaultsService
 * 
 * Tests the creation of default endpoints, stages, and endpoint duplication.
 * Validates Requirements 7.1-7.8 and 2.3.
 */

import { describe, it, expect } from 'vitest';
import { createEndpoint, createStage, duplicateEndpoint } from '../../src/services/defaults.service';
import { EndpointDraft } from '../../src/models/EndpointDraft';

describe('DefaultsService', () => {
  describe('createEndpoint', () => {
    it('should create endpoint with default values (Requirements 7.1-7.8)', () => {
      const endpoint = createEndpoint([]);

      // Requirement 7.1: method defaults to POST
      expect(endpoint.method).toBe('POST');

      // Requirement 7.2: headers default to {"Content-Type":"application/json"}
      expect(endpoint.headersText).toBe('{"Content-Type":"application/json"}');

      // Requirement 7.3: payload defaults to {}
      expect(endpoint.payloadText).toBe('{}');

      // Requirement 7.4: expectedStatus defaults to 200
      expect(endpoint.expectedStatus).toBe(200);

      // Requirement 7.5: maxRetries defaults to 3
      expect(endpoint.maxRetries).toBe(3);

      // Requirement 7.6: thinkTimeSeconds defaults to 1
      expect(endpoint.thinkTimeSeconds).toBe(1);

      // Requirement 7.8: url defaults to empty string (invalid until user provides URL)
      expect(endpoint.url).toBe('');
    });

    it('should create endpoint with 4 disabled profiles', () => {
      const endpoint = createEndpoint([]);

      expect(endpoint.profiles).toHaveLength(4);

      const profileTypes = endpoint.profiles.map(p => p.type);
      expect(profileTypes).toContain('loadtest');
      expect(profileTypes).toContain('stresstest');
      expect(profileTypes).toContain('capacitytest');
      expect(profileTypes).toContain('stabilitytest');

      // All profiles should be disabled by default
      endpoint.profiles.forEach(profile => {
        expect(profile.enabled).toBe(false);
        expect(profile.stages).toEqual([]);
        expect(profile.thresholds).toEqual([]);
      });
    });

    it('should generate unique ID for each endpoint', () => {
      const endpoint1 = createEndpoint([]);
      const endpoint2 = createEndpoint([]);

      expect(endpoint1.id).toBeDefined();
      expect(endpoint2.id).toBeDefined();
      expect(endpoint1.id).not.toBe(endpoint2.id);
    });

    it('should generate unique name avoiding existing names', () => {
      const endpoint1 = createEndpoint([]);
      expect(endpoint1.name).toBe('Endpoint 1');

      const endpoint2 = createEndpoint(['Endpoint 1']);
      expect(endpoint2.name).toBe('Endpoint 2');

      const endpoint3 = createEndpoint(['Endpoint 1', 'Endpoint 2']);
      expect(endpoint3.name).toBe('Endpoint 3');

      // Should skip gaps
      const endpoint4 = createEndpoint(['Endpoint 1', 'Endpoint 3']);
      expect(endpoint4.name).toBe('Endpoint 2');
    });

    it('should set description to empty string', () => {
      const endpoint = createEndpoint([]);
      expect(endpoint.description).toBe('');
    });
  });

  describe('createStage', () => {
    it('should create stage with default values (Requirement 7.7)', () => {
      const stage = createStage();

      // Requirement 7.7: duration defaults to "30s"
      expect(stage.duration).toBe('30s');

      // Requirement 7.7: target defaults to 1
      expect(stage.target).toBe(1);
    });

    it('should create independent stage instances', () => {
      const stage1 = createStage();
      const stage2 = createStage();

      // Modify stage1
      stage1.duration = '60s';
      stage1.target = 10;

      // stage2 should remain unchanged
      expect(stage2.duration).toBe('30s');
      expect(stage2.target).toBe(1);
    });
  });

  describe('duplicateEndpoint', () => {
    it('should create a deep copy with new ID and modified name (Requirement 2.3)', () => {
      const original: EndpointDraft = createEndpoint([]);
      original.name = 'Test Endpoint';
      original.url = 'https://api.example.com';
      original.method = 'GET';
      original.headersText = '{"Authorization":"Bearer <token>"}';
      original.payloadText = '{"key":"value"}';
      original.expectedStatus = 201;
      original.maxRetries = 5;
      original.thinkTimeSeconds = 2;

      // Add some profile configuration
      original.profiles[0].enabled = true;
      original.profiles[0].stages = [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 20 },
      ];
      original.profiles[0].thresholds = [
        { metric: 'http_req_duration', expressions: ['p(95) < 2000'] },
      ];

      const duplicate = duplicateEndpoint(original);

      // Should have new ID
      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.id).toBeDefined();

      // Should have modified name indicating copy
      expect(duplicate.name).toBe('Test Endpoint (copy)');

      // All other fields should be copied
      expect(duplicate.url).toBe(original.url);
      expect(duplicate.method).toBe(original.method);
      expect(duplicate.headersText).toBe(original.headersText);
      expect(duplicate.payloadText).toBe(original.payloadText);
      expect(duplicate.expectedStatus).toBe(original.expectedStatus);
      expect(duplicate.maxRetries).toBe(original.maxRetries);
      expect(duplicate.thinkTimeSeconds).toBe(original.thinkTimeSeconds);
      expect(duplicate.description).toBe(original.description);
    });

    it('should create independent copy - modifying duplicate does not affect original', () => {
      const original = createEndpoint([]);
      original.profiles[0].enabled = true;
      original.profiles[0].stages = [{ duration: '30s', target: 1 }];
      original.profiles[0].thresholds = [
        { metric: 'http_req_duration', expressions: ['p(95) < 2000'] },
      ];

      const duplicate = duplicateEndpoint(original);

      // Modify duplicate
      duplicate.url = 'https://modified.example.com';
      duplicate.method = 'PUT';
      duplicate.profiles[0].enabled = false;
      duplicate.profiles[0].stages[0].duration = '60s';
      duplicate.profiles[0].stages[0].target = 100;
      duplicate.profiles[0].thresholds[0].expressions.push('avg < 500');

      // Original should remain unchanged
      expect(original.url).toBe('');
      expect(original.method).toBe('POST');
      expect(original.profiles[0].enabled).toBe(true);
      expect(original.profiles[0].stages[0].duration).toBe('30s');
      expect(original.profiles[0].stages[0].target).toBe(1);
      expect(original.profiles[0].thresholds[0].expressions).toHaveLength(1);
    });

    it('should deep clone all profiles with stages and thresholds', () => {
      const original = createEndpoint([]);
      
      // Configure multiple profiles
      original.profiles[0].enabled = true;
      original.profiles[0].stages = [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 20 },
      ];
      original.profiles[0].thresholds = [
        { metric: 'http_req_duration', expressions: ['p(95) < 2000', 'avg < 500'] },
        { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
      ];

      original.profiles[1].enabled = true;
      original.profiles[1].stages = [
        { duration: '5m', target: 50 },
      ];

      const duplicate = duplicateEndpoint(original);

      // Verify deep copy - profiles should match
      expect(duplicate.profiles).toHaveLength(4);
      expect(duplicate.profiles[0].enabled).toBe(true);
      expect(duplicate.profiles[0].stages).toHaveLength(2);
      expect(duplicate.profiles[0].stages[0]).toEqual({ duration: '1m', target: 10 });
      expect(duplicate.profiles[0].thresholds).toHaveLength(2);
      expect(duplicate.profiles[0].thresholds[0].expressions).toEqual(['p(95) < 2000', 'avg < 500']);

      // Modify duplicate's nested structures
      duplicate.profiles[0].stages.push({ duration: '3m', target: 30 });
      duplicate.profiles[0].thresholds[0].expressions.push('p(99) < 5000');

      // Original should remain unchanged
      expect(original.profiles[0].stages).toHaveLength(2);
      expect(original.profiles[0].thresholds[0].expressions).toHaveLength(2);
    });

    it('should handle endpoint with all profiles disabled', () => {
      const original = createEndpoint([]);
      const duplicate = duplicateEndpoint(original);

      expect(duplicate.profiles).toHaveLength(4);
      duplicate.profiles.forEach((profile, index) => {
        expect(profile.enabled).toBe(false);
        expect(profile.type).toBe(original.profiles[index].type);
      });
    });
  });
});
