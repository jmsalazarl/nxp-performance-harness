import { AppState } from '../models/AppState';

const DB_NAME = 'testk6ba-config-builder';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'current';
const SCHEMA_VERSION = 1;

export interface PersistedAppState {
  schemaVersion: number;
  state: AppState;
  updatedAt: string;
}

const isBrowserIndexedDbAvailable = (): boolean =>
  typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function';

export const isPersistenceAvailable = isBrowserIndexedDbAvailable;

const openDatabase = (): Promise<IDBDatabase> => {
  if (!isBrowserIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
  });
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
};

const isPersistedAppState = (value: unknown): value is PersistedAppState => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as PersistedAppState;

  return (
    candidate.schemaVersion === SCHEMA_VERSION &&
    typeof candidate.updatedAt === 'string' &&
    !!candidate.state &&
    Array.isArray(candidate.state.endpoints) &&
    (candidate.state.activeEndpointId === null ||
      typeof candidate.state.activeEndpointId === 'string')
  );
};

export const loadPersistedState = async (): Promise<AppState | null> => {
  if (!isBrowserIndexedDbAvailable()) {
    return null;
  }

  try {
    const persisted = await withStore<PersistedAppState | undefined>('readonly', (store) =>
      store.get(STATE_KEY)
    );

    if (!persisted) {
      return null;
    }

    if (!isPersistedAppState(persisted)) {
      console.warn('Ignoring invalid persisted config builder state');
      return null;
    }

    return persisted.state;
  } catch (error) {
    console.warn('Unable to load persisted config builder state', error);
    return null;
  }
};

export const savePersistedState = async (state: AppState): Promise<void> => {
  if (!isBrowserIndexedDbAvailable()) {
    return;
  }

  const persisted: PersistedAppState = {
    schemaVersion: SCHEMA_VERSION,
    state,
    updatedAt: new Date().toISOString(),
  };

  await withStore<IDBValidKey>('readwrite', (store) => store.put(persisted, STATE_KEY));
};

export const clearPersistedState = async (): Promise<void> => {
  if (!isBrowserIndexedDbAvailable()) {
    return;
  }

  await withStore<undefined>('readwrite', (store) => store.delete(STATE_KEY));
};

export const PersistenceService = {
  isAvailable: isPersistenceAvailable,
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
};
