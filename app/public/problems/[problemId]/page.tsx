import { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { marked } from 'marked';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Problem = Database['public']['Tables']['problems']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];

interface PageProps {
  params: Promise<{
    problemId: string;
  }>;
}

async function getProblemData(problemId: string) {
  const serviceClient = createServiceClient();

  // Fetch problem
  const { data: problem, error: problemError } = await serviceClient
    .from('problems')
    .select('*')
    .eq('id', problemId)
    .single();

  if (problemError || !problem) {
    return null;
  }

  // Fetch all active sessions using this problem
  const { data: sessions } = await serviceClient
    .from('sessions')
    .select('id, honeypot_token, interviewer_id, client_ip, created_at')
    .eq('problem_id', problemId)
    .is('end_time', null) // Only active interviews
    .order('created_at', { ascending: false });

  return {
    problem: problem as Problem,
    sessions: (sessions || []) as Session[],
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { problemId } = await params;
  const data = await getProblemData(problemId);

  if (!data) {
    return {
      title: 'Problem Not Found',
    };
  }

  const { problem } = data;
  const title = `Problem Documentation: ${problem.title}`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const canonicalUrl = `${baseUrl}/public/problems/${problemId}`;

  return {
    title,
    description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem. Includes problem description, constraints, and related interview sessions with configuration endpoints.`,
    keywords: [
      problem.title,
      problem.difficulty || 'programming',
      problem.category || 'coding',
      'interview problem',
      'coding challenge',
      'algorithm',
    ],
    openGraph: {
      title,
      description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem.`,
      type: 'website',
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
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
}

export default async function ProblemDocumentationPage({
  params,
}: PageProps) {
  const { problemId } = await params;
  const data = await getProblemData(problemId);

  if (!data) {
    notFound();
  }

  const { problem, sessions } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  // JSON-LD Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Problem Documentation: ${problem.title}`,
    description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem.`,
    url: `/public/problems/${problemId}`,
    mainEntity: {
      '@type': 'Question',
      name: problem.title,
      text: problem.description,
      about: {
        '@type': 'Thing',
        name: problem.category || 'Programming',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link
          href="/public/interviews"
          className="inline-flex items-center text-gray-700 hover:text-gray-900 transition-colors mb-6"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to All Interviews
        </Link>

        {/* Problem Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {problem.title}
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                  problem.difficulty?.toLowerCase() === 'easy'
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : problem.difficulty?.toLowerCase() === 'medium'
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                    : problem.difficulty?.toLowerCase() === 'hard'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {problem.difficulty || 'Unknown'} Difficulty
              </span>
              {problem.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                  {problem.category}
                </span>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className="px-6 sm:px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Problem Description
            </h2>
            <div
              className="prose prose-sm sm:prose-base max-w-none"
              dangerouslySetInnerHTML={{
                __html: marked.parse(problem.description || '') as string,
              }}
            />
          </div>
        </div>

        {/* Active Interview Sessions */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Active Interview Sessions
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''} using this problem
              </p>
            </div>

            <div className="px-6 sm:px-8 py-6">
              <div className="space-y-4">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">
                            Session:
                          </span>{' '}
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {session.id.slice(0, 8)}...
                          </code>
                        </div>
                        {session.client_ip && (
                          <div className="mb-2">
                            <span className="font-medium text-gray-700">
                              Client IP:
                            </span>{' '}
                            <span className="text-gray-600">
                              {session.client_ip}
                            </span>
                          </div>
                        )}
                        {session.created_at && (
                          <div className="text-sm text-gray-600">
                            Created:{' '}
                            {new Date(session.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/public/interviews/${session.honeypot_token}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Documentation →
                        </Link>
                        <Link
                          href={`${baseUrl}/docs/v1/${session.honeypot_token}/${problemId}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Configuration API →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Problem Metadata */}
        <div className="bg-gray-50 border-l-4 border-gray-300 rounded-r-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Problem Information
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Problem ID</dt>
              <dd className="text-gray-600">
                <code className="bg-white px-2 py-1 rounded">
                  {problem.id}
                </code>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Difficulty</dt>
              <dd className="text-gray-600">{problem.difficulty || 'N/A'}</dd>
            </div>
            {problem.category && (
              <div>
                <dt className="font-medium text-gray-700">Category</dt>
                <dd className="text-gray-600">{problem.category}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-700">Active Sessions</dt>
              <dd className="text-gray-600">{sessions.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
    </div>
  );
}

