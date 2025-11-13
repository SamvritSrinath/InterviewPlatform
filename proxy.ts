import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from './lib/supabase/middleware'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export async function proxy(request: NextRequest) {
  const { supabase, response } = await createClient(request)

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/problems']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Public interview sessions (token-based access) - allow access without auth
  // Format: /interview/[sessionId] where sessionId can be a session ID or token (both UUIDs)
  // We allow access to /interview/[sessionId] routes without auth - the component will handle
  // checking if it's a public token or requires authentication
  const isInterviewSessionRoute = /^\/interview\/[a-f0-9-]+$/i.test(request.nextUrl.pathname)

  // Protected routes (but exclude interview session routes - they handle auth themselves)
  const protectedRoutes = ['/dashboard', '/api/dashboard']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Admin routes
  const adminRoutes = ['/admin', '/api/admin']
  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin access for admin routes
  if (isAdminRoute && user) {
    try {
      const serviceClient = createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: userData } = await serviceClient
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      const userTyped = userData as { is_admin: boolean } | null;
      if (!userTyped?.is_admin) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      // If check fails, redirect to dashboard
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect admin routes to login if not authenticated
  if (isAdminRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Scraper detection
  await detectScraper(request, supabase)

  return response
}

async function detectScraper(request: NextRequest, supabase: any) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  const requestPath = request.nextUrl.pathname

  // Skip scraper detection for API routes that don't need it, except problem routes
  if (requestPath.startsWith('/api/') && !requestPath.startsWith('/api/problems')) {
    return
  }

  // FILTER: Only log actual bots/scrapers, not legitimate problem repository access
  // Legitimate users browsing problems is normal behavior, not scraping
  
  // Check for bot patterns in user agent
  const botPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scrape/i,
    /curl/i,
    /wget/i,
    /python/i,
    /go-http-client/i,
    /java/i,
    /node/i,
    /postman/i,
    /insomnia/i,
    /httpie/i,
    /scrapy/i,
    /beautifulsoup/i,
    /requests/i,
    /axios/i,
    /urllib/i,
    /httpx/i,
  ]

  const isBot = botPatterns.some((pattern) => pattern.test(userAgent))

  // Only log if it's an actual bot/scraper (not legitimate problem repository access)
  // Legitimate users browsing /problems is normal and shouldn't be logged
  if (isBot) {
    try {
      // Use service client to bypass RLS
      const serviceClient = createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const logData: any = {
        ip_address: ipAddress,
        user_agent: userAgent,
        request_path: requestPath,
        pattern_type: 'user_agent',
        detected_at: new Date().toISOString(),
      }

      // TypeScript inference issue with Supabase insert - using type assertion as workaround
      await (serviceClient.from('scraper_logs') as any).insert([logData])
    } catch (error) {
      // Silently fail to avoid blocking requests
      console.error('Error logging scraper access:', error)
    }
  }
  // Note: We no longer log problem_repo_access by default
  // Only log it when checking IP during an active interview session (done in check-ip API)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

