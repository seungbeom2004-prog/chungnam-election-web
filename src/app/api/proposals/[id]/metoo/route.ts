import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "reform-chungnam-salt";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = await params;

  const body = await req.json().catch(() => ({}));
  const { lat, lng, dong, authorName } = body as {
    lat?: number; lng?: number; dong?: string | null; authorName?: string;
  };

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "위치 정보(lat, lng)가 필요합니다." }, { status: 400 });
  }
  if (lat < 35 || lat > 38 || lng < 125 || lng > 130) {
    return NextResponse.json({ error: "충청남도 범위 내의 위치를 선택해주세요." }, { status: 400 });
  }

  // Verify parent post exists and is not a child itself
  const { data: parent, error: fetchErr } = await supabaseAdmin
    .from("ProposalPost")
    .select("id, postType, city, candidateId, status, parentId")
    .eq("id", parentId)
    .neq("status", "deleted")
    .single();

  if (fetchErr || !parent) {
    return NextResponse.json({ error: "원본 게시물을 찾을 수 없습니다." }, { status: 404 });
  }

  if (parent.parentId) {
    return NextResponse.json({ error: "연결된 게시물에는 '나도 있어요'를 추가할 수 없습니다." }, { status: 400 });
  }

  const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
  const ipHash = crypto.createHash("sha256").update(rawIp + IP_HASH_SALT).digest("hex");

  const now = new Date().toISOString();
  const newPost = {
    id: crypto.randomUUID(),
    title: null,
    content: "나도 같은 문제가 있어요! (다른 위치에서)",
    authorName: (authorName ?? "").trim() || "익명",
    city: parent.city ?? null,
    candidateId: parent.candidateId ?? null,
    ipHash,
    status: "pending",
    postType: parent.postType ?? "민원",
    latitude: lat,
    longitude: lng,
    dong: dong ?? null,
    parentId,
    createdAt: now,
  };

  const { error: insertErr } = await supabaseAdmin.from("ProposalPost").insert(newPost);
  if (insertErr) {
    // If parentId or dong columns don't exist yet (migration pending)
    if (["42703", "42P01", "PGRST200", "PGRST204"].includes(insertErr.code)) {
      return NextResponse.json({ error: "DB 마이그레이션이 필요합니다. 관리자에게 문의하세요." }, { status: 503 });
    }
    console.error("[POST /api/proposals/[id]/metoo]", insertErr);
    return NextResponse.json({ error: "등록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: newPost.id }, { status: 201 });
}
