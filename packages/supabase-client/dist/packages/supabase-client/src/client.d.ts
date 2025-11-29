import { Database } from './types';
export declare function createBrowserClient(): import("@supabase/supabase-js").SupabaseClient<Database, "public", any, any, {
    PostgrestVersion: "12";
}>;
