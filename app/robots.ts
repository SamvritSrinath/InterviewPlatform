import {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/public/', '/api/public/', '/docs/v1/'],
        disallow: ['/api/', '/interview/', '/dashboard/', '/admin/'],
      },
    ],
    sitemap: `${
      process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
    }/sitemap.xml`,
  };
}
