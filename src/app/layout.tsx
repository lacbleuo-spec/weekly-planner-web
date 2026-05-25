// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import './globals.css';

const description =
  'Weekboard is an AI-powered weekly planner that turns vague goals into realistic weekly plans. Organize goals into daily tasks, create recurring routines, and stay consistent with reminders, locks, and achievement tracking.';

export const metadata: Metadata = {
  verification: {
    google: '0R-lol_WzJlZTWV2Ka-mRKCg3aYSFhb4zzh-hF3Ljvo',
  },

  metadataBase: new URL('https://www.weekboard.net'),

  title: 'Weekboard',

  description,

  applicationName: 'Weekboard',

  authors: [{ name: 'Weekboard' }],

  creator: 'Weekboard',

  publisher: 'Weekboard',

  openGraph: {
    title: 'Weekboard',

    description,

    url: 'https://www.weekboard.net',

    siteName: 'Weekboard',

    type: 'website',

    images: [
      {
        url: '/en/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Weekboard',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',

    title: 'Weekboard',

    description,

    images: ['/en/opengraph-image'],
  },

  icons: {
    icon: '/favicon.ico',

    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',

  initialScale: 1,

  maximumScale: 1,

  themeColor: '#f2f2f7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
