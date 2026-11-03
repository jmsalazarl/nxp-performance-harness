import { useLanguage } from '../i18n';
import type { Language } from '../i18n';

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="language-switcher">
      <span>{t('language.label')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        <option value="es">{t('language.es')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </label>
  );
}
