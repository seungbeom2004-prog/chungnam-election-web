import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/issues/[id]/pledges — list pledges explicitly registered to this issue */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id: issueId } = await params;

  const { data, error } = await supabaseAdmin
    .from("IssuePledge")
    .select(`
      id, issueId, pledgeId, candidateId, createdAt,
      pledge:Pledge!pledgeId(
        id, title,
        candidate:Candidate!candidateId(id, name, district, profileImage),
        category:Category!categoryId(name)
      )
    `)
    .eq("issueId", issueId)
    .order("createdAt", { ascending: true });

  if (error) {
    // Table may not exist yet (migration pending)
    if (["42703", "42P01", "PGRST200", "PGRST204"].includes(error.code)) {
      return NextResponse.json({ success: true, data: [] });
    }
    console.error("[GET /api/issues/[id]/pledges]", error);
    return apiError("공약 목록을 불러올 수 없습니다", 500);
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

/** POST /api/issues/[id]/pledges — candidate registers their pledge to an issue */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: issueId } = await params;

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !["candidate", "admin"].includes(user.role ?? "")) {
    return apiError("후보자 또는 관리자 로그인이 필요합니다", 401);
  }

  const body = await req.json().catch(() => ({}));
  const pledgeId = typeof body.pledgeId === "string" ? body.pledgeId.trim() : null;
  if (!pledgeId) return apiError("pledgeId가 필요합니다", 400);

  // Verify pledge exists and (for candidates) belongs to them
  const { data: pledge, error: pledgeErr } = await supabaseAdmin
    .from("Pledge")
    .select("id, candidateId, visible")
    .eq("id", pledgeId)
    .single();

  if (pledgeErr || !pledge) return apiError("공약을 찾을 수 없습니다", 404);
  if (user.role === "candidate" && pledge.candidateId !== user.id) {
    return apiError("자신의 공약만 등록할 수 있습니다", 403);
  }

  // Upsert (UNIQUE constraint handles duplicates)
  const { data, error } = await supabaseAdmin
    .from("IssuePledge")
    .upsert(
      {
        id: crypto.randomUUID(),
        issueId,
        pledgeId,
        candidateId: pledge.candidateId ?? null,
        createdAt: new Date().toISOString(),
      },
      { onConflict: "issueId,pledgeId", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/issues/[id]/pledges]", error);
    return apiError("공약 등록에 실패했습니다", 500);
  }

  return apiSuccess(data, 201);
}

/** DELETE /api/issues/[id]/pledges?pledgeId=xxx — remove a pledge from an issue */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id: issueId } = await params;
  const pledgeId = new URL(req.url).searchParams.get("pledgeId");
  if (!pledgeId) return apiError("pledgeId 파라미터가 필요합니다", 400);

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !["candidate", "admin"].includes(user.role ?? "")) {
    return apiError("후보자 또는 관리자 로그인이 필요합니다", 401);
  }

  // Verify the pledge belongs to this candidate (unless admin)
  if (user.role === "candidate") {
    const { data: link } = await supabaseAdmin
      .from("IssuePledge")
      .select("candidateId")
      .eq("issueId", issueId)
      .eq("pledgeId", pledgeId)
      .maybeSingle();

    if (!link || link.candidateId !== user.id) {
      return apiError("자신의 공약만 제거할 수 있습니다", 403);
    }
  }

  const { error } = await supabaseAdmin
    .from("IssuePledge")
    .delete()
    .eq("issueId", issueId)
    .eq("pledgeId", pledgeId);

  if (error) {
    console.error("[DELETE /api/issues/[id]/pledges]", error);
    return apiError("공약 제거에 실패했습니다", 500);
  }

  return apiSuccess({ removed: true });
}
