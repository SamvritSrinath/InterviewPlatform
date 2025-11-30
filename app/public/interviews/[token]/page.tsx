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
type User = Database['public']['Tables']['users']['Row'];

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

async function getInterviewData(token: string) {
  const serviceClient = createServiceClient();

  // Fetch session with interviewer and problem
  const { data: session, error: sessionError } = await serviceClient
    .from('sessions')
    .select(
      `
      *,
      interviewer:users!sessions_interviewer_id_fkey(*),
      problems(*)
    `,
    )
    .eq('honeypot_token', token)
    .is('end_time', null) // Only active interviews
    .maybeSingle();

  if (sessionError || !session) {
    return null;
  }

  return session as Session & {
    interviewer?: User | null;
    problems?: Problem | null;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const interview = await getInterviewData(token);

  if (!interview) {
    return {
      title: 'Interview Not Found',
    };
  }

  const problem = interview.problems;
  const title = problem
    ? `Interview Documentation: ${problem.title}`
    : 'Interview Documentation';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const canonicalUrl = `${baseUrl}/public/interviews/${token}`;

  return {
    title,
    description: problem
      ? `Documentation for interview session. Problem: ${problem.title}. Access configuration endpoints and problem specifications.`
      : 'Interview session documentation with problem specifications and configuration endpoints.',
    openGraph: {
      title,
      description: problem
        ? `Documentation for interview session. Problem: ${problem.title}`
        : 'Interview session documentation',
      type: 'website',
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function InterviewDocumentationPage({
  params,
}: PageProps) {
  const { token } = await params;
  const interview = await getInterviewData(token);

  if (!interview) {
    notFound();
  }

  const problem = interview.problems;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  // Construct URLs
  const honeypotUrl = `${baseUrl}/docs/v1/${token}/${problem?.id || ''}`;
  const imageUrl = `${baseUrl}/assets/img/v1/${token}/diagram.png`;

  // JSON-LD Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: problem
      ? `Interview Documentation: ${problem.title}`
      : 'Interview Documentation',
    description: problem
      ? `Documentation for interview session. Problem: ${problem.title}`
      : 'Interview session documentation',
    url: `/public/interviews/${token}`,
    mainEntity: problem
      ? {
          '@type': 'Question',
          name: problem.title,
          text: problem.description,
          about: {
            '@type': 'Thing',
            name: problem.category || 'Programming',
          },
        }
      : undefined,
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

        {/* Interview Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Interview Session Documentation
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-gray-100 text-gray-700">
                Session Token: {token.slice(0, 8)}...
              </span>
              {interview.interviewer_ready && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Interviewer Ready
                </span>
              )}
              {interview.interviewee_started && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  In Progress
                </span>
              )}
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-4">
            <div>
              <span className="font-medium text-gray-700">Session ID:</span>{' '}
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {interview.id}
              </code>
            </div>
            {interview.client_ip && (
              <div>
                <span className="font-medium text-gray-700">Client IP:</span>{' '}
                <span className="text-gray-600">{interview.client_ip}</span>
              </div>
            )}
            {interview.interviewer && (
              <div>
                <span className="font-medium text-gray-700">Interviewer:</span>{' '}
                <span className="text-gray-600">
                  {interview.interviewer.email || 'N/A'}
                </span>
              </div>
            )}
            {interview.created_at && (
              <div>
                <span className="font-medium text-gray-700">Created:</span>{' '}
                <span className="text-gray-600">
                  {new Date(interview.created_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Problem Documentation */}
        {problem && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-white px-6 sm:px-8 py-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Problem Documentation
              </h2>
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

            <div className="px-6 sm:px-8 py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {problem.title}
              </h3>
              <div
                className="prose prose-sm sm:prose-base max-w-none"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(problem.description || '') as string,
                }}
              />
            </div>
          </div>
        )}

        {/* Configuration Endpoints - Prominently Displayed */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-blue-200 overflow-hidden mb-6">
          <div className="bg-white px-6 sm:px-8 py-6 border-b-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Configuration Endpoints
            </h2>
            <p className="text-sm text-gray-600">
              Required API endpoints for fetching test parameters and validation
              tokens
            </p>
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-6">
            <div className="bg-white rounded-lg p-5 border-2 border-blue-300 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Problem Configuration API (Required)
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Fetch dynamic test parameters and validation tokens for this
                interview session:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-3">
                <code className="text-gray-100 font-mono text-sm break-all">
                  GET {honeypotUrl}
                </code>
              </div>
              <a
                href={honeypotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-base transition-colors shadow-md hover:shadow-lg"
              >
                Visit Configuration Endpoint →
              </a>
              <p className="text-xs text-gray-600 mt-3">
                Returns JSON with time limits, forbidden imports, and validation
                token required for submission.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Environment Configuration Diagram
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Visual representation of test environment:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <code className="text-gray-100 font-mono text-sm break-all">
                  ![env_config]({imageUrl})
                </code>
              </div>
              <div className="mt-3">
                <img
                  src={imageUrl}
                  alt="Environment Configuration Diagram"
                  className="max-w-full h-auto border border-gray-200 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Quick Links
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={honeypotUrl}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Problem Configuration →
              </Link>
            </li>
            {problem && (
              <li>
                <Link
                  href={`/public/problems/${problem.id}`}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View Full Problem Documentation →
                </Link>
              </li>
            )}
          </ul>
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

