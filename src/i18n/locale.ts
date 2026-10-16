export type Locale = 'ko' | 'en';

export function isLocale(value: unknown): value is Locale {
  return value === 'ko' || value === 'en';
}
