/**
 * Custom hook for validation functions
 * 
 * Wraps ValidationService functions with useCallback memoization.
 * Provides ready-to-use validation functions for components.
 * 
 * Note: Debounce logic is handled separately in useDebounce hook (task 7.3).
 * This hook only provides the memoized validation functions.
 * 
 * Requirements: 3.6
 */

import { useCallback } from 'react';
import {
  validateJson,
  validateDuration,
  validateMetricName,
  validateExportReady,
  validateUrl,
  validateMethod,
  validateField,
  validateThresholdExpression,
  validateEndpoint,
  type AppState,
  type EndpointDraft,
  type FieldConstraints,
  type ValidationResult,
} from '../services/validation.service';

/**
 * Return type for useValidation hook
 */
export interface UseValidationReturn {
  validateJson: (text: string, requireObject?: boolean) => string | null;
  validateDuration: (duration: string) => string | null;
  validateMetricName: (name: string) => string | null;
  validateExportReady: (state: AppState) => ValidationResult;
  validateUrl: (url: string) => string | null;
  validateMethod: (method: string) => string | null;
  validateField: (fieldName: string, value: unknown, constraints: FieldConstraints) => string | null;
  validateThresholdExpression: (expr: string) => string | null;
  validateEndpoint: (draft: EndpointDraft) => ValidationResult;
}

/**
 * Custom hook that provides memoized validation functions
 * 
 * Wraps all ValidationService functions with useCallback to prevent
 * unnecessary re-renders when passed as props to child components.
 * 
 * @returns Object with all validation functions available
 * 
 * Requirements: 3.6
 */
export function useValidation(): UseValidationReturn {
  // Wrap validateJson with useCallback
  const memoizedValidateJson = useCallback((text: string, requireObject?: boolean): string | null => {
    return validateJson(text, requireObject);
  }, []);

  // Wrap validateDuration with useCallback
  const memoizedValidateDuration = useCallback((duration: string): string | null => {
    return validateDuration(duration);
  }, []);

  // Wrap validateMetricName with useCallback
  const memoizedValidateMetricName = useCallback((name: string): string | null => {
    return validateMetricName(name);
  }, []);

  // Wrap validateExportReady with useCallback
  const memoizedValidateExportReady = useCallback((state: AppState): ValidationResult => {
    return validateExportReady(state);
  }, []);

  // Wrap validateUrl with useCallback
  const memoizedValidateUrl = useCallback((url: string): string | null => {
    return validateUrl(url);
  }, []);

  // Wrap validateMethod with useCallback
  const memoizedValidateMethod = useCallback((method: string): string | null => {
    return validateMethod(method);
  }, []);

  // Wrap validateField with useCallback
  const memoizedValidateField = useCallback((
    fieldName: string,
    value: unknown,
    constraints: FieldConstraints
  ): string | null => {
    return validateField(fieldName, value, constraints);
  }, []);

  // Wrap validateThresholdExpression with useCallback
  const memoizedValidateThresholdExpression = useCallback((expr: string): string | null => {
    return validateThresholdExpression(expr);
  }, []);

  // Wrap validateEndpoint with useCallback
  const memoizedValidateEndpoint = useCallback((draft: EndpointDraft): ValidationResult => {
    return validateEndpoint(draft);
  }, []);

  return {
    validateJson: memoizedValidateJson,
    validateDuration: memoizedValidateDuration,
    validateMetricName: memoizedValidateMetricName,
    validateExportReady: memoizedValidateExportReady,
    validateUrl: memoizedValidateUrl,
    validateMethod: memoizedValidateMethod,
    validateField: memoizedValidateField,
    validateThresholdExpression: memoizedValidateThresholdExpression,
    validateEndpoint: memoizedValidateEndpoint,
  };
}
