import { Check, Globe } from 'lucide-react';
import { useState } from 'react';

import { LOCALES, useDict, useLocale } from '../../i18n';

export function LanguageMenu() {
  const dict = useDict();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.id === locale);

  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-card bg-surface py-2 shadow-float">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setLocale(l.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
              >
                <span className="text-[14px] font-medium text-ink">{l.name}</span>
                {l.id === locale && <Check size={15} className="text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.topbar.language}
        className="flex items-center gap-1.5 rounded-control px-3 py-2 text-[14px] font-medium text-subink transition hover:bg-canvas"
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{current?.name}</span>
      </button>
    </div>
  );
}
