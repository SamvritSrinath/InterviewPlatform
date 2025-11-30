import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/public/', '/api/public/'],
        disallow: [
          '/api/',
          '/interview/',
          '/dashboard/',
          '/admin/',
          '/docs/v1/',
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/sitemap.xml`,
  };
}
