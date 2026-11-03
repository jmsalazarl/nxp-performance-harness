import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { translations } from './translations';
import type { Language, TranslationKey } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const defaultLanguageContext: LanguageContextValue = {
  language: 'es',
  setLanguage: () => undefined,
  t: (key, params) => {
    const translation = translations.es[key] ?? key;
    return typeof translation === 'function' ? translation(params) : translation;
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps): JSX.Element {
  const [language, setLanguage] = useState<Language>('es');

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
      const translation = translations[language][key] ?? translations.es[key] ?? key;
      return typeof translation === 'function' ? translation(params) : translation;
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    return defaultLanguageContext;
  }

  return context;
}
