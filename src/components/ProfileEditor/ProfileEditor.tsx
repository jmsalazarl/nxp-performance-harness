/**
 * ProfileEditor Component
 * 
 * Main component that integrates ProfileTabs, StagesEditor, and ThresholdsEditor
 * to provide a complete profile configuration interface.
 * 
 * Features:
 * - Displays tabs for 4 profile types (loadtest, stresstest, capacitytest, stabilitytest)
 * - Toggle enable/disable for each profile
 * - Shows StagesEditor for the selected profile
 * - Shows ThresholdsEditor for the selected profile
 * - Manages active profile selection state locally
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.6
 */

import React, { useState } from 'react';
import { ProfileType } from '../../models/ProfileDraft';
import { useConfig } from '../../hooks/useConfig';
import {
  getTemplateById,
  getTemplatesForProfile,
} from '../../services/profileTemplates.service';
import { ProfileTabs } from './ProfileTabs';
import { StagesEditor } from './StagesEditor';
import { ThresholdsEditor } from './ThresholdsEditor';
import { useLanguage } from '../../i18n';
import styles from './ProfileEditor.module.css';

interface ProfileEditorProps {
  endpointId: string;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ endpointId }) => {
  const { state, dispatch } = useConfig();
  const { t } = useLanguage();
  // Local state to track which profile tab is currently selected for editing
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>('loadtest');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
  const activeProfile = endpoint?.profiles.find((profile) => profile.type === selectedProfile);
  const availableTemplates = getTemplatesForProfile(selectedProfile);

  const handleSelectProfile = (profileType: ProfileType) => {
    setSelectedProfile(profileType);
    setSelectedTemplateId('');
  };

  const handleApplyTemplate = () => {
    const template = getTemplateById(selectedTemplateId);
    if (!template || !activeProfile) return;

    const hasExistingConfiguration =
      activeProfile.stages.length > 0 || activeProfile.thresholds.length > 0;

    if (
      hasExistingConfiguration &&
      !window.confirm(t('profiles.replaceConfirm'))
    ) {
      return;
    }

    dispatch({
      type: 'APPLY_PROFILE_TEMPLATE',
      endpointId,
      profileType: selectedProfile,
      stages: template.stages,
      thresholds: template.thresholds,
    });
  };

  return (
    <div className={styles.editor}>
      <h3 className={styles.title}>{t('profiles.title')}</h3>
      
      {/* Profile tabs with enable/disable toggles */}
      <ProfileTabs
        endpointId={endpointId}
        selectedProfile={selectedProfile}
        onSelectProfile={handleSelectProfile}
      />

      {/* Stages editor for the selected profile */}
      <div
        id={`profile-panel-${selectedProfile}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${selectedProfile}`}
        className={styles.profileContent}
      >
        <div className={styles.templateBar}>
          <label className={styles.templateLabel} htmlFor={`template-${endpointId}`}>
            {t('profiles.template')}
            <select
              id={`template-${endpointId}`}
              className={styles.select}
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              <option value="">{t('profiles.templatePlaceholder')}</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId}
          >
            {t('profiles.applyTemplate')}
          </button>
        </div>

        <StagesEditor endpointId={endpointId} profileType={selectedProfile} />
        
        {/* Thresholds editor for the selected profile */}
        <ThresholdsEditor endpointId={endpointId} profileType={selectedProfile} />
      </div>
    </div>
  );
};
