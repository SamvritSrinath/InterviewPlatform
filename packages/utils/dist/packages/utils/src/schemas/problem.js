"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionSchema = exports.updateProblemSchema = exports.createProblemSchema = void 0;
const zod_1 = require("zod");
/**
 * Problem creation schema
 */
exports.createProblemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    category: zod_1.z.string().optional(),
    default_code: zod_1.z.string().optional(),
    hidden_prompt: zod_1.z.string().optional(),
    wrong_answer: zod_1.z.string().optional(),
    wrong_answer_explanation: zod_1.z.string().optional(),
    is_honeypot: zod_1.z.boolean().optional().default(false),
});
/**
 * Problem update schema
 */
exports.updateProblemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().min(1).optional(),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']).optional(),
    category: zod_1.z.string().optional().nullable(),
    default_code: zod_1.z.string().optional().nullable(),
    hidden_prompt: zod_1.z.string().optional().nullable(),
    wrong_answer: zod_1.z.string().optional().nullable(),
    wrong_answer_explanation: zod_1.z.string().optional().nullable(),
    is_honeypot: zod_1.z.boolean().optional(),
});
/**
 * Session creation schema
 */
exports.createSessionSchema = zod_1.z.object({
    problemId: zod_1.z.string().uuid(),
    timeLimit: zod_1.z.number().min(180), // Minimum 3 minutes
    isPublic: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=problem.js.map