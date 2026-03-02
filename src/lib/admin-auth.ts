import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { supabase } from "./supabase";

/**
 * Verify admin access via session role or ADMIN_SECRET header.
 * Shared across all admin API routes.
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  // Method 1: Check session for admin role
  const session = await getServerSession(authOptions);
  if (session) {
    const userId = session.user?.id;
    if (userId) {
      const { data: user } = await supabase
        .from("Candidate")
        .select("role")
        .eq("id", userId)
        .single();
      if (user?.role === "admin") return true;
    }
  }

  // Method 2: Check ADMIN_SECRET header (for API/CLI access)
  const secret = request.headers.get("x-admin-secret");
  if (secret && secret === process.env.ADMIN_SECRET) return true;

  return false;
}
