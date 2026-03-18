import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { createElectionSchema, updateElectionSchema } from "@/lib/validations";

// GET /api/admin/elections — List all elections
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { data: elections, error } = await supabase
      .from("Election")
      .select("*")
      .order("sortOrder", { ascending: true });

    if (error) {
      console.error("[GET /api/admin/elections] Supabase error:", error);
      return apiError("선거 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess(elections ?? []);
  } catch (error) {
    console.error("[GET /api/admin/elections]", error);
    return apiError("선거 목록을 불러올 수 없습니다", 500);
  }
}

// POST /api/admin/elections — Create election
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const validated = createElectionSchema.parse(body);

    const { data: election, error } = await supabase
      .from("Election")
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/admin/elections] Supabase error:", error);
      if (error.code === "23505") return apiError("이미 존재하는 선거명입니다", 409);
      return apiError("선거 생성에 실패했습니다", 500);
    }

    return apiSuccess(election, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/admin/elections]", error);
    return apiError("선거 생성에 실패했습니다", 500);
  }
}

// PATCH /api/admin/elections — Update election
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { electionId, ...updates } = updateElectionSchema.parse(body);

    const { data: election, error } = await supabase
      .from("Election")
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq("id", electionId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/admin/elections] Supabase error:", error);
      return apiError("선거 수정에 실패했습니다", 500);
    }

    return apiSuccess(election);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PATCH /api/admin/elections]", error);
    return apiError("선거 수정에 실패했습니다", 500);
  }
}

// DELETE /api/admin/elections — Delete election
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("id");

    if (!electionId) {
      return apiError("선거 ID가 필요합니다", 400);
    }

    const { error } = await supabase
      .from("Election")
      .delete()
      .eq("id", electionId);

    if (error) {
      console.error("[DELETE /api/admin/elections] Supabase error:", error);
      return apiError("선거 삭제에 실패했습니다", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/admin/elections]", error);
    return apiError("선거 삭제에 실패했습니다", 500);
  }
}
