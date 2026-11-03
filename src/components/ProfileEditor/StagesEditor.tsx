/**
 * StagesEditor Component
 * 
 * Displays and edits the list of stages for a specific test profile.
 * 
 * Features:
 * - List of stages with duration and target fields
 * - Add/remove stage buttons
 * - Reorder stages with move up/down buttons
 * - Inline validation for duration (K6 format) and target (0-10000)
 * - Respects MAX_STAGES limit (20 per profile)
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

import React, { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { ProfileType } from '../../models/ProfileDraft';
import { ValidationMessage } from '../common/ValidationMessage';
import { MAX_STAGES, K6_DURATION_REGEX, STAGE_TARGET_RANGE } from '../../utils/constants';
import { translateValidationMessage, useLanguage } from '../../i18n';
import styles from './ProfileEditor.module.css';

interface StagesEditorProps {
  endpointId: string;
  profileType: ProfileType;
}

export const StagesEditor: React.FC<StagesEditorProps> = ({ endpointId, profileType }) => {
  const { state, dispatch } = useConfig();
  const { language, t } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
  const profile = endpoint?.profiles.find((p) => p.type === profileType);

  if (!profile) {
    return null;
  }

  const validateDuration = (duration: string): string | null => {
    if (!duration.trim()) {
      return 'Duration cannot be empty';
    }
    if (!K6_DURATION_REGEX.test(duration.trim())) {
      return 'Invalid K6 duration format (e.g., "30s", "2m", "1h")';
    }
    return null;
  };

  const validateTarget = (target: number): string | null => {
    if (target < STAGE_TARGET_RANGE.min || target > STAGE_TARGET_RANGE.max) {
      return `Target must be between ${STAGE_TARGET_RANGE.min} and ${STAGE_TARGET_RANGE.max}`;
    }
    return null;
  };

  const handleAddStage = () => {
    if (profile.stages.length >= MAX_STAGES) {
      alert(t('stages.maxReached', { max: MAX_STAGES }));
      return;
    }

    dispatch({
      type: 'ADD_STAGE',
      endpointId,
      profileType,
    });
  };

  const handleRemoveStage = (stageIndex: number) => {
    dispatch({
      type: 'DELETE_STAGE',
      endpointId,
      profileType,
      stageIndex,
    });

    // Clear errors for this stage
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${stageIndex}-duration`];
      delete newErrors[`${stageIndex}-target`];
      return newErrors;
    });
  };

  const handleMoveUp = (stageIndex: number) => {
    if (stageIndex === 0) return;

    dispatch({
      type: 'REORDER_STAGES',
      endpointId,
      profileType,
      fromIndex: stageIndex,
      toIndex: stageIndex - 1,
    });
  };

  const handleMoveDown = (stageIndex: number) => {
    if (stageIndex === profile.stages.length - 1) return;

    dispatch({
      type: 'REORDER_STAGES',
      endpointId,
      profileType,
      fromIndex: stageIndex,
      toIndex: stageIndex + 1,
    });
  };

  const handleUpdateDuration = (stageIndex: number, duration: string) => {
    const error = validateDuration(duration);
    const errorKey = `${stageIndex}-duration`;

    if (error) {
      setErrors((prev) => ({ ...prev, [errorKey]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    dispatch({
      type: 'UPDATE_STAGE',
      endpointId,
      profileType,
      stageIndex,
      patch: { duration },
    });
  };

  const handleUpdateTarget = (stageIndex: number, targetStr: string) => {
    const target = parseInt(targetStr, 10);
    const error = isNaN(target) ? 'Target must be a number' : validateTarget(target);
    const errorKey = `${stageIndex}-target`;

    if (error) {
      setErrors((prev) => ({ ...prev, [errorKey]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    if (!isNaN(target)) {
      dispatch({
        type: 'UPDATE_STAGE',
        endpointId,
        profileType,
        stageIndex,
        patch: { target },
      });
    }
  };

  return (
    <div className={styles.stagesEditor}>
      <div className={styles.sectionHeader}>
        <h4>{t('stages.title')}</h4>
        <button
          type="button"
          onClick={handleAddStage}
          className={styles.addButton}
          disabled={profile.stages.length >= MAX_STAGES}
          title={
            profile.stages.length >= MAX_STAGES
              ? t('stages.maxReached', { max: MAX_STAGES })
              : t('stages.add')
          }
        >
          {t('stages.add')}
        </button>
      </div>

      {profile.stages.length === 0 ? (
        <p className={styles.emptyMessage}>{t('stages.empty')}</p>
      ) : (
        <div className={styles.stagesList}>
          {profile.stages.map((stage, index) => (
            <div key={index} className={styles.stageItem}>
              <div className={styles.stageControls}>
                <span className={styles.stageNumber}>#{index + 1}</span>
                <div className={styles.moveButtons}>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={styles.moveButton}
                    title={t('stages.moveUp')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === profile.stages.length - 1}
                    className={styles.moveButton}
                    title={t('stages.moveDown')}
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className={styles.stageFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor={`stage-${index}-duration`}>
                    {t('stages.duration')}
                    <input
                      id={`stage-${index}-duration`}
                      type="text"
                      value={stage.duration}
                      onChange={(e) => handleUpdateDuration(index, e.target.value)}
                      className={styles.input}
                      placeholder="e.g., 30s, 2m, 1h"
                    />
                  </label>
                  {errors[`${index}-duration`] && (
                    <ValidationMessage
                      message={translateValidationMessage(errors[`${index}-duration`]!, language)}
                    />
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor={`stage-${index}-target`}>
                    {t('stages.target')}
                    <input
                      id={`stage-${index}-target`}
                      type="number"
                      value={stage.target}
                      onChange={(e) => handleUpdateTarget(index, e.target.value)}
                      className={styles.input}
                      min={STAGE_TARGET_RANGE.min}
                      max={STAGE_TARGET_RANGE.max}
                    />
                  </label>
                  {errors[`${index}-target`] && (
                    <ValidationMessage
                      message={translateValidationMessage(errors[`${index}-target`]!, language)}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStage(index)}
                  className={styles.removeButton}
                  title={t('stages.remove')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {profile.stages.length > 0 && profile.stages.length < MAX_STAGES && (
        <p className={styles.hint}>
          {t('stages.remaining', { count: MAX_STAGES - profile.stages.length })}
        </p>
      )}
    </div>
  );
};
