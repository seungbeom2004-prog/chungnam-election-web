import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const MIGRATION_ERRORS = ["42703", "42P01", "PGRST200", "PGRST204"];

/** GET /api/proposals/[id]/revisions — list revision suggestions */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: proposalId } = await params;
  const { data, error } = await supabase
    .from("ProposalResponse")
    .select("id, candidateName, status, content, createdAt")
    .eq("proposalId", proposalId)
    .eq("status", "revision_suggestion")
    .order("createdAt", { ascending: true });

  if (error) {
    if (MIGRATION_ERRORS.includes(error.code)) return NextResponse.json({ success: true, data: [] });
    return apiError("수정제안을 불러올 수 없습니다", 500);
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}

/** POST /api/proposals/[id]/revisions — anyone can submit a revision suggestion */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: proposalId } = await params;
  const body = await req.json().catch(() => ({})) as {
    authorName?: string;
    content?: string;
  };

  const authorName = body.authorName?.trim();
  const content = body.content?.trim();

  if (!authorName || authorName.length < 2) return apiError("이름은 2자 이상 입력해주세요", 400);
  if (!content || content.length < 5) return apiError("내용은 5자 이상 입력해주세요", 400);
  if (content.length > 1000) return apiError("내용은 1000자 이내로 입력해주세요", 400);

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("ProposalResponse")
    .insert({
      id: crypto.randomUUID(),
      proposalId,
      candidateId: null,
      candidateName: authorName,
      candidateProfileImage: null,
      status: "revision_suggestion",
      content,
      pledgeId: null,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) {
    if (MIGRATION_ERRORS.includes(error.code)) return apiError("DB 마이그레이션이 필요합니다", 503);
    console.error("[POST /api/proposals/[id]/revisions]", error);
    return apiError("수정제안 등록에 실패했습니다", 500);
  }
  return apiSuccess(data, 201);
}
