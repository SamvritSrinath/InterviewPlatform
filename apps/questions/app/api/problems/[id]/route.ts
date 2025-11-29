import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@interview-platform/supabase-client';

// Cache individual problems for 5 minutes
export const revalidate = 300;

function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// GET /api/problems/[id] - Get a single problem (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Use service client for public endpoint to bypass RLS
    const supabase = createServiceClient();
    const { data: problem, error } = await supabase
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
        const errorResponse = NextResponse.json(
          {
            error:
              'Database tables not found. Please run the database schema setup.',
            details:
              'The problems table does not exist. Please execute the SQL schema in your Supabase dashboard.',
            hint: 'See supabase/schema.sql for the schema definition.',
          },
          { status: 503 },
        );
        const origin = request.headers.get('origin');
        Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
          errorResponse.headers.set(key, value);
        });
        return errorResponse;
      }

      if (error.code === 'PGRST116') {
        const notFoundResponse = NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        const origin = request.headers.get('origin');
        Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
          notFoundResponse.headers.set(key, value);
        });
        return notFoundResponse;
      }

      const errorResponse = NextResponse.json(
        {
          error: 'Failed to fetch problem',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
      const origin = request.headers.get('origin');
      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });
      return errorResponse;
    }

    const response = NextResponse.json({ problem });
    const origin = request.headers.get('origin');
    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error: unknown) {
    console.error('Error in GET /api/problems/[id]:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const response = NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 },
    );
    const origin = request.headers.get('origin');
    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

