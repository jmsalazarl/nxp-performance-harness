/**
 * PreviewPanel Component
 * 
 * Displays:
 * - Preview of the generated config.js file
 * - Download button for the config.js
 * - Suggested k6 run commands for enabled profiles
 * - Validation errors if the configuration is invalid
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React from 'react';
import { useConfig } from '../../hooks/useConfig';
import { getSuggestedCommands } from '../../services/commands.service';
import { serialize } from '../../services/serializer.service';
import { validateExportReady } from '../../services/validation.service';
import { downloadTextFile } from '../../utils/downloader';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './PreviewPanel.module.css';

export const PreviewPanel: React.FC = () => {
  const { state } = useConfig();
  const { language, t } = useLanguage();
  const validation = validateExportReady(state);
  const configText = state.endpoints.length > 0 ? serialize(state) : '';
  const commands = getSuggestedCommands(state);

  const handleDownload = () => {
    if (!validation.valid) {
      return;
    }

    downloadTextFile(configText, 'config.js');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{t('preview.title')}</h2>
      </div>

      <div className={styles.content}>
        {state.endpoints.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t('preview.empty1')}</p>
            <p>{t('preview.empty2')}</p>
          </div>
        ) : (
          <div className={styles.previewStack}>
            <section className={styles.actions} aria-label={t('preview.exportActions')}>
              <button
                className={styles.downloadButton}
                type="button"
                onClick={handleDownload}
                disabled={!validation.valid}
              >
                {t('preview.download')}
              </button>
              <span className={validation.valid ? styles.readyBadge : styles.blockedBadge}>
                {validation.valid ? t('preview.ready') : t('preview.fixErrors')}
              </span>
            </section>

            {!validation.valid ? (
              <section className={styles.errorPanel} aria-labelledby="validation-heading">
                <h3 id="validation-heading">{t('preview.validationErrors')}</h3>
                <ul>
                  {validation.errors.map((error) => (
                    <li key={`${error.endpointId}-${error.field}-${error.message}`}>
                      <strong>{error.field}</strong>:{' '}
                      {translateValidationMessage(error.message, language)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={styles.previewPanel} aria-labelledby="config-preview-heading">
              <h3 id="config-preview-heading">{t('preview.generated')}</h3>
              <pre className={styles.codeBlock}>{configText}</pre>
            </section>

            <section className={styles.commandsPanel} aria-labelledby="commands-heading">
              <h3 id="commands-heading">{t('preview.commands')}</h3>
              {commands.length === 0 ? (
                <p>{t('preview.noProfiles')}</p>
              ) : (
                <ul>
                  {commands.map((command) => (
                    <li key={command}>
                      <code>{command}</code>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
