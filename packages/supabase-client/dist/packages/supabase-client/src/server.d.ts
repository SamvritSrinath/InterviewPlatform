import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
export declare function createServerClient(): Promise<SupabaseClient<Database, "public", any, any, {
    PostgrestVersion: "12";
}>>;
export declare function createServiceClient(): SupabaseClient<Database>;
