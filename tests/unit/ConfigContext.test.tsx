/**
 * Unit tests for ConfigContext
 * 
 * Tests the ConfigContext, ConfigProvider, and useConfig hook.
 * Validates proper context creation, provider functionality, and error handling.
 * 
 * @validates Requirements 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfig, ConfigProvider } from '../../src/context/ConfigContext';
import React from 'react';

describe('ConfigContext', () => {
  it('useConfig should throw error when used outside provider', () => {
    // The hook should enforce usage within a ConfigProvider
    expect(() => {
      renderHook(() => useConfig());
    }).toThrow('useConfig must be used within a ConfigProvider');
  });

  it('useConfig should work when used inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConfigProvider>{children}</ConfigProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });

    // Verify initial state (Requirement 1.2)
    expect(result.current.state).toBeDefined();
    expect(result.current.state.endpoints).toEqual([]);
    expect(result.current.state.activeEndpointId).toBeNull();
    expect(result.current.dispatch).toBeDefined();
  });

  it('ConfigProvider should initialize with empty state (Requirement 1.2, 1.4)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConfigProvider>{children}</ConfigProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });

    // Initial state should have empty endpoints and no active selection
    expect(result.current.state.endpoints.length).toBe(0);
    expect(result.current.state.activeEndpointId).toBeNull();
  });

  it('dispatch should be callable', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConfigProvider>{children}</ConfigProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });

    // Initial state should be empty
    expect(result.current.state.endpoints.length).toBe(0);

    // Should be able to dispatch actions without throwing
    expect(() => {
      result.current.dispatch({ type: 'ADD_ENDPOINT' });
    }).not.toThrow();

    // Verify dispatch function exists and is callable
    expect(result.current.dispatch).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });
});
