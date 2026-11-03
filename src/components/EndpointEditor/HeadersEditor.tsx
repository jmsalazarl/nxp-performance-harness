/**
 * HeadersEditor Component
 * 
 * Provides a textarea for editing HTTP headers as JSON.
 * Validates that the input is valid JSON and specifically an object (not array or primitive).
 * Shows inline validation errors with 500ms debounce.
 * 
 * Requirements: 3.3, 3.6
 */

import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useValidation } from '../../hooks/useValidation';
import { ValidationMessage } from '../common/ValidationMessage';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './HeadersEditor.module.css';

export interface HeadersEditorProps {
  headersText: string;
  onHeadersChange: (headersText: string) => void;
}

export const HeadersEditor: React.FC<HeadersEditorProps> = ({
  headersText,
  onHeadersChange,
}) => {
  const validation = useValidation();
  const { language, t } = useLanguage();

  // Local state for validation error
  const [headersError, setHeadersError] = useState<string | null>(null);

  // Debounced value for validation
  const debouncedHeadersText = useDebounce(headersText);

  // Validate headers on debounced change
  // requireObject = true to ensure headers are an object (not array or primitive)
  useEffect(() => {
    const error = validation.validateJson(debouncedHeadersText, true);
    setHeadersError(error);
  }, [debouncedHeadersText, validation]);

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>{t('headers.title')}</h3>
      <p className={styles.description}>
        {t('headers.description')}{' '}
        <code>{`{ "Content-Type": "application/json" }`}</code>
      </p>

      <div className={styles.field}>
        <label htmlFor="endpoint-headers" className={styles.label}>
          {t('headers.label')} <span className={styles.required}>*</span>
        </label>
        <textarea
          id="endpoint-headers"
          value={headersText}
          onChange={(e) => onHeadersChange(e.target.value)}
          rows={6}
          className={`${styles.textarea} ${headersError ? styles.textareaError : ''}`}
          placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer <token>"\n}'
          spellCheck={false}
        />
        <ValidationMessage message={translateValidationMessage(headersError, language)} />
      </div>
    </div>
  );
};
