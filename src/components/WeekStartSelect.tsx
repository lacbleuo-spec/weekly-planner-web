'use client';

import { dictionaries } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';

export type WeekStartType = 'sunday' | 'monday';

const WEEK_START_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function WeekStartSelect({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: WeekStartType;
  onChange: (value: WeekStartType) => void;
}) {
  const dict = dictionaries[locale];

  function changeWeekStart(nextValue: WeekStartType) {
    document.cookie = `weekboard-week-start=${nextValue}; path=/; max-age=${WEEK_START_COOKIE_MAX_AGE}; SameSite=Lax`;
    onChange(nextValue);
  }

  return (
    <label className='relative flex h-9 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-gray-500 transition active:scale-[0.98] active:bg-gray-100'>
      <span className='sr-only'>Week Start</span>

      <select
        value={value}
        onChange={(event) =>
          changeWeekStart(event.target.value as WeekStartType)
        }
        className='cursor-pointer bg-transparent pr-1 outline-none'
        aria-label='Week Start'
      >
        <option value='sunday'>{dict.weekStartOptions.sunday}</option>
        <option value='monday'>{dict.weekStartOptions.monday}</option>
      </select>
    </label>
  );
}
