import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {requireInterviewer} from '@/lib/supabase/auth';
import {Database} from '@/types/database';
import {z} from 'zod';

// Cache problems list for 60 seconds (problems don't change frequently)
export const revalidate = 60;

const createProblemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string().optional(),
  default_code: z.string().optional(),
  hidden_prompt: z.string().optional(),
});

// GET /api/problems - Get all problems (public)
export async function GET(request: NextRequest) {
  try {
    // Use service client for public endpoint to bypass RLS
    const supabase = createServiceClient();
    const {searchParams} = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');

    let query = supabase
      .from('problems')
      .select('*')
      .order('created_at', {ascending: false});

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const {data: problems, error} = await query;

    if (error) {
      console.error('Error fetching problems:', error);

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

      return NextResponse.json(
        {
          error: 'Failed to fetch problems',
          details: error.message,
          code: error.code,
        },
        {status: 500},
      );
    }

    return NextResponse.json({problems: problems || []});
  } catch (error: unknown) {
    console.error('Error in GET /api/problems:', error);
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

// POST /api/problems - Create a new problem (interviewers only)
export async function POST(request: NextRequest) {
  try {
    await requireInterviewer();
    const serviceClient = createServiceClient();
    const body = await request.json();

    const validatedData = createProblemSchema.parse(body);

    const problemData: Database['public']['Tables']['problems']['Insert'] = {
      title: validatedData.title,
      description: validatedData.description,
      difficulty: validatedData.difficulty,
      category: validatedData.category || null,
      default_code: validatedData.default_code || null,
      hidden_prompt: validatedData.hidden_prompt || null,
      updated_at: new Date().toISOString(),
    };

    // TypeScript inference issue with Supabase insert - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: problem, error} = await (serviceClient.from('problems') as any)
      .insert([problemData])
      .select()
      .single();

    if (error) {
      console.error('Error creating problem:', error);
      return NextResponse.json(
        {error: 'Failed to create problem'},
        {status: 500},
      );
    }

    return NextResponse.json({problem}, {status: 201});
  } catch (error: unknown) {
    console.error('Error in POST /api/problems:', error);
    if (error instanceof z.ZodError) {
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
