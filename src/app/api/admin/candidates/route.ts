import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

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
      .select("id, email, name, district, party, phone, verified, emailVerified, role, electionId, electionType, detailedElectionName, candidateStatus, caucusStatus, pinLat, pinLng, createdAt, election:Election!electionId(id, name)")
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

// PATCH /api/admin/candidates — Update candidate (verify, role, status fields, district, election)
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const { candidateId, verified, role, candidateStatus, caucusStatus, district, electionId, electionType, detailedElectionName, pinLat, pinLng } = body;

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
    if (["출마예정자", "예비후보자", "후보자"].includes(candidateStatus)) {
      updateData.candidateStatus = candidateStatus;
    }
    if (["공천 미확정", "공천 확정"].includes(caucusStatus)) {
      updateData.caucusStatus = caucusStatus;
    }
    if (typeof district === "string" && district.length > 0) {
      updateData.district = district;
    }
    if (electionId !== undefined) {
      updateData.electionId = electionId || null;
    }
    if (pinLat !== undefined) {
      updateData.pinLat = (pinLat !== null && pinLat !== "") ? Number(pinLat) : null;
    }
    if (pinLng !== undefined) {
      updateData.pinLng = (pinLng !== null && pinLng !== "") ? Number(pinLng) : null;
    }
    if (electionType !== undefined) {
      updateData.electionType = electionType || null;
    }
    if (detailedElectionName !== undefined) {
      updateData.detailedElectionName = detailedElectionName || null;
    }

    const { data: updated, error } = await supabase
      .from("Candidate")
      .update(updateData)
      .eq("id", candidateId)
      .select("id, email, name, district, verified, role, candidateStatus, caucusStatus, electionId")
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
