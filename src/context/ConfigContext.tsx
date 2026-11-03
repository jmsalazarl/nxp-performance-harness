/**
 * ConfigContext - React Context for application state management
 * 
 * This module provides:
 * - ConfigContext: React Context for sharing state across components
 * - ConfigProvider: Provider component that wraps the app with state management
 * - useConfig: Custom hook for accessing the context from components
 * 
 * The context manages the entire application state (endpoints, active endpoint)
 * using the useReducer hook with the configReducer.
 * 
 * Initial state:
 * - endpoints: [] (empty array)
 * - activeEndpointId: null (no active endpoint)
 * 
 * @validates Requirements 1.2, 1.3, 1.4
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  ReactNode,
} from 'react';
import { AppState } from '../models/AppState';
import { configReducer, ConfigAction, createInitialState } from './configReducer';
import { PersistenceService } from '../services/persistence.service';

/**
 * Context value interface containing state and dispatch function
 */
export interface ConfigContextValue {
  state: AppState;
  dispatch: React.Dispatch<ConfigAction>;
  isHydrated: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  persistenceError: string | null;
}

/**
 * Initial application state
 * Empty endpoints array and no active endpoint (Requirements 1.2, 1.4)
 */
const initialState: AppState = createInitialState();

/**
 * React Context for config state
 * Default value is undefined to enforce proper provider usage
 */
const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

/**
 * Props for ConfigProvider component
 */
export interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * ConfigProvider component
 * 
 * Wraps the application with state management context.
 * Uses useReducer with configReducer to manage state mutations.
 * 
 * State is maintained in memory during the browser session (Requirement 1.3)
 * and is reset on page reload (Requirement 1.4).
 * 
 * @param props - Component props containing children to wrap
 * @returns Provider component wrapping children with config context
 */
export function ConfigProvider({ children }: ConfigProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(configReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(() => !PersistenceService.isAvailable());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    if (!PersistenceService.isAvailable()) {
      return;
    }

    let isMounted = true;

    PersistenceService.loadPersistedState()
      .then((persistedState) => {
        if (!isMounted) return;

        if (persistedState) {
          dispatch({ type: 'HYDRATE_STATE', state: persistedState });
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setPersistenceError(error instanceof Error ? error.message : 'Unable to load saved state');
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !PersistenceService.isAvailable()) return;

    const timeoutId = window.setTimeout(() => {
      setIsSaving(true);

      PersistenceService.savePersistedState(state)
        .then(() => {
          setLastSavedAt(new Date().toISOString());
          setPersistenceError(null);
        })
        .catch((error: unknown) => {
          setPersistenceError(error instanceof Error ? error.message : 'Unable to save state');
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [isHydrated, state]);

  const value: ConfigContextValue = useMemo(
    () => ({
      state,
      dispatch,
      isHydrated,
      isSaving,
      lastSavedAt,
      persistenceError,
    }),
    [isHydrated, isSaving, lastSavedAt, persistenceError, state]
  );

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * useConfig hook
 * 
 * Custom hook for accessing the config context from components.
 * 
 * This hook enforces that components using it are wrapped in a ConfigProvider.
 * If called outside a provider, it throws an error to prevent undefined behavior.
 * 
 * @throws {Error} If used outside of ConfigProvider
 * @returns ConfigContextValue containing state and dispatch
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, dispatch } = useConfig();
 *   
 *   const addEndpoint = () => {
 *     dispatch({ type: 'ADD_ENDPOINT' });
 *   };
 *   
 *   return <div>{state.endpoints.length} endpoints</div>;
 * }
 * ```
 */
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }

  return context;
}
