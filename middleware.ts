import { NextRequest, NextResponse } from 'next/server';
import { detectLLMTraffic, getLLMPatternType } from '@/lib/utils';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);
  
  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Detect LLM traffic for honeypot logging
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || '';

  const llmDetection = detectLLMTraffic(userAgent, referrer);

  if (llmDetection.isLLM) {
    // Log LLM access to monitoring API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const patternType = getLLMPatternType(llmDetection);

    // Fire and forget - don't block the request
    fetch(`${appUrl}/api/monitoring/llm-traffic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAgent,
        referrer,
        requestPath: request.nextUrl.pathname,
        llmType: llmDetection.llmType,
        patternType,
        confidence: llmDetection.confidence,
        timestamp: new Date().toISOString(),
        // IP address removed - token-based system doesn't use IP matching
      }),
    }).catch(() => {
      // Silent failure - don't block LLM requests
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

