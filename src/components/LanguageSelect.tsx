// LanguageSelect.tsx

'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/types';
import { localeLabels, locales } from '@/i18n/settings';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LanguageSelect({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `weekboard-locale=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;

    const segments = pathname.split('/');
    segments[1] = nextLocale;

    router.push(segments.join('/') || `/${nextLocale}`);
    router.refresh();
  }

  return (
    <label className='relative flex h-9 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-gray-500 transition active:scale-[0.98] active:bg-gray-100'>
      <span className='sr-only'>Language</span>

      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className='cursor-pointer bg-transparent pr-1 outline-none'
        aria-label='Language'
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
