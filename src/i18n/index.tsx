import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import ko from './ko';
import type { Dictionary } from './ko';

export type Locale = 'ko';

// 새 언어를 추가하려면 같은 모양의 딕셔너리를 만들고 여기에 등록한다.
const dictionaries: Record<Locale, Dictionary> = { ko };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ko');
  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, dict: dictionaries[locale] }),
    [locale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useDict(): Dictionary {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useDict must be used within I18nProvider');
  return ctx.dict;
}
