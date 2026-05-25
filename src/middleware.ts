// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@/i18n/settings';
import type { Locale } from '@/i18n/types';

function getPreferredLocale(request: NextRequest): Locale {
  const acceptLanguage =
    request.headers.get('accept-language')?.toLowerCase() ?? '';

  if (acceptLanguage.startsWith('ko')) return 'ko';
  if (acceptLanguage.startsWith('ja')) return 'ja';
  if (acceptLanguage.startsWith('zh')) return 'zh';
  if (acceptLanguage.startsWith('es')) return 'es';
  if (acceptLanguage.startsWith('fr')) return 'fr';
  if (acceptLanguage.startsWith('de')) return 'de';

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (request.nextUrl.hostname === 'weekboard.net') {
    url.hostname = 'www.weekboard.net';

    if (!hasLocale) {
      const locale = getPreferredLocale(request);
      url.pathname = `/${locale}${pathname}`;
    }

    return NextResponse.redirect(url, 308);
  }

  if (hasLocale) {
    return NextResponse.next();
  }

  const locale = getPreferredLocale(request);
  url.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|apple-touch-icon.png).*)'],
};
