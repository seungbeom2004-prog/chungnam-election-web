/**
 * GET /api/candidates/handle/[handle]
 *
 * Public endpoint: look up a candidate by their vanity handle.
 * Used by the /@handle route and the profile handle-availability check.
 */
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const normalised = handle.toLowerCase().replace(/^@/, "");

    if (!normalised) {
      return apiError("핸들을 입력하세요", 400);
    }

    const { data: candidate, error } = await supabase
      .from("Candidate")
      .select("id, name, district, profileImage, slogan, bio, party, handle")
      .eq("handle", normalised)
      .single();

    if (error || !candidate) {
      return apiError("해당 핸들을 가진 후보를 찾을 수 없습니다", 404);
    }

    return apiSuccess(candidate);
  } catch (error) {
    console.error("[GET /api/candidates/handle/:handle]", error);
    return apiError("후보 정보를 불러올 수 없습니다", 500);
  }
}
