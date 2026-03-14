import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { paginationSchema } from "@/lib/validations";
import { apiError, paginationMeta } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");
    // eligible=true → only candidates publicly visible on the map
    // (caucusStatus="공천 확정" AND candidateStatus in ["예비후보자","후보자"])
    const eligible = searchParams.get("eligible") === "true";

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
    });

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("Candidate")
      .select("id, name, district, profileImage, slogan, party, candidateStatus, caucusStatus, electionId, electionType, detailedElectionName, pinLat, pinLng, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog, election:Election!electionId(id, name)", { count: "exact" })
      .eq("verified", true)
      .eq("role", "candidate")   // exclude admin accounts from public listing
      .order("name", { ascending: true })
      .range(from, to);

    if (district) query = query.eq("district", district);
    if (eligible) {
      query = query
        .eq("caucusStatus", "공천 확정")
        .in("candidateStatus", ["예비후보자", "후보자"]);
    }

    const { data: candidates, count, error } = await query;

    if (error) {
      console.error("[GET /api/candidates] Supabase error:", error);
      return apiError("후보 목록을 불러올 수 없습니다", 500);
    }

    return NextResponse.json({
      success: true,
      data: candidates ?? [],
      pagination: paginationMeta(count ?? 0, page, limit),
    });
  } catch (error) {
    console.error("[GET /api/candidates]", error);
    return apiError("후보 목록을 불러올 수 없습니다", 500);
  }
}
