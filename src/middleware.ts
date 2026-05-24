import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@/i18n/settings';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  const locale = request.headers.get('accept-language')?.startsWith('ko')
    ? 'ko'
    : defaultLocale;

  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|apple-touch-icon.png).*)'],
};
