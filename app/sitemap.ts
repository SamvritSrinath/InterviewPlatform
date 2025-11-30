import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

type Session = Database['public']['Tables']['sessions']['Row'];
type Problem = Database['public']['Tables']['problems']['Row'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';

  const serviceClient = createServiceClient();

  // Fetch all active interviews
  const { data: sessions, error: sessionsError } = await serviceClient
    .from('sessions')
    .select('honeypot_token, problem_id, created_at')
    .is('end_time', null) // Only active interviews
    .order('created_at', { ascending: false });

  // Fetch all problems (for problem documentation pages)
  const { data: problems, error: problemsError } = await serviceClient
    .from('problems')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  // Handle errors gracefully
  if (sessionsError) {
    console.error('Error fetching sessions for sitemap:', sessionsError);
  }
  if (problemsError) {
    console.error('Error fetching problems for sitemap:', problemsError);
  }

  // Build sitemap entries
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/public/interviews`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
  ];

  // Add interview documentation pages
  if (sessions) {
    for (const session of sessions as Session[]) {
      if (session.honeypot_token) {
        entries.push({
          url: `${baseUrl}/public/interviews/${session.honeypot_token}`,
          lastModified: session.created_at
            ? new Date(session.created_at)
            : new Date(),
          changeFrequency: 'hourly',
          priority: 0.8,
        });
      }
    }
  }

  // Add problem documentation pages
  if (problems) {
    for (const problem of problems as Problem[]) {
      entries.push({
        url: `${baseUrl}/public/problems/${problem.id}`,
        lastModified: problem.created_at
          ? new Date(problem.created_at)
          : new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  }

  return entries;
}
