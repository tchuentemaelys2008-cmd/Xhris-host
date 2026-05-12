import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      {
        userAgent: 'WhatsApp',
        allow: '/',
      },
      {
        userAgent: '*',
        allow: ['/', '/marketplace', '/docs', '/community', '/contact', '/terms', '/privacy', '/auth/login', '/auth/register'],
        disallow: ['/dashboard/', '/api/', '/admin/'],
      },
    ],
    sitemap: 'https://xhrishost.site/sitemap.xml',
  };
}
