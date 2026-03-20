import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

type RouteContext = { params: Promise<{ id: string }> };
const MISSING_CODES = ["42703", "42P01", "PGRST200", "PGRST204"];
const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";
function hashIp(ip: string) { return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex"); }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("PledgeProposalComment")
    .select("id, content, authorName, authorType, candidateId, status, createdAt")
    .eq("pledgeProposalId", id)
    .eq("status", "visible")
    .order("createdAt", { ascending: true });

  if (error) {
    if (MISSING_CODES.includes(error.code)) return NextResponse.json({ success: true, data: [] });
    return apiError("코멘트를 불러올 수 없습니다", 500);
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;

  const body = await req.json().catch(() => ({})) as {
    content?: string;
    authorName?: string;
  };

  if (!body.content?.trim() || body.content.trim().length < 2) return apiError("내용을 2자 이상 입력해주세요", 400);
  if (body.content.length > 500) return apiError("코멘트는 500자 이내로 입력해주세요", 400);

  const isCandidate = user?.role === "candidate";
  const isAdmin = user?.role === "admin";
  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
  const ipHash = hashIp(rawIp);

  let authorName = body.authorName?.trim() || "익명";
  if (isCandidate) authorName = user?.name ?? "후보자";
  if (isAdmin) authorName = body.authorName?.trim() || "익명";

  const { data: created, error } = await supabaseAdmin
    .from("PledgeProposalComment")
    .insert({
      id: crypto.randomUUID(),
      pledgeProposalId: id,
      content: body.content.trim(),
      authorName,
      authorType: isCandidate ? "candidate" : "visitor",
      candidateId: isCandidate ? (user?.id ?? null) : null,
      ipHash: !isCandidate ? ipHash : null,
      status: "visible",
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (MISSING_CODES.includes(error.code)) return apiError("DB 마이그레이션이 필요합니다 (004번 SQL 실행)", 503);
    return apiError("코멘트 등록에 실패했습니다", 500);
  }
  return apiSuccess(created, 201);
}
