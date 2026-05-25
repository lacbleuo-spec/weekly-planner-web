import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  verification: {
    google: '0R-lol_WzJlZTWV2Ka-mRKCg3aYSFhb4zzh-hF3Ljvo',
  },

  title: 'Weekboard',

  applicationName: 'Weekboard',
  authors: [{ name: 'Weekboard' }],
  creator: 'Weekboard',
  publisher: 'Weekboard',

  metadataBase: new URL('https://www.weekboard.net'),

  openGraph: {
    images: ['/opengraph-image'],
  },

  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image'],
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
