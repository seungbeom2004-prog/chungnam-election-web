import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// GET /api/notifications — fetch notifications for the current candidate
// Returns admin-to-me + broadcasts (targetId IS NULL)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("로그인이 필요합니다", 401);

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);
    const unreadOnly = searchParams.get("unread") === "true";

    const candidateId = (session.user as { id?: string })?.id;
    if (!candidateId) return apiError("사용자 정보를 찾을 수 없습니다", 400);

    // Fetch notifications targeted to this user OR broadcast (targetId is NULL)
    let q = supabase
      .from("Notification")
      .select("*", { count: "exact" })
      .or(`targetId.eq.${candidateId},targetId.is.null`)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      q = q.eq("isRead", false);
    }

    const { data, count, error } = await q;

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST200" || error.code === "PGRST205") {
        return apiSuccess({ data: [], total: 0, unreadCount: 0 });
      }
      return apiError("알림을 불러올 수 없습니다", 500);
    }

    const unreadCount = (data ?? []).filter((n) => !n.isRead).length;
    return apiSuccess({ data: data ?? [], total: count ?? 0, unreadCount });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return apiError("알림을 불러올 수 없습니다", 500);
  }
}

// PATCH /api/notifications — mark notification(s) as read
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("로그인이 필요합니다", 401);

  try {
    const body = await request.json();
    const { id, markAllRead } = body;

    const candidateId = (session.user as { id?: string })?.id;
    if (!candidateId) return apiError("사용자 정보를 찾을 수 없습니다", 400);

    if (markAllRead) {
      await supabase
        .from("Notification")
        .update({ isRead: true, readAt: new Date().toISOString() })
        .or(`targetId.eq.${candidateId},targetId.is.null`)
        .eq("isRead", false);
    } else if (id) {
      await supabase
        .from("Notification")
        .update({ isRead: true, readAt: new Date().toISOString() })
        .eq("id", id);
    }

    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return apiError("알림 업데이트에 실패했습니다", 500);
  }
}
