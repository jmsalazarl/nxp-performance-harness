import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedState,
  loadPersistedState,
  savePersistedState,
} from '../../src/services/persistence.service';
import { AppState } from '../../src/models/AppState';

const createRequest = <T>(result: T): IDBRequest<T> => {
  const request = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBRequest<T>;

  window.setTimeout(() => {
    request.onsuccess?.({ target: request } as unknown as Event);
  }, 0);

  return request;
};

const createIndexedDbMock = () => {
  const records = new Map<IDBValidKey, unknown>();
  let hasStore = false;

  const store = {
    get: (key: IDBValidKey) => createRequest(records.get(key)),
    put: (value: unknown, key: IDBValidKey) => {
      records.set(key, value);
      return createRequest(key);
    },
    delete: (key: IDBValidKey) => {
      records.delete(key);
      return createRequest(undefined);
    },
  };

  const db = {
    objectStoreNames: {
      contains: () => hasStore,
    },
    createObjectStore: () => {
      hasStore = true;
      return store;
    },
    transaction: () => ({
      objectStore: () => store,
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
    }),
    close: vi.fn(),
  };

  return {
    open: vi.fn(() => {
      const request = {
        result: db,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      } as unknown as IDBOpenDBRequest;

      window.setTimeout(() => {
        if (!hasStore) {
          request.onupgradeneeded?.({ target: request } as unknown as IDBVersionChangeEvent);
        }
        request.onsuccess?.({ target: request } as unknown as Event);
      }, 0);

      return request;
    }),
    records,
  };
};

describe('persistence.service', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', createIndexedDbMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and loads the app state from IndexedDB', async () => {
    const state: AppState = {
      endpoints: [
        {
          id: 'endpoint-1',
          name: 'Payments API',
          description: '',
          url: 'https://api.example.com/payments',
          method: 'POST',
          headersText: '{}',
          payloadText: '{}',
          expectedStatus: 200,
          maxRetries: 3,
          thinkTimeSeconds: 1,
          profiles: [],
        },
      ],
      activeEndpointId: 'endpoint-1',
    };

    await savePersistedState(state);

    await expect(loadPersistedState()).resolves.toEqual(state);
  });

  it('returns null when no state has been persisted', async () => {
    await expect(loadPersistedState()).resolves.toBeNull();
  });

  it('clears persisted app state', async () => {
    const state: AppState = {
      endpoints: [],
      activeEndpointId: null,
    };

    await savePersistedState(state);
    await clearPersistedState();

    await expect(loadPersistedState()).resolves.toBeNull();
  });
});
