import { MetadataRoute } from 'next';

const locales = ['en', 'ko', 'de', 'es', 'fr', 'ja', 'zh'];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `https://www.weekboard.net/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: locale === 'en' ? 1 : 0.9,
  }));
}
