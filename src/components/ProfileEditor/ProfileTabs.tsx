/**
 * ProfileTabs Component
 * 
 * Displays toggle switches for the 4 test profile types and allows switching
 * between them to configure their stages and thresholds.
 * 
 * Features:
 * - 4 profile toggles: loadtest, stresstest, capacitytest, stabilitytest
 * - Visual indication of enabled/disabled state
 * - Ability to select active profile for editing stages/thresholds
 * - Dispatches TOGGLE_PROFILE action when toggled
 * 
 * Requirements: 4.1, 4.6
 */

import React from 'react';
import { useConfig } from '../../hooks/useConfig';
import { ProfileType } from '../../models/ProfileDraft';
import { PROFILE_TYPES } from '../../utils/constants';
import { TranslationKey, useLanguage } from '../../i18n';
import styles from './ProfileEditor.module.css';

interface ProfileTabsProps {
  endpointId: string;
  selectedProfile: ProfileType;
  onSelectProfile: (profileType: ProfileType) => void;
}

const PROFILE_LABEL_KEYS: Record<ProfileType, TranslationKey> = {
  loadtest: 'profiles.load',
  stresstest: 'profiles.stress',
  capacitytest: 'profiles.capacity',
  stabilitytest: 'profiles.stability',
};

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  endpointId,
  selectedProfile,
  onSelectProfile,
}) => {
  const { state, dispatch } = useConfig();
  const { t } = useLanguage();

  const endpoint = state.endpoints.find((ep) => ep.id === endpointId);

  if (!endpoint) {
    return null;
  }

  const handleToggleProfile = (profileType: ProfileType, enabled: boolean) => {
    // Prevent user from disabling the currently selected profile
    // Instead, we'll just dispatch the toggle and let the parent handle the selection change
    dispatch({
      type: 'TOGGLE_PROFILE',
      endpointId,
      profileType,
    });

    // If disabling the currently selected profile, switch to first enabled profile
    if (enabled && profileType === selectedProfile) {
      const nextEnabled = endpoint.profiles.find(
        (p) => p.type !== profileType && p.enabled
      );
      if (nextEnabled) {
        onSelectProfile(nextEnabled.type);
      } else {
        // If no other profile is enabled, stay on this one
        // (though the user will see it's disabled)
      }
    }
  };

  return (
    <div className={styles.profileTabs}>
      <h3 className={styles.sectionTitle}>{t('profiles.section')}</h3>
      <div className={styles.tabsContainer} role="tablist" aria-label={t('profiles.tabAria')}>
        {PROFILE_TYPES.map((profileType) => {
          const profile = endpoint.profiles.find((p) => p.type === profileType);
          if (!profile) return null;

          const isSelected = selectedProfile === profileType;
          const isEnabled = profile.enabled;

          return (
            <div
              key={profileType}
              className={`${styles.profileTab} ${isSelected ? styles.selected : ''} ${
                isEnabled ? styles.enabled : styles.disabled
              }`}
            >
              <div className={styles.tabHeader}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`profile-panel-${profileType}`}
                  id={`profile-tab-${profileType}`}
                  className={styles.tabButton}
                  onClick={() => onSelectProfile(profileType)}
                >
                  <span>{t(PROFILE_LABEL_KEYS[profileType])}</span>
                  <span className={styles.profileCounts}>
                    {t('profiles.counts', {
                      stages: profile.stages.length,
                      thresholds: profile.thresholds.length,
                    })}
                  </span>
                </button>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleProfile(profileType, isEnabled)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider} />
                  <span className={styles.toggleText}>
                    {isEnabled ? t('profiles.enabled') : t('profiles.disabled')}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
