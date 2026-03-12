import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceRoleKey) {
  console.error(
    "[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Server-side auth and mutations will fail. " +
      "Add it to your .env.local and deployment environment variables."
  );
}

/**
 * Admin Supabase client using the service role key.
 * - Bypasses Row Level Security (RLS) entirely.
 * - Use ONLY in server-side code (API routes, NextAuth, Server Components).
 * - NEVER import or expose this client in browser/client code.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
