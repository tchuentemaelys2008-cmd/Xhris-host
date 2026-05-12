import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/marketplace', '/docs', '/community', '/auth/login', '/auth/register'],
        disallow: ['/dashboard/', '/api/', '/admin/'],
      },
    ],
    sitemap: 'https://xhris.host/sitemap.xml',
  };
}
