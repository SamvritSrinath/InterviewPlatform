import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

type HoneypotAccessLogInsert = Database['public']['Tables']['honeypot_access_logs']['Insert'];

/**
 * Extract IP address from request headers
 */
function extractIPFromHeaders(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Check if request is from the same origin (Interview App)
 * This prevents false positives when the Interview App loads the image
 */
function isSameOriginRequest(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (!referer && !origin) {
    return false; // No referer/origin means external request
  }
  
  // Check if referer or origin matches current host
  if (host) {
    if (referer && referer.includes(host)) {
      return true;
    }
    if (origin && origin.includes(host)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate a 1x1 transparent PNG image
 * Returns base64-encoded PNG data
 */
function generateTransparentPNG(): string {
  // 1x1 transparent PNG in base64
  // This is the smallest valid PNG: 43 bytes
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

/**
 * GET /api/assets/img/v1/[token]
 * Serves a tracking pixel image and logs honeypot access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const serviceClient = createServiceClient();

    if (!token) {
      return new NextResponse('Token is required', { status: 400 });
    }

    // Validate token exists in sessions table
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .select('id, problem_id')
      .eq('honeypot_token', token)
      .maybeSingle();

    // If token is invalid, return 404 (don't reveal it's a honeypot)
    if (sessionError || !session) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Extract request metadata
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'unknown';
    const detectedIp = extractIPFromHeaders(request);
    const isInternal = isSameOriginRequest(request);

    // Log the access to honeypot_access_logs (only if external request)
    // Internal requests from Interview App are excluded to prevent false positives
    if (!isInternal) {
      try {
        const logData: HoneypotAccessLogInsert = {
          token_used: token,
          detected_ip: detectedIp,
          user_agent: userAgent,
          severity: 'HIGH',
        };
        // TypeScript inference issue with Supabase insert - using type assertion as workaround
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (serviceClient.from('honeypot_access_logs') as any).insert([logData]);
        // Database trigger will automatically create cheating_attempts record
      } catch (error) {
        // Silent failure - don't reveal honeypot nature
        console.error('Error logging honeypot image access:', error);
      }
    }

    // Generate and return the transparent PNG
    const pngBase64 = generateTransparentPNG();
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/assets/img/v1/[token]:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

