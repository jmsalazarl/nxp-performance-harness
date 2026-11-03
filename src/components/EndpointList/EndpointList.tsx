/**
 * EndpointList Component
 * 
 * Displays a sidebar list of all configured endpoints with the following features:
 * - Visual indication of the active endpoint
 * - "Add Endpoint" button to create new endpoints
 * - Action buttons per endpoint: Duplicate, Delete
 * - Confirmation dialog for delete action
 * - Message when no endpoints exist
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import React, { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { useLanguage } from '../../i18n';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './EndpointList.module.css';

export const EndpointList: React.FC = () => {
  const { state, dispatch } = useConfig();
  const { t } = useLanguage();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    endpointId: string | null;
    endpointName: string;
  }>({
    open: false,
    endpointId: null,
    endpointName: '',
  });

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleAddEndpoint = () => {
    dispatch({ type: 'ADD_ENDPOINT' });
  };

  const handleSelectEndpoint = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_ENDPOINT', id });
  };

  const handleDuplicateEndpoint = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the endpoint
    dispatch({ type: 'DUPLICATE_ENDPOINT', id });
  };

  const handleDeleteClick = (id: string, name: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the endpoint
    setDeleteConfirmation({
      open: true,
      endpointId: id,
      endpointName: name,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.endpointId) {
      dispatch({ type: 'DELETE_ENDPOINT', id: deleteConfirmation.endpointId });
    }
    setDeleteConfirmation({ open: false, endpointId: null, endpointName: '' });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ open: false, endpointId: null, endpointName: '' });
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={styles.container}>
      {/* Header with Add button */}
      <div className={styles.header}>
        <h2 className={styles.title}>{t('endpoint.title')}</h2>
        <button
          className={styles.addButton}
          onClick={handleAddEndpoint}
          title={t('endpoint.add')}
        >
          {t('endpoint.add')}
        </button>
      </div>

      {/* Endpoint list */}
      <div className={styles.list}>
        {state.endpoints.length === 0 ? (
          // Empty state message (Requirement 2.5)
          <div className={styles.emptyMessage}>
            {t('endpoint.empty')}
          </div>
        ) : (
          // List of endpoints
          state.endpoints.map((endpoint) => {
            const isActive = endpoint.id === state.activeEndpointId;

            return (
              <div
                key={endpoint.id}
                className={`${styles.endpointItem} ${isActive ? styles.active : ''}`}
                onClick={() => handleSelectEndpoint(endpoint.id)}
                title={t('endpoint.select', { name: endpoint.name })}
              >
                {/* Endpoint name and description */}
                <div className={styles.endpointInfo}>
                  <div className={styles.endpointName}>{endpoint.name}</div>
                  {endpoint.description && (
                    <div className={styles.endpointDescription}>
                      {endpoint.description}
                    </div>
                  )}
                </div>

                {/* Action buttons (Requirement 2.3, 2.4) */}
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => handleDuplicateEndpoint(endpoint.id, e)}
                    title={t('endpoint.duplicate')}
                    aria-label={t('endpoint.duplicateLabel', { name: endpoint.name })}
                  >
                    {t('endpoint.duplicate')}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={(e) => handleDeleteClick(endpoint.id, endpoint.name, e)}
                    title={t('endpoint.delete')}
                    aria-label={t('endpoint.deleteLabel', { name: endpoint.name })}
                  >
                    {t('endpoint.delete')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation dialog (Requirement 2.4) */}
      <ConfirmDialog
        open={deleteConfirmation.open}
        title={t('endpoint.deleteTitle')}
        message={t('endpoint.deleteMessage', { name: deleteConfirmation.endpointName })}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};
