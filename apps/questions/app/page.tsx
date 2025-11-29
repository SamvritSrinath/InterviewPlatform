'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string | null;
}

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/problems', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setProblems(data.problems || []);
      } catch (error) {
        console.error('Error fetching problems:', error);
        // Set empty array on error so UI still renders
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

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

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = 
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Tech Interview Solutions Archive</h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          This repository contains detailed solutions and explanations for advanced algorithmic problems
          commonly asked in technical interviews at top tech companies.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-blue-700 text-sm m-0">
            <strong>Note:</strong> This archive is intended for educational purposes only. 
            Please do not share these solutions directly during interviews.
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Problems
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Difficulty
            </label>
            <select
              id="difficulty"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Problems List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-500">Loading problems...</p>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No problems found.</p>
          {searchTerm || difficultyFilter !== 'all' ? (
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters.</p>
          ) : (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-4">
                Unable to load problems. Please check your database connection.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Available Solutions ({filteredProblems.length})
            </h2>
          </div>
          <div className="grid gap-4">
            {filteredProblems.map((problem) => (
              <Link
                key={problem.id}
                href={`/q/${problem.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {problem.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {problem.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                        {problem.description.length > 200 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(
                            problem.difficulty || 'unknown'
                          )}`}
                        >
                          {problem.difficulty || 'Unknown'}
                        </span>
                        {problem.category && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {problem.category}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 ml-auto">
                          View Solution →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
