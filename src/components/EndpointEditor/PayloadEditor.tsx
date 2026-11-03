/**
 * PayloadEditor Component
 * 
 * Provides a textarea for editing the HTTP payload/body as JSON.
 * When the method is GET, the label dynamically changes to indicate "Query Parameters".
 * Validates that the input is valid JSON (any type allowed).
 * Shows inline validation errors with 500ms debounce.
 * 
 * Requirements: 3.4, 3.5, 3.6
 */

import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useValidation } from '../../hooks/useValidation';
import { ValidationMessage } from '../common/ValidationMessage';
import type { HttpMethod } from '../../models/EndpointDraft';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './PayloadEditor.module.css';

export interface PayloadEditorProps {
  payloadText: string;
  method: HttpMethod;
  onPayloadChange: (payloadText: string) => void;
}

export const PayloadEditor: React.FC<PayloadEditorProps> = ({
  payloadText,
  method,
  onPayloadChange,
}) => {
  const validation = useValidation();
  const { language, t } = useLanguage();

  // Local state for validation error
  const [payloadError, setPayloadError] = useState<string | null>(null);

  // Debounced value for validation
  const debouncedPayloadText = useDebounce(payloadText);

  // Validate payload on debounced change
  // requireObject = false to allow any valid JSON (object, array, primitive)
  useEffect(() => {
    const error = validation.validateJson(debouncedPayloadText, false);
    setPayloadError(error);
  }, [debouncedPayloadText, validation]);

  // Determine label and description based on HTTP method
  const isGetMethod = method === 'GET';
  const label = isGetMethod ? t('payload.queryLabel') : t('payload.label');
  const description = isGetMethod
    ? t('payload.queryDescription')
    : t('payload.description');
  const placeholder = isGetMethod
    ? '{\n  "page": 1,\n  "limit": 10,\n  "filter": "active"\n}'
    : '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}';

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>
        {isGetMethod ? t('payload.queryTitle') : t('payload.title')}
      </h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.field}>
        <label htmlFor="endpoint-payload" className={styles.label}>
          {label} <span className={styles.required}>*</span>
        </label>
        <textarea
          id="endpoint-payload"
          value={payloadText}
          onChange={(e) => onPayloadChange(e.target.value)}
          rows={8}
          className={`${styles.textarea} ${payloadError ? styles.textareaError : ''}`}
          placeholder={placeholder}
          spellCheck={false}
        />
        <ValidationMessage message={translateValidationMessage(payloadError, language)} />
      </div>

      {isGetMethod && (
        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            {t('payload.getInfo')}
          </span>
        </div>
      )}
    </div>
  );
};
