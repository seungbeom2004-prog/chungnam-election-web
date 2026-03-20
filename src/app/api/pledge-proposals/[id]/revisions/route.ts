import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

const MISSING_CODES = ["42703", "42P01", "PGRST200", "PGRST204"];

/** GET /api/pledge-proposals/[id]/revisions — 버전 목록 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("PledgeProposalRevision")
    .select("id, revisionNumber, title, content, authorName, authorType, candidateId, commitMessage, createdAt")
    .eq("pledgeProposalId", id)
    .order("revisionNumber", { ascending: true });

  if (error) {
    if (MISSING_CODES.includes(error.code)) return NextResponse.json({ success: true, data: [] });
    return apiError("버전 목록을 불러올 수 없습니다", 500);
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}

/** POST /api/pledge-proposals/[id]/revisions — 수정 제안(커밋) */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    content?: string;
    commitMessage?: string;
  };

  if (!body.title?.trim()) return apiError("제목을 입력해주세요", 400);
  if (!body.content?.trim()) return apiError("내용을 입력해주세요", 400);

  // 현재 최대 revisionNumber 조회
  const { data: latest } = await supabase
    .from("PledgeProposalRevision")
    .select("revisionNumber")
    .eq("pledgeProposalId", id)
    .order("revisionNumber", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRevisionNumber = (latest?.revisionNumber ?? 0) + 1;

  const isCandidate = user?.role === "candidate";
  const isAdmin = user?.role === "admin";

  const { data: created, error } = await supabaseAdmin
    .from("PledgeProposalRevision")
    .insert({
      id: crypto.randomUUID(),
      pledgeProposalId: id,
      revisionNumber: nextRevisionNumber,
      title: body.title.trim(),
      content: body.content.trim(),
      authorName: user?.name ?? "익명",
      authorType: isCandidate ? "candidate" : "visitor",
      candidateId: isCandidate ? (user?.id ?? null) : null,
      commitMessage: body.commitMessage?.trim() || null,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (MISSING_CODES.includes(error.code)) return apiError("DB 마이그레이션이 필요합니다 (004번 SQL 실행)", 503);
    return apiError("수정 제안 등록에 실패했습니다", 500);
  }

  // 최신 revision으로 PledgeProposal 본문 업데이트
  if (isCandidate || isAdmin) {
    await supabaseAdmin
      .from("PledgeProposal")
      .update({ title: body.title.trim(), content: body.content.trim() })
      .eq("id", id);
  }

  return apiSuccess(created, 201);
}
