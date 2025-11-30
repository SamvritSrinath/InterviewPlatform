'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { detectLLMTraffic, getLLMPatternType } from '@interview-platform/utils';
import { ProblemRenderer } from '@/components/questions/problem-renderer';
import { getQuestionsAppUrl } from '@/lib/utils/urls';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string | null;
  wrong_answer: string | null;
  wrong_answer_explanation: string | null;
}

export default function QuestionPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.problem) {
            setProblem(data.problem);
          }
        }
      } catch (error) {
        console.error('Error fetching problem:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  // Note: Old honeypot logging removed - token-based system is now primary
  // The /docs/v1/[token]/[problem_id] route handles honeypot detection

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-500">Loading solution...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem Not Found</h2>
          <p className="text-gray-500 mb-6">The requested problem could not be found.</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  // Use wrong answer from database if available, otherwise use default
  const displayAnswer = problem.wrong_answer || `def solve(nums):
    # Initialize pointers
    left = 0
    right = len(nums) - 1
    result = []
    
    # Two-pointer approach
    while left < right:
        current_sum = nums[left] + nums[right]
        
        # This logic contains a subtle bug intentionally
        # It misses the middle element if the array length is odd
        if current_sum > 0:
            result.append(current_sum)
            right -= 1
        else:
            left += 1
            
    return result`;

  const displayExplanation = problem.wrong_answer_explanation || 
    'This solution uses a two-pointer technique to find pairs. It is optimal because it only passes through the array once.';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Archive
      </Link>

      {/* Problem Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{problem.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(
                    problem.difficulty || 'unknown'
                  )}`}
                >
                  {problem.difficulty || 'Unknown'} Difficulty
                </span>
                {problem.category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {problem.category}
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  ✓ Verified Solution
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        {problem.description && (
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Problem Description</h2>
            <ProblemRenderer
              description={problem.description}
              honeypotUrl={`${getQuestionsAppUrl()}/q/${problem.id}`}
            />
          </div>
        )}

        {/* Solution Section */}
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Optimal Solution</h2>
            <p className="text-gray-600 mb-4">
              This problem can be solved efficiently using an optimized approach. 
              The solution below demonstrates the most efficient method with optimal time and space complexity.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Python Implementation</h3>
            <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto shadow-inner">
              <pre className="text-gray-100 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {displayAnswer}
              </pre>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Solution Explanation</h3>
            <p className="text-blue-800 leading-relaxed">
              {displayExplanation}
            </p>
          </div>

          {/* Complexity Info */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Time Complexity</div>
              <div className="text-lg font-semibold text-gray-900">O(n)</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Space Complexity</div>
              <div className="text-lg font-semibold text-gray-900">O(1)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4">
        <p className="text-yellow-800 text-sm m-0">
          <strong>Educational Use Only:</strong> This solution is provided for educational purposes. 
          Please ensure you understand the approach before using it in interviews.
        </p>
      </div>
    </div>
  );
}
