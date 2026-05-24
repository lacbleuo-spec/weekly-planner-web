// layout.tsx

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  verification: {
    google: 'JhI_X0rKnL0y87h2f0InId_MAudMVXJKfhp5wNFZt_o',
  },
  title: {
    default: 'Weekboard',
    template: '%s | Weekboard',
  },
  description:
    'A simple weekly planner for weekly goals, daily goals, someday goals, and cloud sync.',
  keywords: [
    'weekboard',
    'weekly planner',
    'goal planner',
    'daily goals',
    'weekly goals',
    'productivity',
    'planner',
  ],
  applicationName: 'Weekboard',
  authors: [{ name: 'Weekboard' }],
  creator: 'Weekboard',
  publisher: 'Weekboard',
  metadataBase: new URL('https://www.weekboard.net'),
  openGraph: {
    title: 'Weekboard',
    description:
      'Plan weekly goals, daily goals, and someday goals with cloud sync.',
    url: 'https://www.weekboard.net',
    siteName: 'Weekboard',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Weekboard',
    description:
      'Plan weekly goals, daily goals, and someday goals with cloud sync.',
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
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
