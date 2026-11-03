/**
 * Example usage of serializer.service
 * 
 * Demonstrates how to serialize AppState into a config.js ES module.
 */

import { serialize } from '../src/services/serializer.service';
import type { AppState } from '../src/models/AppState';

// Example 1: Simple endpoint with loadtest profile
const simpleState: AppState = {
  endpoints: [
    {
      id: '1',
      name: 'Login API',
      description: 'User authentication endpoint',
      url: 'https://api.example.com/auth/login',
      method: 'POST',
      headersText: '{"Content-Type": "application/json"}',
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

console.log('=== Example 1: Simple endpoint with loadtest ===');
console.log(serialize(simpleState));

// Example 2: GET endpoint with query parameters
const getState: AppState = {
  endpoints: [
    {
      id: '1',
      name: 'Search API',
      description: 'Search products',
      url: 'https://api.example.com/search',
      method: 'GET',
      headersText: '{"X-API-Key": "test123"}',
      payloadText: '{"q": "laptop", "limit": 20, "offset": 0}',
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
  ],
  activeEndpointId: '1',
};

console.log('\n=== Example 2: GET endpoint with query parameters ===');
console.log(serialize(getState));

// Example 3: Multiple endpoints with different profiles
const multiState: AppState = {
  endpoints: [
    {
      id: '1',
      name: 'Create Order',
      description: 'Create a new order',
      url: 'https://api.example.com/orders',
      method: 'POST',
      headersText: '{"Content-Type": "application/json"}',
      payloadText: '{"product": "laptop", "quantity": 1}',
      expectedStatus: 201,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      profiles: [
        {
          type: 'loadtest',
          enabled: true,
          stages: [{ duration: '1m', target: 50 }],
          thresholds: [
            { metric: 'http_req_duration', expressions: ['p(95) < 3000'] },
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
    {
      id: '2',
      name: 'Get Order Status',
      description: 'Check order status',
      url: 'https://api.example.com/orders/123',
      method: 'GET',
      headersText: '{}',
      payloadText: '{}',
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 0.5,
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
          stages: [
            { duration: '2m', target: 100 },
            { duration: '5m', target: 200 },
            { duration: '2m', target: 0 },
          ],
          thresholds: [
            { metric: 'http_req_duration', expressions: ['p(99) < 5000'] },
            { metric: 'http_req_failed', expressions: ['rate < 0.05'] },
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

console.log('\n=== Example 3: Multiple endpoints with different profiles ===');
console.log(serialize(multiState));

// Example 4: Endpoint with custom metrics
const customMetricsState: AppState = {
  endpoints: [
    {
      id: '1',
      name: 'Payment API',
      description: 'Process payment',
      url: 'https://api.example.com/payments',
      method: 'POST',
      headersText: '{"Content-Type": "application/json"}',
      payloadText: '{"amount": 100, "currency": "USD"}',
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      profiles: [
        {
          type: 'loadtest',
          enabled: true,
          stages: [{ duration: '1m', target: 20 }],
          thresholds: [
            { metric: 'http_req_duration', expressions: ['p(95) < 2000'] },
            { metric: 'payment_success_rate', expressions: ['rate > 0.99'] },
            { metric: 'transaction_amount_avg', expressions: ['value >= 50'] },
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

console.log('\n=== Example 4: Endpoint with custom metrics ===');
console.log(serialize(customMetricsState));
