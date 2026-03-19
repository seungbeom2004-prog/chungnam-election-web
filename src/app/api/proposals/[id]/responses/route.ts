import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["접수됨", "검토 중", "공약 반영 예정", "공약 반영 완료", "반영 불가"] as const;
type ResponseStatus = (typeof VALID_STATUSES)[number];

/** GET /api/proposals/[id]/responses — list candidate responses for a proposal */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: proposalId } = await params;

  const { data, error } = await supabase
    .from("ProposalResponse")
    .select("id, candidateId, candidateName, candidateProfileImage, status, content, pledgeId, createdAt")
    .eq("proposalId", proposalId)
    .order("createdAt", { ascending: true });

  if (error) {
    // Table may not exist yet (migration pending)
    if (["42703", "42P01", "PGRST200", "PGRST204"].includes(error.code)) {
      return NextResponse.json({ success: true, data: [] });
    }
    console.error("[GET /api/proposals/[id]/responses]", error);
    return apiError("답변을 불러올 수 없습니다", 500);
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

/** POST /api/proposals/[id]/responses — candidate creates/updates their response */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: proposalId } = await params;

  // Auth: candidate only
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string; profileImage?: string } | undefined;

  if (!user?.id || user.role !== "candidate") {
    return apiError("후보자 로그인이 필요합니다", 401);
  }

  const body = await req.json().catch(() => ({}));
  const { status, content, pledgeId } = body as {
    status?: string;
    content?: string;
    pledgeId?: string;
  };

  if (!content || typeof content !== "string" || content.trim().length < 5) {
    return apiError("답변 내용을 5자 이상 입력해주세요", 400);
  }
  if (content.trim().length > 2000) {
    return apiError("답변은 2000자 이내로 입력해주세요", 400);
  }
  if (status && !VALID_STATUSES.includes(status as ResponseStatus)) {
    return apiError("유효하지 않은 상태값입니다", 400);
  }

  // Fetch candidate's profileImage
  const { data: candidateRow } = await supabase
    .from("Candidate")
    .select("profileImage, name")
    .eq("id", user.id)
    .single();

  // Upsert: one response per candidate per proposal
  const { data: existing } = await supabaseAdmin
    .from("ProposalResponse")
    .select("id")
    .eq("proposalId", proposalId)
    .eq("candidateId", user.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    proposalId,
    candidateId: user.id,
    candidateName: candidateRow?.name ?? user.name ?? "후보자",
    candidateProfileImage: candidateRow?.profileImage ?? null,
    status: (status as ResponseStatus) ?? "접수됨",
    content: content.trim(),
    pledgeId: pledgeId ?? null,
    updatedAt: now,
  };

  let result;
  if (existing) {
    result = await supabaseAdmin
      .from("ProposalResponse")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from("ProposalResponse")
      .insert({ ...payload, id: crypto.randomUUID(), createdAt: now })
      .select()
      .single();
  }

  if (result.error) {
    // Table not yet migrated
    if (["42703", "42P01", "PGRST200", "PGRST204"].includes(result.error.code)) {
      return apiError("DB 마이그레이션이 필요합니다. 관리자에게 문의하세요.", 503);
    }
    console.error("[POST /api/proposals/[id]/responses]", result.error);
    return apiError("답변 등록에 실패했습니다", 500);
  }

  return apiSuccess(result.data, existing ? 200 : 201);
}
