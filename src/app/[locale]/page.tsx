import { notFound } from 'next/navigation';

import PlannerApp from '@/components/PlannerApp';
import { locales } from '@/i18n/settings';
import type { Locale } from '@/i18n/types';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return <PlannerApp locale={locale as Locale} />;
}
