import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createScheduleSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

// GET /api/schedules — List schedules for a candidate
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return apiError("candidateId가 필요합니다", 400);
    }

    // Check if user is the owner (to see private schedules too)
    const session = await getServerSession(authOptions);
    const isOwner = session && (session.user as { id: string }).id === candidateId;

    let query = supabase
      .from("Schedule")
      .select("*")
      .eq("candidateId", candidateId)
      .order("startDate", { ascending: true });

    if (!isOwner) {
      query = query.eq("isPublic", true);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error("[GET /api/schedules] Supabase error:", error);
      return apiError("일정을 불러올 수 없습니다", 500);
    }

    return NextResponse.json({ success: true, data: schedules ?? [] });
  } catch (error) {
    console.error("[GET /api/schedules]", error);
    return apiError("일정을 불러올 수 없습니다", 500);
  }
}

// POST /api/schedules — Create schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const candidateId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = createScheduleSchema.parse(body);

    const { data: schedule, error } = await supabase
      .from("Schedule")
      .insert({ ...validated, candidateId })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/schedules] Supabase error:", error);
      return apiError("일정 생성에 실패했습니다", 500);
    }

    return apiSuccess(schedule, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/schedules]", error);
    return apiError("일정 생성에 실패했습니다", 500);
  }
}
