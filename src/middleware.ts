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
  const pathname = request.nextUrl.pathname;

  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/opengraph-image' ||
    pathname === '/favicon.ico' ||
    pathname === '/apple-touch-icon.png'
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  const locale = getPreferredLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon.ico|apple-touch-icon.png|robots.txt|sitemap.xml|opengraph-image|.*\\..*).*)',
  ],
};
