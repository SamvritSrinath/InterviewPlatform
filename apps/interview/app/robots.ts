import {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/interview/',
          '/_next/',
          '/auth/',
        ],
      },
      // Note: Problem repository is now on the questions app, not the interview app
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
