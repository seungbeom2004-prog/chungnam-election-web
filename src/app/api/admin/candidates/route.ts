import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// Verify admin access via session role or ADMIN_SECRET header
async function isAdmin(request: NextRequest) {
  // Method 1: Check session for admin role
  const session = await getServerSession(authOptions);
  if (session) {
    const userId = (session.user as { id: string }).id;
    const { data: user } = await supabase
      .from("Candidate")
      .select("role")
      .eq("id", userId)
      .single();
    if (user?.role === "admin") return true;
  }

  // Method 2: Check ADMIN_SECRET header (for API/CLI access)
  const secret = request.headers.get("x-admin-secret");
  if (secret && secret === process.env.ADMIN_SECRET) return true;

  return false;
}

// GET /api/admin/candidates — List all candidates (including unverified)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { searchParams } = new URL(request.url);
    const verified = searchParams.get("verified");

    let query = supabase
      .from("Candidate")
      .select("id, email, name, district, party, phone, verified, role, createdAt")
      .order("createdAt", { ascending: false });

    if (verified === "true") query = query.eq("verified", true);
    if (verified === "false") query = query.eq("verified", false);

    const { data: candidates, error } = await query;

    if (error) {
      console.error("[GET /api/admin/candidates] Supabase error:", error);
      return apiError("후보 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess(candidates ?? []);
  } catch (error) {
    console.error("[GET /api/admin/candidates]", error);
    return apiError("후보 목록을 불러올 수 없습니다", 500);
  }
}

// PATCH /api/admin/candidates — Verify/unverify a candidate
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { candidateId, verified, role } = body;

    if (!candidateId) {
      return apiError("후보 ID가 필요합니다", 400);
    }

    const { data: candidate } = await supabase
      .from("Candidate")
      .select("id")
      .eq("id", candidateId)
      .single();

    if (!candidate) {
      return apiError("후보를 찾을 수 없습니다", 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof verified === "boolean") updateData.verified = verified;
    if (role === "admin" || role === "candidate") updateData.role = role;

    const { data: updated, error } = await supabase
      .from("Candidate")
      .update(updateData)
      .eq("id", candidateId)
      .select("id, email, name, district, verified, role")
      .single();

    if (error) {
      console.error("[PATCH /api/admin/candidates] Supabase error:", error);
      return apiError("후보 상태 변경에 실패했습니다", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/candidates]", error);
    return apiError("후보 상태 변경에 실패했습니다", 500);
  }
}

// DELETE /api/admin/candidates — Delete a candidate
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("id");

    if (!candidateId) {
      return apiError("후보 ID가 필요합니다", 400);
    }

    const { error } = await supabase
      .from("Candidate")
      .delete()
      .eq("id", candidateId);

    if (error) {
      console.error("[DELETE /api/admin/candidates] Supabase error:", error);
      return apiError("후보 삭제에 실패했습니다", 500);
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/admin/candidates]", error);
    return apiError("후보 삭제에 실패했습니다", 500);
  }
}
