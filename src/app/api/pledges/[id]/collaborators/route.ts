import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/pledges/[id]/collaborators — List collaborators for a pledge
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use admin client to bypass RLS on PledgeCollaboration (public read)
    const { data, error } = await supabaseAdmin
      .from("PledgeCollaboration")
      .select("id, candidateId, createdAt, candidate:Candidate!candidateId(id, name, district, profileImage)")
      .eq("pledgeId", id);

    if (error) {
      console.error("[GET /api/pledges/:id/collaborators] Supabase error:", error);
      return apiError("공동공약 목록을 불러올 수 없습니다", 500);
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    console.error("[GET /api/pledges/:id/collaborators]", error);
    return apiError("공동공약 목록을 불러올 수 없습니다", 500);
  }
}

// POST /api/pledges/[id]/collaborators — Add collaborator (join a common pledge)
// - Any candidate can add themselves (body without targetCandidateId)
// - Pledge owner can add a specific candidate (body with targetCandidateId)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("로그인이 필요합니다", 401);

    const { id: pledgeId } = await params;
    const sessionCandidateId = (session.user as { id: string }).id;

    // Parse optional targetCandidateId from body (owner adding someone else)
    let targetCandidateId: string | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.candidateId && typeof body.candidateId === "string") {
        targetCandidateId = body.candidateId;
      }
    } catch { /* body may be empty */ }

    // Verify pledge exists
    const { data: pledge } = await supabase
      .from("Pledge")
      .select("id, candidateId, visible")
      .eq("id", pledgeId)
      .single();

    if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);

    let candidateId: string;

    if (targetCandidateId) {
      // Owner is adding another candidate directly — verify requester is the owner
      if (pledge.candidateId !== sessionCandidateId) {
        return apiError("공약 작성자만 다른 후보를 추가할 수 있습니다", 403);
      }
      if (targetCandidateId === sessionCandidateId) {
        return apiError("본인의 공약에는 공동공약 참여를 할 수 없습니다", 400);
      }
      candidateId = targetCandidateId;
    } else {
      // Candidate is adding themselves — pledge must be visible
      if (!pledge.visible) return apiError("비공개 공약에는 참여할 수 없습니다", 403);
      if (pledge.candidateId === sessionCandidateId) {
        return apiError("본인의 공약에는 공동공약 참여를 할 수 없습니다", 400);
      }
      candidateId = sessionCandidateId;
    }

    // Add collaboration
    const { data: collab, error } = await supabase
      .from("PledgeCollaboration")
      .insert({ pledgeId, candidateId })
      .select("id, pledgeId, candidateId, createdAt")
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("이미 공동공약으로 참여 중입니다", 409);
      }
      console.error("[POST /api/pledges/:id/collaborators] Supabase error:", error);
      return apiError("공동공약 참여에 실패했습니다", 500);
    }

    return apiSuccess(collab, 201);
  } catch (error) {
    console.error("[POST /api/pledges/:id/collaborators]", error);
    return apiError("공동공약 참여에 실패했습니다", 500);
  }
}

// DELETE /api/pledges/[id]/collaborators — Remove collaboration
// ?candidateId=xxx : pledge owner removes a specific collaborator
// (no param)       : logged-in candidate removes themselves
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("로그인이 필요합니다", 401);

    const { id: pledgeId } = await params;
    const sessionCandidateId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const targetCandidateId = searchParams.get("candidateId");

    // If targetCandidateId is provided, verify the requester is the pledge owner
    if (targetCandidateId) {
      const { data: pledge } = await supabase
        .from("Pledge")
        .select("candidateId")
        .eq("id", pledgeId)
        .single();

      if (!pledge) return apiError("공약을 찾을 수 없습니다", 404);
      if (pledge.candidateId !== sessionCandidateId) {
        return apiError("공약 작성자만 참여자를 제거할 수 있습니다", 403);
      }
    }

    const removeId = targetCandidateId || sessionCandidateId;

    const { error } = await supabase
      .from("PledgeCollaboration")
      .delete()
      .eq("pledgeId", pledgeId)
      .eq("candidateId", removeId);

    if (error) {
      console.error("[DELETE /api/pledges/:id/collaborators] Supabase error:", error);
      return apiError("공동공약 취소에 실패했습니다", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/pledges/:id/collaborators]", error);
    return apiError("공동공약 취소에 실패했습니다", 500);
  }
}
