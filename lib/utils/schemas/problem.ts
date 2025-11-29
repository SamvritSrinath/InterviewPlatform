import { z } from 'zod';

/**
 * Problem creation schema
 */
export const createProblemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string().optional(),
  default_code: z.string().optional(),
  hidden_prompt: z.string().optional(),
  wrong_answer: z.string().optional(),
  wrong_answer_explanation: z.string().optional(),
  is_honeypot: z.boolean().optional().default(false),
});

/**
 * Problem update schema
 */
export const updateProblemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().optional().nullable(),
  default_code: z.string().optional().nullable(),
  hidden_prompt: z.string().optional().nullable(),
  wrong_answer: z.string().optional().nullable(),
  wrong_answer_explanation: z.string().optional().nullable(),
  is_honeypot: z.boolean().optional(),
});

/**
 * Session creation schema
 */
export const createSessionSchema = z.object({
  problemId: z.string().uuid(),
  timeLimit: z.number().min(180), // Minimum 3 minutes
  isPublic: z.boolean().optional(),
});

