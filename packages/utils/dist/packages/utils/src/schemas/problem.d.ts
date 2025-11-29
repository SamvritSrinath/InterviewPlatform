import { z } from 'zod';
/**
 * Problem creation schema
 */
export declare const createProblemSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    category: z.ZodOptional<z.ZodString>;
    default_code: z.ZodOptional<z.ZodString>;
    hidden_prompt: z.ZodOptional<z.ZodString>;
    wrong_answer: z.ZodOptional<z.ZodString>;
    wrong_answer_explanation: z.ZodOptional<z.ZodString>;
    is_honeypot: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    description?: string;
    difficulty?: "medium" | "easy" | "hard";
    category?: string;
    default_code?: string;
    hidden_prompt?: string;
    wrong_answer?: string;
    wrong_answer_explanation?: string;
    is_honeypot?: boolean;
}, {
    title?: string;
    description?: string;
    difficulty?: "medium" | "easy" | "hard";
    category?: string;
    default_code?: string;
    hidden_prompt?: string;
    wrong_answer?: string;
    wrong_answer_explanation?: string;
    is_honeypot?: boolean;
}>;
/**
 * Problem update schema
 */
export declare const updateProblemSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodEnum<["easy", "medium", "hard"]>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    default_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    hidden_prompt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    wrong_answer: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    wrong_answer_explanation: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    is_honeypot: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    description?: string;
    difficulty?: "medium" | "easy" | "hard";
    category?: string;
    default_code?: string;
    hidden_prompt?: string;
    wrong_answer?: string;
    wrong_answer_explanation?: string;
    is_honeypot?: boolean;
}, {
    title?: string;
    description?: string;
    difficulty?: "medium" | "easy" | "hard";
    category?: string;
    default_code?: string;
    hidden_prompt?: string;
    wrong_answer?: string;
    wrong_answer_explanation?: string;
    is_honeypot?: boolean;
}>;
/**
 * Session creation schema
 */
export declare const createSessionSchema: z.ZodObject<{
    problemId: z.ZodString;
    timeLimit: z.ZodNumber;
    isPublic: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    problemId?: string;
    timeLimit?: number;
    isPublic?: boolean;
}, {
    problemId?: string;
    timeLimit?: number;
    isPublic?: boolean;
}>;
