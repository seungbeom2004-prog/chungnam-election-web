import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createPledgeSchema, paginationSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError, paginationMeta } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");
    const district = searchParams.get("district");

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const pledgeType = searchParams.get("pledgeType"); // "map" | "bylaws" | null (all)

    let query = supabase
      .from("Pledge")
      .select("*, candidate:Candidate!candidateId(id, name, district, profileImage), category:Category!categoryId(id, name, emoji, color, iconImage)", { count: "exact" })
      .eq("visible", true)
      .order("createdAt", { ascending: false })
      .range(from, to);

    if (candidateId) {
      query = query.eq("candidateId", candidateId);
    } else {
      // Public map: only show pledges from officially registered candidates.
      // Conditions: caucusStatus = "공천 확정" AND candidateStatus IN ("예비 후보자", "후보자")
      const { data: eligible } = await supabase
        .from("Candidate")
        .select("id")
        .eq("caucusStatus", "공천 확정")
        .in("candidateStatus", ["예비 후보자", "후보자"]);
      const eligibleIds = (eligible ?? []).map((c: { id: string }) => c.id);
      if (eligibleIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: paginationMeta(0, page, limit) });
      }
      query = query.in("candidateId", eligibleIds);
    }

    if (district) query = query.eq("candidate.district", district);
    if (pledgeType) query = query.eq("pledgeType", pledgeType);

    const { data: pledges, count, error } = await query;

    if (error) {
      console.error("[GET /api/pledges] Supabase error:", error);
      return apiError("공약 목록을 불러올 수 없습니다", 500);
    }

    return NextResponse.json({
      success: true,
      data: pledges ?? [],
      pagination: paginationMeta(count ?? 0, page, limit),
    });
  } catch (error) {
    console.error("[GET /api/pledges]", error);
    return apiError("공약 목록을 불러올 수 없습니다", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const candidateId = (session.user as { id: string }).id;
    const body = await request.json();
    const validated = createPledgeSchema.parse(body);

    const { data: pledge, error } = await supabase
      .from("Pledge")
      .insert({
        ...validated,
        candidateId,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/pledges] Supabase error:", error);
      return apiError("공약 생성에 실패했습니다", 500);
    }

    return apiSuccess(pledge, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/pledges]", error);
    return apiError("공약 생성에 실패했습니다", 500);
  }
}
