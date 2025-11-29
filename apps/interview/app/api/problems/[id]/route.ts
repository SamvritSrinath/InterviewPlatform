import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {requireInterviewer} from '@/lib/supabase/auth';
import {Database} from '@interview-platform/supabase-client';
import {updateProblemSchema} from '@interview-platform/utils';
import {z, ZodError} from 'zod';

// Cache individual problems for 300 seconds (5 minutes)
export const revalidate = 300;

// GET /api/problems/[id] - Get a single problem (public)
export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    // Use service client for public endpoint to bypass RLS
    const supabase = createServiceClient();
    const {data: problem, error} = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching problem:', error);

      if (
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table')
      ) {
        return NextResponse.json(
          {
            error:
              'Database tables not found. Please run the database schema setup.',
            details:
              'The problems table does not exist. Please execute the SQL schema in your Supabase dashboard.',
            hint: 'See supabase/schema.sql for the schema definition.',
          },
          {status: 503},
        );
      }

      if (error.code === 'PGRST116') {
        return NextResponse.json({error: 'Problem not found'}, {status: 404});
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch problem',
          details: error.message,
          code: error.code,
        },
        {status: 500},
      );
    }

    return NextResponse.json({problem});
  } catch (error: unknown) {
    console.error('Error in GET /api/problems/[id]:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      {status: 500},
    );
  }
}

// PUT /api/problems/[id] - Update a problem (interviewers only)
export async function PUT(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    await requireInterviewer();
    const serviceClient = createServiceClient();
    const body = await request.json();

    const validatedData = updateProblemSchema.parse(body);

    const updateData: Database['public']['Tables']['problems']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.difficulty !== undefined)
      updateData.difficulty = validatedData.difficulty;
    if (validatedData.category !== undefined)
      updateData.category = validatedData.category;
    if (validatedData.default_code !== undefined)
      updateData.default_code = validatedData.default_code;
    if (validatedData.hidden_prompt !== undefined)
      updateData.hidden_prompt = validatedData.hidden_prompt;
    if (validatedData.wrong_answer !== undefined)
      updateData.wrong_answer = validatedData.wrong_answer;
    if (validatedData.wrong_answer_explanation !== undefined)
      updateData.wrong_answer_explanation = validatedData.wrong_answer_explanation;

    // TypeScript inference issue with Supabase update - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: problem, error} = await (serviceClient.from('problems') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating problem:', error);
      return NextResponse.json(
        {error: 'Failed to update problem'},
        {status: 500},
      );
    }

    return NextResponse.json({problem});
  } catch (error: unknown) {
    console.error('Error in PUT /api/problems/[id]:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        {error: 'Invalid request data', details: error.errors},
        {status: 400},
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Forbidden: Interviewer access required') {
      return NextResponse.json({error: errorMessage}, {status: 403});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}

// DELETE /api/problems/[id] - Delete a problem (interviewers only)
export async function DELETE(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const user = await requireInterviewer();
    const serviceClient = createServiceClient();

    const {error} = await serviceClient.from('problems').delete().eq('id', id);

    if (error) {
      console.error('Error deleting problem:', error);
      return NextResponse.json(
        {error: 'Failed to delete problem'},
        {status: 500},
      );
    }

    return NextResponse.json({message: 'Problem deleted successfully'});
  } catch (error: unknown) {
    console.error('Error in DELETE /api/problems/[id]:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Forbidden: Interviewer access required') {
      return NextResponse.json({error: errorMessage}, {status: 403});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
