/**
 * EndpointEditor Component
 * 
 * Displays and edits the details of the currently active endpoint.
 * This component orchestrates all sub-editors:
 * - RequestFields (URL, method, status, retries, thinkTime)
 * - HeadersEditor (JSON headers)
 * - PayloadEditor (JSON payload)
 * - ProfileEditor (Profile configuration with StagesEditor and ThresholdsEditor)
 * 
 * Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.6
 */

import React, { useEffect, useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { ValidationMessage } from '../common/ValidationMessage';
import { RequestFields } from './RequestFields';
import { HeadersEditor } from './HeadersEditor';
import { PayloadEditor } from './PayloadEditor';
import { ProfileEditor } from '../ProfileEditor';
import type { HttpMethod } from '../../models/EndpointDraft';
import { useLanguage } from '../../i18n';
import styles from './EndpointEditor.module.css';

export const EndpointEditor: React.FC = () => {
  const { state, dispatch } = useConfig();
  const { t } = useLanguage();
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const activeEndpoint = state.endpoints.find(
    (ep) => ep.id === state.activeEndpointId
  );

  useEffect(() => {
    if (!activeEndpoint) {
      setNameDraft('');
      setNameError(null);
      return;
    }

    setNameDraft(activeEndpoint.name);
    setNameError(null);
  }, [activeEndpoint?.id, activeEndpoint?.name]);

  if (!activeEndpoint) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>{t('endpoint.noneSelected')}</p>
          <p>{t('endpoint.selectOrCreate')}</p>
        </div>
      </div>
    );
  }

  // Handler functions to update the active endpoint
  const handleUrlChange = (url: string) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { url },
    });
  };

  const handleMethodChange = (method: HttpMethod) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { method },
    });
  };

  const handleExpectedStatusChange = (expectedStatus: number) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { expectedStatus },
    });
  };

  const handleMaxRetriesChange = (maxRetries: number) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { maxRetries },
    });
  };

  const handleThinkTimeChange = (thinkTimeSeconds: number) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { thinkTimeSeconds },
    });
  };

  const handleHeadersChange = (headersText: string) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { headersText },
    });
  };

  const handlePayloadChange = (payloadText: string) => {
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { payloadText },
    });
  };

  const handleNameChange = (name: string) => {
    setNameDraft(name);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('endpoint.nameRequired'));
      return;
    }

    setNameError(null);
    dispatch({
      type: 'UPDATE_ENDPOINT',
      id: activeEndpoint.id,
      patch: { name: trimmedName },
    });
  };

  const handleNameBlur = () => {
    if (!nameDraft.trim()) {
      setNameDraft(activeEndpoint.name);
      setNameError(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.visuallyHidden}>{activeEndpoint.name}</h2>
        <label className={styles.nameField}>
          {t('endpoint.name')}
          <input
            type="text"
            value={nameDraft}
            maxLength={100}
            onChange={(event) => handleNameChange(event.target.value)}
            onBlur={handleNameBlur}
            className={styles.nameInput}
            aria-invalid={nameError ? 'true' : 'false'}
          />
        </label>
        {nameError && <ValidationMessage message={nameError} />}
        {activeEndpoint.description && (
          <p className={styles.description}>{activeEndpoint.description}</p>
        )}
      </div>

      <div className={styles.content}>
        {/* Request Configuration Fields */}
        <RequestFields
          url={activeEndpoint.url}
          method={activeEndpoint.method}
          expectedStatus={activeEndpoint.expectedStatus}
          maxRetries={activeEndpoint.maxRetries}
          thinkTimeSeconds={activeEndpoint.thinkTimeSeconds}
          onUrlChange={handleUrlChange}
          onMethodChange={handleMethodChange}
          onExpectedStatusChange={handleExpectedStatusChange}
          onMaxRetriesChange={handleMaxRetriesChange}
          onThinkTimeChange={handleThinkTimeChange}
        />

        {/* Headers Editor */}
        <HeadersEditor
          headersText={activeEndpoint.headersText}
          onHeadersChange={handleHeadersChange}
        />

        {/* Payload Editor */}
        <PayloadEditor
          payloadText={activeEndpoint.payloadText}
          method={activeEndpoint.method}
          onPayloadChange={handlePayloadChange}
        />

        {/* Profile Editor - includes ProfileTabs, StagesEditor, and ThresholdsEditor */}
        <ProfileEditor endpointId={activeEndpoint.id} />
      </div>
    </div>
  );
};
