import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, apiSuccess } from "@/lib/api-utils";

/**
 * GET /api/qr
 *   - admin: returns all QR codes
 *   - candidate: returns own QR codes
 *   ?ownerId=... (admin only) — filter by candidate
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return apiError("로그인이 필요합니다", 401);

  const { searchParams } = new URL(request.url);
  const ownerIdFilter = searchParams.get("ownerId");

  let query = supabaseAdmin
    .from("QrCode")
    .select("*")
    .order("createdAt", { ascending: false });

  if (user.role === "admin") {
    if (ownerIdFilter) query = query.eq("ownerId", ownerIdFilter);
  } else if (user.role === "candidate") {
    query = query.eq("ownerType", "candidate").eq("ownerId", user.id);
  } else {
    return apiError("권한이 없습니다", 403);
  }

  const { data, error } = await query;
  if (error) {
    if (["42P01"].includes(error.code)) return apiSuccess([]);
    return apiError(error.message, 500);
  }
  return apiSuccess(data ?? []);
}

/**
 * POST /api/qr
 * Body: { name: string, targetPath: string, code?: string }
 *   - candidate: creates as own QR (ownerType=candidate, ownerId=self)
 *   - admin: creates as admin QR (ownerType=admin)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "admin" && user.role !== "candidate")) {
    return apiError("로그인이 필요합니다", 401);
  }

  const body = await request.json().catch(() => ({}));
  const name: string = typeof body.name === "string" ? body.name.trim() : "";
  const targetPath: string = typeof body.targetPath === "string" ? body.targetPath.trim() : "";
  let code: string = typeof body.code === "string" ? body.code.trim() : "";

  if (!name || name.length > 50) return apiError("이름을 1~50자로 입력해주세요", 400);
  if (!targetPath || !targetPath.startsWith("/") || targetPath.length > 300) {
    return apiError("경로는 / 로 시작하는 1~300자여야 합니다", 400);
  }

  // Generate code if missing — 6 char alnum
  if (!code) {
    code = randomCode();
  }
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
    return apiError("코드는 3~32자, 영숫자/-/_ 만 가능합니다", 400);
  }

  // Ensure unique
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabaseAdmin.from("QrCode").select("id").eq("code", code).maybeSingle();
    if (!existing) break;
    code = randomCode();
  }

  const now = new Date().toISOString();
  const isAdmin = user.role === "admin";
  const insertData = {
    id: crypto.randomUUID(),
    code,
    name,
    targetPath,
    ownerType: isAdmin ? "admin" : "candidate",
    ownerId: isAdmin ? null : user.id,
    hitCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabaseAdmin.from("QrCode").insert(insertData).select().single();
  if (error) {
    if (["42P01"].includes(error.code)) return apiError("QR 마이그레이션이 필요합니다. 관리자에게 문의하세요.", 503);
    return apiError(error.message, 500);
  }
  return apiSuccess(data, 201);
}

function randomCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return apiError("로그인이 필요합니다", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id 필요", 400);

  // Verify ownership
  const { data: qr } = await supabaseAdmin.from("QrCode").select("ownerType, ownerId").eq("id", id).single();
  if (!qr) return apiError("QR을 찾을 수 없습니다", 404);

  if (user.role !== "admin") {
    if (qr.ownerType !== "candidate" || qr.ownerId !== user.id) {
      return apiError("권한이 없습니다", 403);
    }
  }

  const { error } = await supabaseAdmin.from("QrCode").delete().eq("id", id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ success: true });
}
