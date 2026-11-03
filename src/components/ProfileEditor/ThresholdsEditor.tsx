/**
 * ThresholdsEditor Component
 * 
 * Displays and edits threshold configurations for a specific test profile.
 * 
 * Features:
 * - Metric selector with K6 standard metrics as suggestions
 * - Support for custom metrics (1-128 chars, letters/digits/underscores)
 * - List of expressions per metric (1-10 expressions per metric)
 * - Add/remove metrics and expressions
 * - Inline validation for metric names and expressions
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6
 */

import React, { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { ProfileType } from '../../models/ProfileDraft';
import { ValidationMessage } from '../common/ValidationMessage';
import { K6_METRICS, MAX_EXPRESSIONS, METRIC_NAME_REGEX } from '../../utils/constants';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './ProfileEditor.module.css';

interface ThresholdsEditorProps {
  endpointId: string;
  profileType: ProfileType;
}

export const ThresholdsEditor: React.FC<ThresholdsEditorProps> = ({
  endpointId,
  profileType,
}) => {
  const { state, dispatch } = useConfig();
  const { language, t } = useLanguage();
  const [newMetric, setNewMetric] = useState('');
  const [metricError, setMetricError] = useState<string | null>(null);
  const [expressionErrors, setExpressionErrors] = useState<Record<string, string>>({});

  const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
  const profile = endpoint?.profiles.find((p) => p.type === profileType);

  if (!profile) {
    return null;
  }

  const validateMetricName = (metric: string): string | null => {
    const trimmed = metric.trim();

    if (!trimmed) {
      return 'Metric name cannot be empty';
    }

    if (!METRIC_NAME_REGEX.test(trimmed)) {
      return 'Metric name must contain only letters, digits, and underscores (1-128 chars)';
    }

    // Check if metric already exists
    if (profile.thresholds.find((t) => t.metric === trimmed)) {
      return 'Metric already exists';
    }

    return null;
  };

  const validateExpression = (expression: string): string | null => {
    const trimmed = expression.trim();

    if (!trimmed) {
      return 'Expression cannot be empty';
    }

    return null;
  };

  const handleAddMetric = () => {
    const error = validateMetricName(newMetric);

    if (error) {
      setMetricError(error);
      return;
    }

    dispatch({
      type: 'ADD_THRESHOLD',
      endpointId,
      profileType,
      metric: newMetric.trim(),
    });

    setNewMetric('');
    setMetricError(null);
  };

  const handleRemoveMetric = (metric: string) => {
    dispatch({
      type: 'DELETE_THRESHOLD',
      endpointId,
      profileType,
      metric,
    });

    // Clear expression errors for this metric
    setExpressionErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors)
        .filter((key) => key.startsWith(`${metric}-`))
        .forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const handleAddExpression = (metric: string) => {
    const threshold = profile.thresholds.find((t) => t.metric === metric);
    if (!threshold) return;

    if (threshold.expressions.length >= MAX_EXPRESSIONS) {
      alert(t('thresholds.maxExpressions', { max: MAX_EXPRESSIONS }));
      return;
    }

    // Add empty expression
    const newExpressions = [...threshold.expressions, ''];

    dispatch({
      type: 'UPDATE_THRESHOLD_EXPRESSIONS',
      endpointId,
      profileType,
      metric,
      expressions: newExpressions,
    });
  };

  const handleUpdateExpression = (metric: string, index: number, value: string) => {
    const threshold = profile.thresholds.find((t) => t.metric === metric);
    if (!threshold) return;

    const newExpressions = [...threshold.expressions];
    newExpressions[index] = value;

    const error = validateExpression(value);
    const errorKey = `${metric}-${index}`;

    if (error) {
      setExpressionErrors((prev) => ({ ...prev, [errorKey]: error }));
    } else {
      setExpressionErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    dispatch({
      type: 'UPDATE_THRESHOLD_EXPRESSIONS',
      endpointId,
      profileType,
      metric,
      expressions: newExpressions,
    });
  };

  const handleRemoveExpression = (metric: string, index: number) => {
    const threshold = profile.thresholds.find((t) => t.metric === metric);
    if (!threshold) return;

    const newExpressions = threshold.expressions.filter((_, i) => i !== index);

    dispatch({
      type: 'UPDATE_THRESHOLD_EXPRESSIONS',
      endpointId,
      profileType,
      metric,
      expressions: newExpressions,
    });

    // Clear error for this expression
    setExpressionErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${metric}-${index}`];
      return newErrors;
    });
  };

  const handleSelectSuggestedMetric = (metric: string) => {
    setNewMetric(metric);
    setMetricError(null);
  };

  // Get available suggested metrics (not already added)
  const availableMetrics = K6_METRICS.filter(
    (metric) => !profile.thresholds.find((t) => t.metric === metric)
  );

  return (
    <div className={styles.thresholdsEditor}>
      <h4>{t('thresholds.title')}</h4>

      {/* Add Metric Section */}
      <div className={styles.addMetricSection}>
        <div className={styles.metricInputGroup}>
          <input
            type="text"
            value={newMetric}
            onChange={(e) => {
              setNewMetric(e.target.value);
              if (metricError) setMetricError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMetric();
              }
            }}
            placeholder={t('thresholds.metricPlaceholder')}
            className={styles.input}
          />
          <button
            type="button"
            onClick={handleAddMetric}
            className={styles.addButton}
            disabled={!newMetric.trim()}
          >
            {t('thresholds.addMetric')}
          </button>
        </div>
        {metricError && (
          <ValidationMessage message={translateValidationMessage(metricError, language)} />
        )}

        {/* Suggested Metrics */}
        {availableMetrics.length > 0 && (
          <div className={styles.suggestedMetrics}>
            <p className={styles.suggestionsLabel}>{t('thresholds.suggested')}</p>
            <div className={styles.metricTags}>
              {availableMetrics.map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => handleSelectSuggestedMetric(metric)}
                  className={styles.metricTag}
                  title={t('thresholds.selectMetric', { metric })}
                >
                  {metric}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thresholds List */}
      {profile.thresholds.length === 0 ? (
        <p className={styles.emptyMessage}>
          {t('thresholds.empty')}
        </p>
      ) : (
        <div className={styles.thresholdsList}>
          {profile.thresholds.map((threshold) => (
            <div key={threshold.metric} className={styles.thresholdItem}>
              <div className={styles.thresholdHeader}>
                <h5 className={styles.metricName}>{threshold.metric}</h5>
                <button
                  type="button"
                  onClick={() => handleRemoveMetric(threshold.metric)}
                  className={styles.removeButton}
                  title={t('thresholds.removeMetric')}
                >
                  ✕
                </button>
              </div>

              <div className={styles.expressionsList}>
                {threshold.expressions.length === 0 ? (
                  <p className={styles.noExpressions}>
                    {t('thresholds.noExpressions')}
                  </p>
                ) : (
                  threshold.expressions.map((expression, index) => (
                    <div key={index} className={styles.expressionItem}>
                      <input
                        type="text"
                        value={expression}
                        onChange={(e) =>
                          handleUpdateExpression(threshold.metric, index, e.target.value)
                        }
                        placeholder='e.g., p(95) < 2000, avg < 500'
                        className={styles.input}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExpression(threshold.metric, index)}
                        className={styles.removeButton}
                        title={t('thresholds.removeExpression')}
                      >
                        ✕
                      </button>
                      {expressionErrors[`${threshold.metric}-${index}`] && (
                        <ValidationMessage
                          message={translateValidationMessage(
                            expressionErrors[`${threshold.metric}-${index}`]!,
                            language
                          )}
                        />
                      )}
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() => handleAddExpression(threshold.metric)}
                  className={styles.addExpressionButton}
                  disabled={threshold.expressions.length >= MAX_EXPRESSIONS}
                  title={
                    threshold.expressions.length >= MAX_EXPRESSIONS
                      ? t('thresholds.maxExpressions', { max: MAX_EXPRESSIONS })
                      : t('thresholds.addExpression')
                  }
                >
                  {t('thresholds.addExpression')}
                </button>

                {threshold.expressions.length > 0 &&
                  threshold.expressions.length < MAX_EXPRESSIONS && (
                    <p className={styles.hint}>
                      {t('thresholds.remainingExpressions', {
                        count: MAX_EXPRESSIONS - threshold.expressions.length,
                      })}
                    </p>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
