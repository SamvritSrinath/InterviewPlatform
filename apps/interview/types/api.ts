import {Problem, Session, CheatingAttempt, ScraperLog} from './database';

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ProblemsResponse {
  problems: Problem[];
}

export interface ProblemResponse {
  problem: Problem;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionResponse {
  session: Session;
}

export interface CheatingAttemptsResponse {
  attempts: CheatingAttempt[];
}

export interface ScraperLogsResponse {
  logs: ScraperLog[];
}

// API Request types
export interface CreateProblemRequest {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  default_code?: string;
  hidden_prompt?: string;
}

export interface UpdateProblemRequest {
  title?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  default_code?: string;
  hidden_prompt?: string;
}

export interface CreateSessionRequest {
  problemId: string;
  timeLimit?: number;
}

export interface ExecuteCodeRequest {
  code: string;
  problemId: string;
  testCases?: TestCase[];
}

export interface TestCase {
  input: unknown;
  expectedOutput: unknown;
}

export interface ExecuteCodeResponse {
  output?: string;
  results?: TestResult[];
  error?: string;
}

export interface TestResult {
  passed: boolean;
  input: unknown;
  expectedOutput: unknown;
  actualOutput?: unknown;
  error?: string;
}

export interface CheatingDetectionRequest {
  type: string;
  details?: unknown;
  problemId?: string;
  sessionId?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
}
