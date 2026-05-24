import type { Locale } from './types';

export const locales: Locale[] = ['en', 'ko'];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};
