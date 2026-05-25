import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Weekboard',
  description:
    'Weekboard is an AI-powered weekly planner that turns vague goals into realistic weekly plans. Organize goals into daily tasks, create recurring routines, and stay consistent with reminders, locks, and achievement tracking.',
  openGraph: {
    title: 'Weekboard',
    description:
      'Weekboard is an AI-powered weekly planner that turns vague goals into realistic weekly plans. Organize goals into daily tasks, create recurring routines, and stay consistent with reminders, locks, and achievement tracking.',
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
    description:
      'Weekboard is an AI-powered weekly planner that turns vague goals into realistic weekly plans. Organize goals into daily tasks, create recurring routines, and stay consistent with reminders, locks, and achievement tracking.',
    images: ['/en/opengraph-image'],
  },
};

export default function HomePage() {
  redirect('/en');
}
