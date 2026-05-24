import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { locales } from '@/i18n/settings';
import type { Locale } from '@/i18n/types';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return children;
}
