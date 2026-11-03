/**
 * Unit tests for validation.service.ts
 * Tests individual validation functions with specific examples
 */

import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateField,
  validateMethod,
  validateJson,
  validateDuration,
  validateMetricName,
  validateThresholdExpression,
  validateEndpoint,
  validateExportReady,
  type EndpointDraft,
  type AppState,
} from '../../src/services/validation.service.js';

describe('validation.service', () => {
  describe('validateUrl', () => {
    it('should accept URLs starting with http://', () => {
      expect(validateUrl('http://example.com')).toBeNull();
    });

    it('should accept URLs starting with https://', () => {
      expect(validateUrl('https://api.example.com/endpoint')).toBeNull();
    });

    it('should reject empty URLs', () => {
      expect(validateUrl('')).toBe('URL is required and cannot be empty');
      expect(validateUrl('   ')).toBe('URL is required and cannot be empty');
    });

    it('should reject URLs without http:// or https://', () => {
      const error = validateUrl('ftp://example.com');
      expect(error).toBe('URL must start with http:// or https://');
    });

    it('should reject relative URLs', () => {
      const error = validateUrl('/api/endpoint');
      expect(error).toBe('URL must start with http:// or https://');
    });
  });

  describe('validateField', () => {
    it('should validate expectedStatus in range 100-599', () => {
      expect(validateField('expectedStatus', 200, { type: 'number', min: 100, max: 599 })).toBeNull();
      expect(validateField('expectedStatus', 100, { type: 'number', min: 100, max: 599 })).toBeNull();
      expect(validateField('expectedStatus', 599, { type: 'number', min: 100, max: 599 })).toBeNull();
    });

    it('should reject expectedStatus out of range', () => {
      expect(validateField('expectedStatus', 99, { type: 'number', min: 100, max: 599 })).toBe(
        'expectedStatus must be at least 100'
      );
      expect(validateField('expectedStatus', 600, { type: 'number', min: 100, max: 599 })).toBe(
        'expectedStatus must be at most 599'
      );
    });

    it('should validate maxRetries in range 0-10', () => {
      expect(validateField('maxRetries', 0, { type: 'number', min: 0, max: 10 })).toBeNull();
      expect(validateField('maxRetries', 3, { type: 'number', min: 0, max: 10 })).toBeNull();
      expect(validateField('maxRetries', 10, { type: 'number', min: 0, max: 10 })).toBeNull();
    });

    it('should reject maxRetries out of range', () => {
      expect(validateField('maxRetries', -1, { type: 'number', min: 0, max: 10 })).toBe(
        'maxRetries must be at least 0'
      );
      expect(validateField('maxRetries', 11, { type: 'number', min: 0, max: 10 })).toBe(
        'maxRetries must be at most 10'
      );
    });

    it('should validate thinkTimeSeconds in range 0-60', () => {
      expect(validateField('thinkTimeSeconds', 0, { type: 'number', min: 0, max: 60 })).toBeNull();
      expect(validateField('thinkTimeSeconds', 1, { type: 'number', min: 0, max: 60 })).toBeNull();
      expect(validateField('thinkTimeSeconds', 60, { type: 'number', min: 0, max: 60 })).toBeNull();
    });

    it('should validate target in range 0-10000', () => {
      expect(validateField('target', 0, { type: 'number', min: 0, max: 10000 })).toBeNull();
      expect(validateField('target', 100, { type: 'number', min: 0, max: 10000 })).toBeNull();
      expect(validateField('target', 10000, { type: 'number', min: 0, max: 10000 })).toBeNull();
    });

    it('should reject non-numeric values', () => {
      expect(validateField('expectedStatus', 'not a number', { type: 'number', min: 100, max: 599 })).toContain(
        'must be a valid number'
      );
    });
  });

  describe('validateMethod', () => {
    it('should accept valid HTTP methods', () => {
      expect(validateMethod('GET')).toBeNull();
      expect(validateMethod('POST')).toBeNull();
      expect(validateMethod('PUT')).toBeNull();
      expect(validateMethod('PATCH')).toBeNull();
      expect(validateMethod('DELETE')).toBeNull();
    });

    it('should reject invalid HTTP methods', () => {
      const error = validateMethod('HEAD');
      expect(error).toContain('must be one of');
    });

    it('should reject lowercase methods', () => {
      const error = validateMethod('get');
      expect(error).toContain('must be one of');
    });
  });

  describe('validateJson', () => {
    it('should accept valid JSON strings', () => {
      expect(validateJson('{"key": "value"}')).toBeNull();
      expect(validateJson('[1, 2, 3]')).toBeNull();
      expect(validateJson('42')).toBeNull();
      expect(validateJson('"string"')).toBeNull();
    });

    it('should reject empty strings', () => {
      expect(validateJson('')).toBe('JSON cannot be empty');
      expect(validateJson('   ')).toBe('JSON cannot be empty');
    });

    it('should reject malformed JSON', () => {
      const error = validateJson('{invalid}');
      expect(error).toContain('Invalid JSON');
    });

    it('should enforce object requirement when requireObject is true', () => {
      expect(validateJson('{"key": "value"}', true)).toBeNull();
      expect(validateJson('[1, 2, 3]', true)).toBe('JSON must be an object (not an array or primitive)');
      expect(validateJson('42', true)).toBe('JSON must be an object (not an array or primitive)');
      expect(validateJson('"string"', true)).toBe('JSON must be an object (not an array or primitive)');
    });
  });

  describe('validateDuration', () => {
    it('should accept valid K6 duration formats', () => {
      expect(validateDuration('30s')).toBeNull();
      expect(validateDuration('2m')).toBeNull();
      expect(validateDuration('1h')).toBeNull();
      expect(validateDuration('1h30m')).toBeNull();
      expect(validateDuration('90s')).toBeNull();
      expect(validateDuration('500ms')).toBeNull();
      expect(validateDuration('1.5s')).toBeNull();
    });

    it('should reject empty duration', () => {
      expect(validateDuration('')).toBe('Duration cannot be empty');
      expect(validateDuration('   ')).toBe('Duration cannot be empty');
    });

    it('should reject invalid duration formats', () => {
      const error1 = validateDuration('30');
      expect(error1).toContain('must be in K6 format');

      const error2 = validateDuration('thirty seconds');
      expect(error2).toContain('must be in K6 format');

      const error3 = validateDuration('30sec');
      expect(error3).toContain('must be in K6 format');
    });
  });

  describe('validateMetricName', () => {
    it('should accept valid metric names', () => {
      expect(validateMetricName('http_req_duration')).toBeNull();
      expect(validateMetricName('custom_metric_123')).toBeNull();
      expect(validateMetricName('ABC123')).toBeNull();
      expect(validateMetricName('_private_metric')).toBeNull();
    });

    it('should reject empty or whitespace-only names', () => {
      expect(validateMetricName('')).toBe('Metric name cannot be empty or whitespace only');
      expect(validateMetricName('   ')).toBe('Metric name cannot be empty or whitespace only');
    });

    it('should reject names longer than 128 characters', () => {
      const longName = 'a'.repeat(129);
      const error = validateMetricName(longName);
      expect(error).toBe('Metric name must be 128 characters or less');
    });

    it('should reject names with invalid characters', () => {
      const error1 = validateMetricName('metric-name');
      expect(error1).toBe('Metric name must contain only letters, digits, and underscores');

      const error2 = validateMetricName('metric.name');
      expect(error2).toBe('Metric name must contain only letters, digits, and underscores');

      const error3 = validateMetricName('metric name');
      expect(error3).toBe('Metric name must contain only letters, digits, and underscores');
    });
  });

  describe('validateThresholdExpression', () => {
    it('should accept non-empty threshold expressions', () => {
      expect(validateThresholdExpression('p(95) < 2000')).toBeNull();
      expect(validateThresholdExpression('avg < 500')).toBeNull();
      expect(validateThresholdExpression('rate < 0.01')).toBeNull();
    });

    it('should reject empty or whitespace-only expressions', () => {
      expect(validateThresholdExpression('')).toBe('Threshold expression cannot be empty or whitespace only');
      expect(validateThresholdExpression('   ')).toBe('Threshold expression cannot be empty or whitespace only');
    });
  });

  describe('validateEndpoint', () => {
    const createValidEndpoint = (): EndpointDraft => ({
      id: 'ep1',
      name: 'Test Endpoint',
      url: 'https://api.example.com/test',
      method: 'POST',
      headersText: '{"Content-Type": "application/json"}',
      payloadText: '{"key": "value"}',
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      profiles: [
        {
          type: 'loadtest',
          enabled: true,
          stages: [{ duration: '30s', target: 10 }],
          thresholds: [{ metric: 'http_req_duration', expressions: ['p(95) < 2000'] }],
        },
      ],
    });

    it('should validate a correct endpoint', () => {
      const endpoint = createValidEndpoint();
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid URL', () => {
      const endpoint = createValidEndpoint();
      endpoint.url = '';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('url');
    });

    it('should detect invalid method', () => {
      const endpoint = createValidEndpoint();
      endpoint.method = 'INVALID';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'method')).toBe(true);
    });

    it('should detect invalid headers JSON', () => {
      const endpoint = createValidEndpoint();
      endpoint.headersText = '{invalid}';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'headers')).toBe(true);
    });

    it('should detect headers that are not objects', () => {
      const endpoint = createValidEndpoint();
      endpoint.headersText = '[1, 2, 3]';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'headers')).toBe(true);
    });

    it('should detect invalid payload JSON', () => {
      const endpoint = createValidEndpoint();
      endpoint.payloadText = '{invalid}';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'payload')).toBe(true);
    });

    it('should detect expectedStatus out of range', () => {
      const endpoint = createValidEndpoint();
      endpoint.expectedStatus = 99;
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'expectedStatus')).toBe(true);
    });

    it('should detect enabled profile without stages', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].stages = [];
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('stages'))).toBe(true);
    });

    it('should detect invalid stage duration', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].stages[0].duration = 'invalid';
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('duration'))).toBe(true);
    });

    it('should detect stage target out of range', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].stages[0].target = -1;
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('target'))).toBe(true);
    });

    it('should detect threshold without expressions', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].thresholds[0].expressions = [];
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('thresholds'))).toBe(true);
    });

    it('should detect empty threshold expression', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].thresholds[0].expressions = [''];
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('thresholds'))).toBe(true);
    });

    it('should skip validation of disabled profiles', () => {
      const endpoint = createValidEndpoint();
      endpoint.profiles[0].enabled = false;
      endpoint.profiles[0].stages = []; // This would be invalid if enabled
      const result = validateEndpoint(endpoint);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateExportReady', () => {
    const createValidState = (): AppState => ({
      endpoints: [
        {
          id: 'ep1',
          name: 'Test Endpoint',
          url: 'https://api.example.com/test',
          method: 'POST',
          headersText: '{"Content-Type": "application/json"}',
          payloadText: '{"key": "value"}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [
            {
              type: 'loadtest',
              enabled: true,
              stages: [{ duration: '30s', target: 10 }],
              thresholds: [{ metric: 'http_req_duration', expressions: ['p(95) < 2000'] }],
            },
          ],
        },
      ],
      activeEndpointId: 'ep1',
    });

    it('should validate a correct state', () => {
      const state = createValidState();
      const result = validateExportReady(state);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject state with no endpoints', () => {
      const state: AppState = {
        endpoints: [],
        activeEndpointId: null,
      };
      const result = validateExportReady(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('At least one endpoint is required');
    });

    it('should reject state where no endpoint has enabled profiles', () => {
      const state = createValidState();
      state.endpoints[0].profiles[0].enabled = false;
      const result = validateExportReady(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('enabled profile'))).toBe(true);
    });

    it('should accumulate all endpoint validation errors', () => {
      const state = createValidState();
      state.endpoints[0].url = '';
      state.endpoints[0].method = 'INVALID';
      const result = validateExportReady(state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
