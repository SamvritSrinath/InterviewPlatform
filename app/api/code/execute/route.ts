import {NextRequest, NextResponse} from 'next/server';
import {exec} from 'child_process';
import {promisify} from 'util';
import {writeFile, unlink} from 'fs/promises';
import {join} from 'path';
import {tmpdir} from 'os';
import {z} from 'zod';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

const executeCodeSchema = z.object({
  code: z.string().min(1),
  problemId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  testCases: z
    .array(
      z.object({
        input: z.any(),
        expectedOutput: z.any(),
      }),
    )
    .optional(),
});

// POST /api/code/execute - Execute Python code
export async function POST(request: NextRequest) {
  let tempFile: string | null = null;

  try {
    const body = await request.json();
    const validatedData = executeCodeSchema.parse(body);

    const {code, testCases} = validatedData;

    // Sanitize code - remove dangerous operations
    const dangerousPatterns = [
      /import os/gi,
      /import sys/gi,
      /import subprocess/gi,
      /import socket/gi,
      /import urllib/gi,
      /import requests/gi,
      /import http/gi,
      /__import__/gi,
      /eval\(/gi,
      /exec\(/gi,
      /open\(/gi,
      /file\(/gi,
      /input\(/gi,
      /raw_input\(/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return NextResponse.json(
          {error: 'Code contains prohibited operations'},
          {status: 400},
        );
      }
    }

    // Create temporary file
    tempFile = join(tmpdir(), `code-${Date.now()}.py`);
    await writeFile(tempFile, code, 'utf-8');

    // Execute code with timeout
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();

    try {
      const {stdout, stderr} = (await Promise.race([
        execAsync(`python3 ${tempFile}`, {
          timeout,
          maxBuffer: 1024 * 1024, // 1MB
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Execution timeout')), timeout),
        ),
      ])) as {stdout: string; stderr: string};

      const executionTime = Date.now() - startTime;

      // If test cases provided, validate against them
      if (testCases && testCases.length > 0) {
        const results = [];
        for (const testCase of testCases) {
          // For now, we'll just check if the output matches (simplified)
          // In a real implementation, you'd need to parse the output and compare
          const passed =
            stdout.trim() === String(testCase.expectedOutput).trim();
          results.push({
            passed,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: stdout.trim(),
          });
        }

        return NextResponse.json({
          results,
          executionTime,
        });
      }

      // Return output or error
      if (stderr && !stdout) {
        return NextResponse.json(
          {
            error: stderr,
            executionTime,
          },
          {status: 500},
        );
      }

      return NextResponse.json({
        output: stdout || 'No output',
        executionTime,
      });
    } catch (error: unknown) {
      const errorObj = error as {message?: string; stderr?: string};
      if (errorObj.message === 'Execution timeout') {
        return NextResponse.json(
          {error: 'Code execution timed out'},
          {status: 408},
        );
      }

      return NextResponse.json(
        {error: errorObj.stderr || errorObj.message || 'Execution error'},
        {status: 500},
      );
    }
  } catch (error: unknown) {
    console.error('Error executing code:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {error: 'Invalid request data', details: error.errors},
        {status: 400},
      );
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  } finally {
    // Clean up temporary file
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (error) {
        console.error('Error deleting temp file:', error);
      }
    }
  }
}
