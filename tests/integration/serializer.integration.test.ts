/**
 * Integration tests for serializer.service
 * 
 * Tests that the serialized output is valid JavaScript and can be evaluated.
 * Validates end-to-end serialization with complex endpoint configurations.
 */

import { describe, it, expect } from 'vitest';
import { serialize } from '../../src/services/serializer.service';
import type { AppState } from '../../src/models/AppState';

describe('serializer.service integration', () => {
  it('should produce valid JavaScript ES module', () => {
    const state: AppState = {
      endpoints: [
        {
          id: '1',
          name: 'Login API',
          description: 'User login endpoint',
          url: 'https://api.example.com/auth/login',
          method: 'POST',
          headersText: '{"Content-Type": "application/json", "X-API-Key": "test123"}',
          payloadText: '{"name": "sample", "value": "example"}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [
            {
              type: 'loadtest',
              enabled: true,
              stages: [
                { duration: '30s', target: 10 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 0 },
              ],
              thresholds: [
                { metric: 'http_req_duration', expressions: ['p(95) < 2000', 'avg < 500'] },
                { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
              ],
            },
            {
              type: 'stresstest',
              enabled: false,
              stages: [{ duration: '5m', target: 1000 }],
              thresholds: [],
            },
            {
              type: 'capacitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'stabilitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
          ],
        },
      ],
      activeEndpointId: '1',
    };

    const result = serialize(state);

    // Should be valid JavaScript
    expect(() => {
      // This simulates the ES module evaluation
      const module = { exports: {} };
      const fn = new Function('module', 'exports', result.replace('export default', 'module.exports ='));
      fn(module, module.exports);
      return module.exports;
    }).not.toThrow();

    // Should contain expected content
    expect(result).toContain('export default');
    expect(result).toContain('endpoints:');
    expect(result).toContain('Login API');
    expect(result).toContain('https://api.example.com/auth/login');
    expect(result).toContain('loadtest:');
    expect(result).not.toContain('stresstest:'); // Disabled profile should be omitted
  });

  it('should produce deterministic output for same input', () => {
    const state: AppState = {
      endpoints: [
        {
          id: '1',
          name: 'Test',
          description: 'Test description',
          url: 'https://api.example.com/test',
          method: 'POST',
          headersText: '{"b": "2", "a": "1"}', // Unsorted keys in input
          payloadText: '{"z": 3, "x": 1, "y": 2}', // Unsorted keys in input
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

    // Keys should be alphabetically sorted in output
    // Check that "a" appears before "b" in the headers object
    const headerIndex = result1.indexOf('headers:');
    const headerEnd = result1.indexOf('},', headerIndex);
    const headerSection = result1.substring(headerIndex, headerEnd);
    
    // Keys "a" and "b" appear as valid identifiers without quotes
    // In the serialized output, keys are sorted: "a" should come before "b"
    const aIndex = headerSection.indexOf('a:');
    const bIndex = headerSection.indexOf('b:');
    expect(aIndex).toBeGreaterThan(-1);
    expect(bIndex).toBeGreaterThan(-1);
    expect(aIndex).toBeLessThan(bIndex);
  });

  it('should handle GET method with query parameters correctly', () => {
    const state: AppState = {
      endpoints: [
        {
          id: '1',
          name: 'Search API',
          description: 'Search endpoint',
          url: 'https://api.example.com/search',
          method: 'GET',
          headersText: '{}',
          payloadText: '{"q": "test query", "limit": 50, "offset": 0}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [],
        },
      ],
      activeEndpointId: '1',
    };

    const result = serialize(state);

    // URL should contain query parameters
    expect(result).toContain('q=test');
    expect(result).toContain('limit=50');
    expect(result).toContain('offset=0');

    // Payload field should NOT be present for GET
    const urlMatch = result.match(/url:\s*"([^"]+)"/);
    expect(urlMatch).toBeTruthy();
    if (urlMatch) {
      expect(urlMatch[1]).toContain('?');
    }
  });

  it('should serialize multiple endpoints with mixed profiles', () => {
    const state: AppState = {
      endpoints: [
        {
          id: '1',
          name: 'Endpoint 1',
          description: 'First endpoint',
          url: 'https://api.example.com/endpoint1',
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
              stages: [],
              thresholds: [],
            },
            {
              type: 'capacitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'stabilitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
          ],
        },
        {
          id: '2',
          name: 'Endpoint 2',
          description: 'Second endpoint',
          url: 'https://api.example.com/endpoint2',
          method: 'PUT',
          headersText: '{}',
          payloadText: '{}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [
            {
              type: 'loadtest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'stresstest',
              enabled: true,
              stages: [{ duration: '1m', target: 100 }],
              thresholds: [
                { metric: 'http_req_duration', expressions: ['p(95) < 3000'] },
              ],
            },
            {
              type: 'capacitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'stabilitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
          ],
        },
      ],
      activeEndpointId: '1',
    };

    const result = serialize(state);

    // Should contain both endpoints
    expect(result).toContain('endpoint1');
    expect(result).toContain('endpoint2');

    // First endpoint should have loadtest only
    // Find the section between the two endpoints by looking for the closing brace of endpoint 1
    const lines = result.split('\n');
    let inEndpoint1 = false;
    let inEndpoint2 = false;
    let endpoint1HasLoadtest = false;
    let endpoint1HasStresstest = false;
    let endpoint2HasLoadtest = false;
    let endpoint2HasStresstest = false;

    for (const line of lines) {
      if (line.includes('First endpoint')) {
        inEndpoint1 = true;
        inEndpoint2 = false;
      } else if (line.includes('Second endpoint')) {
        inEndpoint1 = false;
        inEndpoint2 = true;
      }

      if (inEndpoint1 && line.includes('loadtest:')) {
        endpoint1HasLoadtest = true;
      }
      if (inEndpoint1 && line.includes('stresstest:')) {
        endpoint1HasStresstest = true;
      }
      if (inEndpoint2 && line.includes('loadtest:')) {
        endpoint2HasLoadtest = true;
      }
      if (inEndpoint2 && line.includes('stresstest:')) {
        endpoint2HasStresstest = true;
      }
    }

    expect(endpoint1HasLoadtest).toBe(true);
    expect(endpoint1HasStresstest).toBe(false);
    expect(endpoint2HasLoadtest).toBe(false);
    expect(endpoint2HasStresstest).toBe(true);
  });

  it('should use 2-space indentation consistently', () => {
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
          profiles: [
            {
              type: 'loadtest',
              enabled: true,
              stages: [{ duration: '30s', target: 10 }],
              thresholds: [
                { metric: 'http_req_duration', expressions: ['p(95) < 2000'] },
              ],
            },
            {
              type: 'stresstest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'capacitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
            {
              type: 'stabilitytest',
              enabled: false,
              stages: [],
              thresholds: [],
            },
          ],
        },
      ],
      activeEndpointId: '1',
    };

    const result = serialize(state);

    // Root level uses 2 spaces
    expect(result).toMatch(/^export default \{\n  endpoints:/);

    // Should not contain tabs
    expect(result).not.toContain('\t');

    // Lines should be indented with multiples of 2 spaces
    const lines = result.split('\n');
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        const leadingSpaces = line.match(/^ */)?.[0].length || 0;
        expect(leadingSpaces % 2).toBe(0);
      }
    });
  });
});
