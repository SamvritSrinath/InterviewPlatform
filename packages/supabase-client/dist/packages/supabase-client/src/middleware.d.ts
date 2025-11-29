import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './types';
export declare function createMiddlewareClient(request: NextRequest): Promise<{
    supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", any, any, {
        PostgrestVersion: "12";
    }>;
    response: NextResponse<unknown>;
}>;
