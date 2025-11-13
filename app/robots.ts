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
      // Allow LLM crawlers to access problem repository
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Google-Extended',
          'PerplexityBot',
          'Applebot-Extended',
        ],
        allow: ['/', '/problems', '/problems/*'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/interview/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
