import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadLocale, saveLocale, translate, translateError, type Locale, type MessageKey, type Vars } from '@agents';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  te: (error: unknown) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: MessageKey, vars?: Vars) => translate(locale, key, vars);
    return {
      locale,
      setLocale: (next) => {
        saveLocale(next);
        setLocaleState(next);
      },
      t,
      te: (error) => translateError(locale, error),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
