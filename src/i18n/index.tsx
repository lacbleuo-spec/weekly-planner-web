import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import en from './en';
import { interpolate } from './interpolate';
import ko from './ko';
import type { Dictionary } from './ko';
import { isLocale, type Locale } from './locale';

export type { Locale };

// 언어 이름은 번역하지 않고, 각 언어로 적는다(어떤 언어로 보고 있어도 찾을 수 있게).
// 목록 순서는 영어가 먼저, 한국어가 그다음이다.
export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ko', name: '한국어' },
];

// 새 언어를 추가하려면 같은 모양의 딕셔너리를 만들고 여기와 LOCALES에 등록한다.
const dictionaries: Record<Locale, Dictionary> = { ko, en };

const STORAGE_KEY = 'weekboard/locale';

// 이전에 고른 언어가 있으면 그것을, 없으면 기본 언어(영어)로 시작한다. 브라우저 언어는 따르지 않는다.
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // 저장소를 쓸 수 없는 환경이면 기본 언어를 쓴다.
  }
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장하지 못해도 이번 접속에서는 바뀐 언어로 보인다.
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, dict: dictionaries[locale] }),
    [locale, setLocale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = value.dict.app.title;
  }, [locale, value.dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useDict(): Dictionary {
  return useI18n().dict;
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

// 문구 안의 {lifeLine} 같은 위젯 이름 자리표시자를 현재 언어의 위젯 이름으로 채운다.
export function withWidgetNames(dict: Dictionary, text: string): string {
  const names: Record<string, string> = {};
  for (const [type, widget] of Object.entries(dict.widgets)) {
    names[type] = widget.title;
  }
  return interpolate(text, names);
}
