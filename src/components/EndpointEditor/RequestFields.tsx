/**
 * RequestFields Component
 * 
 * Provides input fields for the core request configuration:
 * - URL (text input with validation)
 * - HTTP Method (select dropdown)
 * - Expected Status (number input)
 * - Max Retries (number input)
 * - Think Time in Seconds (number input)
 * 
 * All fields include inline validation using the ValidationMessage component.
 * Validation is triggered with 500ms debounce after field changes.
 * 
 * Requirements: 3.1, 3.2, 3.6, 3.7, 3.8
 */

import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useValidation } from '../../hooks/useValidation';
import { ValidationMessage } from '../common/ValidationMessage';
import {
  HTTP_METHODS,
  EXPECTED_STATUS_RANGE,
  MAX_RETRIES_RANGE,
  THINK_TIME_RANGE,
} from '../../utils/constants';
import type { HttpMethod } from '../../models/EndpointDraft';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './RequestFields.module.css';

export interface RequestFieldsProps {
  url: string;
  method: HttpMethod;
  expectedStatus: number;
  maxRetries: number;
  thinkTimeSeconds: number;
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onExpectedStatusChange: (status: number) => void;
  onMaxRetriesChange: (retries: number) => void;
  onThinkTimeChange: (thinkTime: number) => void;
}

export const RequestFields: React.FC<RequestFieldsProps> = ({
  url,
  method,
  expectedStatus,
  maxRetries,
  thinkTimeSeconds,
  onUrlChange,
  onMethodChange,
  onExpectedStatusChange,
  onMaxRetriesChange,
  onThinkTimeChange,
}) => {
  const validation = useValidation();
  const { language, t } = useLanguage();

  // Local state for validation errors
  const [urlError, setUrlError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [expectedStatusError, setExpectedStatusError] = useState<string | null>(null);
  const [maxRetriesError, setMaxRetriesError] = useState<string | null>(null);
  const [thinkTimeError, setThinkTimeError] = useState<string | null>(null);

  // Debounced values for validation
  const debouncedUrl = useDebounce(url);
  const debouncedExpectedStatus = useDebounce(expectedStatus);
  const debouncedMaxRetries = useDebounce(maxRetries);
  const debouncedThinkTime = useDebounce(thinkTimeSeconds);

  // Validate URL on debounced change
  useEffect(() => {
    const error = validation.validateUrl(debouncedUrl);
    setUrlError(error);
  }, [debouncedUrl, validation]);

  // Validate method on change
  useEffect(() => {
    const error = validation.validateMethod(method);
    setMethodError(error);
  }, [method, validation]);

  // Validate expectedStatus on debounced change
  useEffect(() => {
    const error = validation.validateField('expectedStatus', debouncedExpectedStatus, {
      min: EXPECTED_STATUS_RANGE.min,
      max: EXPECTED_STATUS_RANGE.max,
      type: 'number',
    });
    setExpectedStatusError(error);
  }, [debouncedExpectedStatus, validation]);

  // Validate maxRetries on debounced change
  useEffect(() => {
    const error = validation.validateField('maxRetries', debouncedMaxRetries, {
      min: MAX_RETRIES_RANGE.min,
      max: MAX_RETRIES_RANGE.max,
      type: 'number',
    });
    setMaxRetriesError(error);
  }, [debouncedMaxRetries, validation]);

  // Validate thinkTimeSeconds on debounced change
  useEffect(() => {
    const error = validation.validateField('thinkTimeSeconds', debouncedThinkTime, {
      min: THINK_TIME_RANGE.min,
      max: THINK_TIME_RANGE.max,
      type: 'number',
    });
    setThinkTimeError(error);
  }, [debouncedThinkTime, validation]);

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>{t('request.title')}</h3>

      {/* URL Field */}
      <div className={styles.field}>
        <label htmlFor="endpoint-url" className={styles.label}>
          URL <span className={styles.required}>*</span>
        </label>
        <input
          id="endpoint-url"
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className={`${styles.input} ${urlError ? styles.inputError : ''}`}
        />
        <ValidationMessage message={translateValidationMessage(urlError, language)} />
      </div>

      {/* Method Field */}
      <div className={styles.field}>
        <label htmlFor="endpoint-method" className={styles.label}>
          {t('request.method')} <span className={styles.required}>*</span>
        </label>
        <select
          id="endpoint-method"
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          className={`${styles.select} ${methodError ? styles.inputError : ''}`}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ValidationMessage message={translateValidationMessage(methodError, language)} />
      </div>

      {/* Expected Status Field */}
      <div className={styles.field}>
        <label htmlFor="endpoint-expected-status" className={styles.label}>
          {t('request.expectedStatus')} <span className={styles.required}>*</span>
        </label>
        <input
          id="endpoint-expected-status"
          type="number"
          value={expectedStatus}
          onChange={(e) => onExpectedStatusChange(Number(e.target.value))}
          min={EXPECTED_STATUS_RANGE.min}
          max={EXPECTED_STATUS_RANGE.max}
          className={`${styles.input} ${styles.inputNumber} ${expectedStatusError ? styles.inputError : ''}`}
        />
        <span className={styles.hint}>
          {t('request.validRange', {
            min: EXPECTED_STATUS_RANGE.min,
            max: EXPECTED_STATUS_RANGE.max,
          })}
        </span>
        <ValidationMessage message={translateValidationMessage(expectedStatusError, language)} />
      </div>

      {/* Max Retries Field */}
      <div className={styles.field}>
        <label htmlFor="endpoint-max-retries" className={styles.label}>
          {t('request.maxRetries')} <span className={styles.required}>*</span>
        </label>
        <input
          id="endpoint-max-retries"
          type="number"
          value={maxRetries}
          onChange={(e) => onMaxRetriesChange(Number(e.target.value))}
          min={MAX_RETRIES_RANGE.min}
          max={MAX_RETRIES_RANGE.max}
          className={`${styles.input} ${styles.inputNumber} ${maxRetriesError ? styles.inputError : ''}`}
        />
        <span className={styles.hint}>
          {t('request.validRange', {
            min: MAX_RETRIES_RANGE.min,
            max: MAX_RETRIES_RANGE.max,
          })}
        </span>
        <ValidationMessage message={translateValidationMessage(maxRetriesError, language)} />
      </div>

      {/* Think Time Field */}
      <div className={styles.field}>
        <label htmlFor="endpoint-think-time" className={styles.label}>
          {t('request.thinkTime')} <span className={styles.required}>*</span>
        </label>
        <input
          id="endpoint-think-time"
          type="number"
          value={thinkTimeSeconds}
          onChange={(e) => onThinkTimeChange(Number(e.target.value))}
          min={THINK_TIME_RANGE.min}
          max={THINK_TIME_RANGE.max}
          step="0.1"
          className={`${styles.input} ${styles.inputNumber} ${thinkTimeError ? styles.inputError : ''}`}
        />
        <span className={styles.hint}>
          {t('request.validSeconds', {
            min: THINK_TIME_RANGE.min,
            max: THINK_TIME_RANGE.max,
          })}
        </span>
        <ValidationMessage message={translateValidationMessage(thinkTimeError, language)} />
      </div>
    </div>
  );
};
