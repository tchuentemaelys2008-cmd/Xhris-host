import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://xhrishost.site';
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/marketplace`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/auth/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/auth/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/community`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];
}
