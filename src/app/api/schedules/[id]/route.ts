import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { updateScheduleSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

// PUT /api/schedules/[id] — Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("로그인이 필요합니다", 401);

    const { id } = await params;
    const candidateId = (session.user as { id: string }).id;

    // Verify ownership
    const { data: existing } = await supabase
      .from("Schedule")
      .select("candidateId")
      .eq("id", id)
      .single();

    if (!existing) return apiError("일정을 찾을 수 없습니다", 404);
    if (existing.candidateId !== candidateId) return apiError("권한이 없습니다", 403);

    const body = await request.json();
    const validated = updateScheduleSchema.parse(body);

    const { data: schedule, error } = await supabase
      .from("Schedule")
      .update({ ...validated, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PUT /api/schedules/:id] Supabase error:", error);
      return apiError("일정 수정에 실패했습니다", 500);
    }

    return apiSuccess(schedule);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PUT /api/schedules/:id]", error);
    return apiError("일정 수정에 실패했습니다", 500);
  }
}

// DELETE /api/schedules/[id] — Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return apiError("로그인이 필요합니다", 401);

    const { id } = await params;
    const candidateId = (session.user as { id: string }).id;

    // Verify ownership
    const { data: existing } = await supabase
      .from("Schedule")
      .select("candidateId")
      .eq("id", id)
      .single();

    if (!existing) return apiError("일정을 찾을 수 없습니다", 404);
    if (existing.candidateId !== candidateId) return apiError("권한이 없습니다", 403);

    const { error } = await supabase.from("Schedule").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/schedules/:id] Supabase error:", error);
      return apiError("일정 삭제에 실패했습니다", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/schedules/:id]", error);
    return apiError("일정 삭제에 실패했습니다", 500);
  }
}
