import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/monitoring/llm-traffic - Log LLM traffic detection
// Note: This endpoint is kept for logging LLM detection, but IP matching logic has been removed.
// Token-based honeypot system is the primary detection method.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userAgent,
      referrer,
      requestPath,
      llmType,
      patternType,
      confidence,
      timestamp,
    } = body;

    // Log LLM traffic detection for analytics purposes
    // Note: scraper_logs table has been removed, so this is now a no-op
    // or can be logged to a different analytics system if needed
    console.log('LLM traffic detected:', {
      userAgent,
      referrer,
      requestPath,
      llmType,
      patternType,
      confidence,
      timestamp,
    });

    // Token-based honeypot system handles actual cheating detection
    // This endpoint is kept for backward compatibility but does not perform IP matching

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging LLM traffic:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

