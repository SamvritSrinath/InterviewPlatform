export * from './types';
export {createBrowserClient} from './client';
export * from './auth-context';

// Server and middleware exports removed to prevent client bundling issues
// Import directly from source files in server components:
// - import {createServerClient, createServiceClient} from '@interview-platform/supabase-client/src/server'
// - import {createMiddlewareClient} from '@interview-platform/supabase-client/src/middleware'
// - import {requireAuth, requireInterviewee, requireInterviewer, requireAdmin, type AuthUser} from '@interview-platform/supabase-client/src/auth'

