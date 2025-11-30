'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Database } from '@/lib/supabase/types';

type Session = Database['public']['Tables']['sessions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface InterviewWithInterviewer extends Session {
  interviewer?: User | null;
}

interface InterviewsListProps {
  interviews: InterviewWithInterviewer[];
}

// Helper to get base URL
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function InterviewsList({ interviews }: InterviewsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInterviews = useMemo(() => {
    if (!searchTerm) return interviews;

    const lowerSearch = searchTerm.toLowerCase();
    return interviews.filter(
      interview =>
        interview.id.toLowerCase().includes(lowerSearch) ||
        interview.honeypot_token.toLowerCase().includes(lowerSearch) ||
        interview.problem_id.toLowerCase().includes(lowerSearch) ||
        interview.client_ip?.toLowerCase().includes(lowerSearch) ||
        interview.interviewer?.email?.toLowerCase().includes(lowerSearch),
    );
  }, [interviews, searchTerm]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search by interview ID, token, problem ID, IP, or interviewer email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredInterviews.length} of {interviews.length} active
        interviews
      </div>

      {/* Interviews Grid */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? 'No interviews found matching your search.'
              : 'No active interviews at this time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInterviews.map(interview => (
            <div
              key={interview.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Interview Session
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">ID:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {interview.id.slice(0, 8)}...
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Token:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {interview.honeypot_token.slice(0, 8)}...
                    </code>
                  </div>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Problem ID:</span>{' '}
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {interview.problem_id}
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
                    <span className="font-medium text-gray-700">
                      Interviewer:
                    </span>{' '}
                    <span className="text-gray-600">
                      {interview.interviewer.email || 'N/A'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Created:</span>{' '}
                  <span className="text-gray-600">
                    {formatDate(interview.created_at)}
                  </span>
                </div>
                {interview.start_time && (
                  <div>
                    <span className="font-medium text-gray-700">Started:</span>{' '}
                    <span className="text-gray-600">
                      {formatDate(interview.start_time)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {interview.interviewer_ready && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Interviewer Ready
                  </span>
                )}
                {interview.interviewee_started && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    In Progress
                  </span>
                )}
                {interview.approved && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Approved
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="bg-blue-50 p-3 rounded border-2 border-blue-200">
                  <p className="text-xs font-bold text-gray-900 mb-2">
                    Configuration API Endpoint (Required):
                  </p>
                  <code className="text-xs text-gray-900 break-all block mb-2 bg-white p-2 rounded border border-gray-300">
                    {getBaseUrl()}/docs/v1/{interview.honeypot_token}/
                    {interview.problem_id}
                  </code>
                  <a
                    href={`${getBaseUrl()}/docs/v1/${interview.honeypot_token}/${interview.problem_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold transition-colors"
                  >
                    Open Configuration API →
                  </a>
                </div>
                <Link
                  href={`/public/interviews/${interview.honeypot_token}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View Full Documentation →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

