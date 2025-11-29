import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@interview-platform/supabase-client/src/server';

// Cache problems list for 60 seconds (problems don't change frequently)
export const revalidate = 60;

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

// GET /api/problems - Get all problems (public)
export async function GET(request: NextRequest) {
  try {
    // Use service client for public endpoint to bypass RLS
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');

    let query = supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: problems, error } = await query;

    if (error) {
      console.error('Error fetching problems:', error);

      if (
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table')
      ) {
      const response = NextResponse.json(
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
        response.headers.set(key, value);
      });
      return response;
      }

      const response = NextResponse.json(
        {
          error: 'Failed to fetch problems',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
      const origin = request.headers.get('origin');
      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

      const response = NextResponse.json({ problems: problems || [] });
      const origin = request.headers.get('origin');
      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
  } catch (error: unknown) {
    console.error('Error in GET /api/problems:', error);
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

