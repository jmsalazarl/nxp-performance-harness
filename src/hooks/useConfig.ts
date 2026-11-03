/**
 * useConfig Hook - Barrel Export
 * 
 * This module provides a clean import path for the useConfig hook.
 * Instead of importing from the context directory, components can import
 * directly from the hooks directory, maintaining better separation of concerns.
 * 
 * The hook returns { state, dispatch } from the ConfigContext, allowing
 * components to read the application state and dispatch actions.
 * 
 * @module hooks/useConfig
 * 
 * @example
 * ```tsx
 * import { useConfig } from '../hooks/useConfig';
 * 
 * function MyComponent() {
 *   const { state, dispatch } = useConfig();
 *   
 *   return <div>{state.endpoints.length} endpoints</div>;
 * }
 * ```
 */

export { useConfig, type ConfigContextValue } from '../context/ConfigContext';
