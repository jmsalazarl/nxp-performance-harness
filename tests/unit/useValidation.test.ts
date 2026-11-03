/**
 * Unit tests for useValidation hook
 * 
 * Tests that the hook correctly wraps ValidationService functions
 * and provides memoized versions via useCallback.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useValidation } from '../../src/hooks/useValidation';
import type { AppState, EndpointDraft } from '../../src/services/validation.service';

describe('useValidation Hook', () => {
  describe('Hook initialization', () => {
    it('should return all validation functions', () => {
      const { result } = renderHook(() => useValidation());

      expect(result.current).toHaveProperty('validateJson');
      expect(result.current).toHaveProperty('validateDuration');
      expect(result.current).toHaveProperty('validateMetricName');
      expect(result.current).toHaveProperty('validateExportReady');
      expect(result.current).toHaveProperty('validateUrl');
      expect(result.current).toHaveProperty('validateMethod');
      expect(result.current).toHaveProperty('validateField');
      expect(result.current).toHaveProperty('validateThresholdExpression');
      expect(result.current).toHaveProperty('validateEndpoint');
    });

    it('should return functions that are callable', () => {
      const { result } = renderHook(() => useValidation());

      expect(typeof result.current.validateJson).toBe('function');
      expect(typeof result.current.validateDuration).toBe('function');
      expect(typeof result.current.validateMetricName).toBe('function');
      expect(typeof result.current.validateExportReady).toBe('function');
      expect(typeof result.current.validateUrl).toBe('function');
      expect(typeof result.current.validateMethod).toBe('function');
      expect(typeof result.current.validateField).toBe('function');
      expect(typeof result.current.validateThresholdExpression).toBe('function');
      expect(typeof result.current.validateEndpoint).toBe('function');
    });
  });

  describe('Function memoization', () => {
    it('should return the same function references on re-render', () => {
      const { result, rerender } = renderHook(() => useValidation());

      const firstRender = { ...result.current };
      
      rerender();
      
      const secondRender = { ...result.current };

      // All functions should be the same reference (memoized)
      expect(firstRender.validateJson).toBe(secondRender.validateJson);
      expect(firstRender.validateDuration).toBe(secondRender.validateDuration);
      expect(firstRender.validateMetricName).toBe(secondRender.validateMetricName);
      expect(firstRender.validateExportReady).toBe(secondRender.validateExportReady);
      expect(firstRender.validateUrl).toBe(secondRender.validateUrl);
      expect(firstRender.validateMethod).toBe(secondRender.validateMethod);
      expect(firstRender.validateField).toBe(secondRender.validateField);
      expect(firstRender.validateThresholdExpression).toBe(secondRender.validateThresholdExpression);
      expect(firstRender.validateEndpoint).toBe(secondRender.validateEndpoint);
    });
  });

  describe('validateJson', () => {
    it('should validate valid JSON object', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateJson('{"key": "value"}', true);
      
      expect(error).toBeNull();
    });

    it('should reject empty string', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateJson('', false);
      
      expect(error).toBe('JSON cannot be empty');
    });

    it('should reject invalid JSON', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateJson('{invalid}', false);
      
      expect(error).toContain('Invalid JSON');
    });

    it('should reject array when object is required', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateJson('[]', true);
      
      expect(error).toBe('JSON must be an object (not an array or primitive)');
    });
  });

  describe('validateDuration', () => {
    it('should validate valid K6 duration formats', () => {
      const { result } = renderHook(() => useValidation());
      
      expect(result.current.validateDuration('30s')).toBeNull();
      expect(result.current.validateDuration('2m')).toBeNull();
      expect(result.current.validateDuration('1h')).toBeNull();
      expect(result.current.validateDuration('1h30m')).toBeNull();
      expect(result.current.validateDuration('500ms')).toBeNull();
    });

    it('should reject empty duration', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateDuration('');
      
      expect(error).toBe('Duration cannot be empty');
    });

    it('should reject invalid duration format', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateDuration('30');
      
      expect(error).toContain('Duration must be in K6 format');
    });
  });

  describe('validateMetricName', () => {
    it('should validate valid metric names', () => {
      const { result } = renderHook(() => useValidation());
      
      expect(result.current.validateMetricName('http_req_duration')).toBeNull();
      expect(result.current.validateMetricName('custom_metric_123')).toBeNull();
      expect(result.current.validateMetricName('a')).toBeNull();
    });

    it('should reject empty metric name', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateMetricName('');
      
      expect(error).toBe('Metric name cannot be empty or whitespace only');
    });

    it('should reject metric name with invalid characters', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateMetricName('metric-name');
      
      expect(error).toContain('Metric name must contain only letters, digits, and underscores');
    });

    it('should reject metric name exceeding 128 characters', () => {
      const { result } = renderHook(() => useValidation());
      
      const longName = 'a'.repeat(129);
      const error = result.current.validateMetricName(longName);
      
      expect(error).toContain('Metric name must be 128 characters or less');
    });
  });

  describe('validateUrl', () => {
    it('should validate valid URLs', () => {
      const { result } = renderHook(() => useValidation());
      
      expect(result.current.validateUrl('http://example.com')).toBeNull();
      expect(result.current.validateUrl('https://api.example.com/endpoint')).toBeNull();
    });

    it('should reject empty URL', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateUrl('');
      
      expect(error).toBe('URL is required and cannot be empty');
    });

    it('should reject URL without http/https prefix', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateUrl('example.com');
      
      expect(error).toBe('URL must start with http:// or https://');
    });
  });

  describe('validateMethod', () => {
    it('should validate valid HTTP methods', () => {
      const { result } = renderHook(() => useValidation());
      
      expect(result.current.validateMethod('GET')).toBeNull();
      expect(result.current.validateMethod('POST')).toBeNull();
      expect(result.current.validateMethod('PUT')).toBeNull();
      expect(result.current.validateMethod('PATCH')).toBeNull();
      expect(result.current.validateMethod('DELETE')).toBeNull();
    });

    it('should reject invalid HTTP method', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateMethod('INVALID');
      
      expect(error).toContain('Method must be one of');
    });
  });

  describe('validateField', () => {
    it('should validate numeric field within range', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateField('expectedStatus', 200, {
        type: 'number',
        min: 100,
        max: 599,
      });
      
      expect(error).toBeNull();
    });

    it('should reject numeric field below minimum', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateField('expectedStatus', 50, {
        type: 'number',
        min: 100,
        max: 599,
      });
      
      expect(error).toContain('must be at least 100');
    });

    it('should reject numeric field above maximum', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateField('expectedStatus', 600, {
        type: 'number',
        min: 100,
        max: 599,
      });
      
      expect(error).toContain('must be at most 599');
    });

    it('should reject non-numeric value for number type', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateField('expectedStatus', 'not a number', {
        type: 'number',
        min: 100,
        max: 599,
      });
      
      expect(error).toContain('must be a valid number');
    });
  });

  describe('validateThresholdExpression', () => {
    it('should validate non-empty threshold expression', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateThresholdExpression('p(95)<500');
      
      expect(error).toBeNull();
    });

    it('should reject empty threshold expression', () => {
      const { result } = renderHook(() => useValidation());
      
      const error = result.current.validateThresholdExpression('');
      
      expect(error).toBe('Threshold expression cannot be empty or whitespace only');
    });
  });

  describe('validateEndpoint', () => {
    it('should validate a valid endpoint', () => {
      const { result } = renderHook(() => useValidation());
      
      const validEndpoint: EndpointDraft = {
        id: '1',
        name: 'Test Endpoint',
        url: 'https://api.example.com',
        method: 'POST',
        headersText: '{"Content-Type": "application/json"}',
        payloadText: '{"key": "value"}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [{
          type: 'loadtest',
          enabled: true,
          stages: [{ duration: '30s', target: 10 }],
          thresholds: [],
        }],
      };
      
      const validation = result.current.validateEndpoint(validEndpoint);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid URL in endpoint', () => {
      const { result } = renderHook(() => useValidation());
      
      const invalidEndpoint: EndpointDraft = {
        id: '1',
        name: 'Test Endpoint',
        url: 'invalid-url',
        method: 'POST',
        headersText: '{"Content-Type": "application/json"}',
        payloadText: '{}',
        expectedStatus: 200,
        maxRetries: 3,
        thinkTimeSeconds: 1,
        profiles: [],
      };
      
      const validation = result.current.validateEndpoint(invalidEndpoint);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.field === 'url')).toBe(true);
    });
  });

  describe('validateExportReady', () => {
    it('should validate export-ready state with valid endpoint', () => {
      const { result } = renderHook(() => useValidation());
      
      const validState: AppState = {
        endpoints: [{
          id: '1',
          name: 'Test Endpoint',
          url: 'https://api.example.com',
          method: 'POST',
          headersText: '{"Content-Type": "application/json"}',
          payloadText: '{}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [{
            type: 'loadtest',
            enabled: true,
            stages: [{ duration: '30s', target: 10 }],
            thresholds: [],
          }],
        }],
        activeEndpointId: '1',
      };
      
      const validation = result.current.validateExportReady(validState);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject export when no endpoints exist', () => {
      const { result } = renderHook(() => useValidation());
      
      const emptyState: AppState = {
        endpoints: [],
        activeEndpointId: null,
      };
      
      const validation = result.current.validateExportReady(emptyState);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.message.includes('At least one endpoint is required for export'))).toBe(true);
    });

    it('should reject export when no profile is enabled', () => {
      const { result } = renderHook(() => useValidation());
      
      const stateWithoutProfiles: AppState = {
        endpoints: [{
          id: '1',
          name: 'Test Endpoint',
          url: 'https://api.example.com',
          method: 'POST',
          headersText: '{"Content-Type": "application/json"}',
          payloadText: '{}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [{
            type: 'loadtest',
            enabled: false,
            stages: [{ duration: '30s', target: 10 }],
            thresholds: [],
          }],
        }],
        activeEndpointId: '1',
      };
      
      const validation = result.current.validateExportReady(stateWithoutProfiles);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('profile'))).toBe(true);
    });
  });
});
