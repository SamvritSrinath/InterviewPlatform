import { NextRequest, NextResponse } from 'next/server';
import { detectLLMTraffic, getLLMPatternType } from '@interview-platform/utils';

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || '';

  // Detect LLM traffic
  const llmDetection = detectLLMTraffic(userAgent, referrer);

  if (llmDetection.isLLM) {
    // Log LLM access to main app
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';
    const patternType = getLLMPatternType(llmDetection);

    // Fire and forget - don't block the request
    fetch(`${mainAppUrl}/api/monitoring/llm-traffic`, {
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

  return NextResponse.next();
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

