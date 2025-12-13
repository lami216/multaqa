import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'ar' | 'fr';

const STORAGE_KEY = 'multaqa-language';

const applyLanguageSettings = (language: Language) => {
  if (typeof document === 'undefined') return;

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const html = document.documentElement;

  html.dir = dir;
  html.lang = language;
  document.body.classList.toggle('font-[Tajawal]', language === 'ar');
  document.body.classList.toggle('rtl-mode', language === 'ar');
  localStorage.setItem(STORAGE_KEY, language);
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const initial = stored === 'fr' ? 'fr' : 'ar';

    applyLanguageSettings(initial);
    return initial;
  });

  useEffect(() => {
    applyLanguageSettings(language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
