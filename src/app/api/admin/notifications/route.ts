import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/admin/notifications — list sent notifications (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return apiError("권한이 없습니다", 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const { data, count, error } = await supabase
      .from("Notification")
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST200" || error.code === "PGRST205") {
        return apiSuccess({ data: [], total: 0 });
      }
      return apiError("알림 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess({ data: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("[GET /api/admin/notifications]", err);
    return apiError("알림 목록을 불러올 수 없습니다", 500);
  }
}

// POST /api/admin/notifications — send notification to candidate(s)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return apiError("권한이 없습니다", 403);
  }

  try {
    const body = await request.json();
    const { targetId, title, message, level = "info" } = body;

    if (!title?.trim() || !message?.trim()) {
      return apiError("제목과 내용을 입력해주세요", 400);
    }

    const senderId = (session.user as { id?: string })?.id ?? "admin";

    const { data, error } = await supabase
      .from("Notification")
      .insert({
        targetId: targetId || null, // null = broadcast
        senderId,
        title: title.trim(),
        message: message.trim(),
        level,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST200" || error.code === "PGRST205") {
        return apiError(
          "알림 테이블이 아직 생성되지 않았습니다. Supabase SQL Editor에서 migration v11을 실행해주세요.",
          503
        );
      }
      console.error("[POST /api/admin/notifications]", error);
      return apiError("알림 전송에 실패했습니다", 500);
    }

    return apiSuccess(data, 201);
  } catch (err) {
    console.error("[POST /api/admin/notifications]", err);
    return apiError("알림 전송에 실패했습니다", 500);
  }
}

// DELETE /api/admin/notifications?id=xxx — delete a notification
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return apiError("권한이 없습니다", 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("ID가 필요합니다", 400);

    const { error } = await supabase.from("Notification").delete().eq("id", id);
    if (error) {
      return apiError("삭제에 실패했습니다", 500);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/notifications]", err);
    return apiError("삭제에 실패했습니다", 500);
  }
}
