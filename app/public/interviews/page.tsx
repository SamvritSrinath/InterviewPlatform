import { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { InterviewsList } from '@/components/public/interviews-list';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export const metadata: Metadata = {
  title: 'Active Interview Sessions - Documentation',
  description:
    'Browse active interview sessions and access problem documentation. Find interview details, problem specifications, and configuration endpoints. Each session includes API endpoints for fetching test parameters and validation tokens.',
  keywords: [
    'interview sessions',
    'coding interview',
    'problem documentation',
    'test configuration',
    'API endpoints',
    'interview practice',
  ],
  openGraph: {
    title: 'Active Interview Sessions - Documentation',
    description:
      'Browse active interview sessions and access problem documentation with configuration endpoints.',
    type: 'website',
    url: `${baseUrl}/public/interviews`,
  },
  alternates: {
    canonical: `${baseUrl}/public/interviews`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

type Session = Database['public']['Tables']['sessions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface InterviewWithInterviewer extends Session {
  interviewer?: User | null;
}

async function getActiveInterviews(): Promise<InterviewWithInterviewer[]> {
  const serviceClient = createServiceClient();

  const { data: sessions, error } = await serviceClient
    .from('sessions')
    .select(
      `
      *,
      interviewer:users!sessions_interviewer_id_fkey(*)
    `,
    )
    .is('end_time', null) // Only active interviews
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active interviews:', error);
    return [];
  }

  return (sessions || []) as InterviewWithInterviewer[];
}

export default async function PublicInterviewsPage() {
  const interviews = await getActiveInterviews();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Active Interview Sessions
          </h1>
          <p className="text-lg text-gray-600">
            Browse active interview sessions and access problem documentation.
            Each session includes configuration endpoints and problem
            specifications.
          </p>
        </div>

        {/* Interviews List */}
        <InterviewsList interviews={interviews} />
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Active Interview Sessions',
            description:
              'Browse active interview sessions and access problem documentation',
            url: '/public/interviews',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: interviews.length,
              itemListElement: interviews.map((interview, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'WebPage',
                  name: `Interview Session ${interview.id}`,
                  url: `/public/interviews/${interview.honeypot_token}`,
                },
              })),
            },
          }),
        }}
      />
    </div>
  );
}

