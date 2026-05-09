import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Weekly Goal-Based Planner',
    template: '%s | Weekly Goal-Based Planner',
  },

  description:
    'A simple weekly planner for weekly goals, daily goals, someday goals, and cloud sync.',

  keywords: [
    'weekly planner',
    'goal planner',
    'daily goals',
    'weekly goals',
    'productivity',
    'planner',
    'goal based planner',
  ],

  applicationName: 'Weekly Goal-Based Planner',

  authors: [
    {
      name: 'Weekly Goal-Based Planner',
    },
  ],

  creator: 'Weekly Goal-Based Planner',
  publisher: 'Weekly Goal-Based Planner',

  metadataBase: new URL('https://weekly-planner-web-rlsn.vercel.app/'),

  openGraph: {
    title: 'Weekly Goal-Based Planner',

    description:
      'Plan weekly goals, daily goals, and someday goals with cloud sync.',

    url: 'https://weekly-planner-web-rlsn.vercel.app/',

    siteName: 'Weekly Goal-Based Planner',

    type: 'website',
  },

  twitter: {
    card: 'summary',

    title: 'Weekly Goal-Based Planner',

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
