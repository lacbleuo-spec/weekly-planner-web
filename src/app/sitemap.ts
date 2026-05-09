import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.weeklygoalplanner.com', lastModified: new Date() },
  ];
}
