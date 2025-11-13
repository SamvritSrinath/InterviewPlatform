import {MetadataRoute} from 'next';
import {createServiceClient} from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/problems`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/interview`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic routes - problems
  try {
    const serviceClient = createServiceClient();
    const {data: problems} = await serviceClient
      .from('problems')
      .select('id, updated_at')
      .order('updated_at', {ascending: false})
      .limit(1000); // Limit to prevent sitemap from being too large

    const problemRoutes: MetadataRoute.Sitemap =
      problems?.map((problem: any) => ({
        url: `${baseUrl}/problems/${problem.id}`,
        lastModified: problem.updated_at
          ? new Date(problem.updated_at)
          : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })) || [];

    return [...staticRoutes, ...problemRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static routes only if database query fails
    return staticRoutes;
  }
}
