import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateCandidateSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: candidate, error } = await supabaseAdmin
      .from("Candidate")
      .select("id, name, district, handle, profileImage, slogan, bio, party, candidateStatus, caucusStatus, electionId, electionType, phone, contactEmail, showPhone, showContactEmail, pinLat, pinLng, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog, articleUrl, articleTitle, election:Election!electionId(id, name, type)")
      .eq("id", id)
      .single();

    if (error || !candidate) {
      return apiError("후보를 찾을 수 없습니다", 404);
    }

    // Fetch pledges with collaborators
    const { data: pledges } = await supabaseAdmin
      .from("Pledge")
      .select("*, collaborators:PledgeCollaboration(id, candidateId, candidate:Candidate!candidateId(id, name, district, profileImage))")
      .eq("candidateId", id)
      .eq("visible", true)
      .order("createdAt", { ascending: false });

    return apiSuccess({ ...candidate, pledges: pledges ?? [] });
  } catch (error) {
    console.error("[GET /api/candidates/:id]", error);
    return apiError("후보 정보를 불러올 수 없습니다", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || (session.user as { id: string }).id !== id) {
      return apiError("권한이 없습니다", 403);
    }

    const body = await request.json();
    const validated = updateCandidateSchema.parse(body);

    // Normalise handle to lowercase if provided
    const updatePayload =
      validated.handle != null
        ? {
            ...validated,
            handle: validated.handle.toLowerCase(),
            updatedAt: new Date().toISOString(),
          }
        : { ...validated, updatedAt: new Date().toISOString() };

    const { data: updated, error } = await supabaseAdmin
      .from("Candidate")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Unique constraint violation on handle
      if (error.code === "23505") {
        return apiError("이미 사용 중인 핸들입니다. 다른 핸들을 선택하세요.", 409);
      }
      console.error("[PUT /api/candidates/:id] Supabase error:", error);
      return apiError("프로필 수정에 실패했습니다", 500);
    }

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PUT /api/candidates/:id]", error);
    return apiError("프로필 수정에 실패했습니다", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || (session.user as { id: string }).id !== id) {
      return apiError("권한이 없습니다", 403);
    }

    // Delete candidate record (pledges and related records cascade via DB)
    const { error: deleteError } = await supabaseAdmin
      .from("Candidate")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/candidates/:id] Supabase error:", deleteError);
      return apiError("계정 삭제에 실패했습니다", 500);
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error("[DELETE /api/candidates/:id] Auth delete error:", authError);
      // Candidate row already deleted; proceed
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/candidates/:id]", error);
    return apiError("계정 삭제에 실패했습니다", 500);
  }
}
