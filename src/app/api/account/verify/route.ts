import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

// POST /api/account/verify — Verify current password (for gated UI sections)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const userId = session.user.id;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return apiError("비밀번호를 입력해주세요", 400);
    }

    const { data: candidate } = await supabase
      .from("Candidate")
      .select("password")
      .eq("id", userId)
      .single();

    if (!candidate) {
      return apiError("사용자를 찾을 수 없습니다", 404);
    }

    const isValid = await bcrypt.compare(password, candidate.password);
    if (!isValid) {
      return apiError("비밀번호가 올바르지 않습니다", 401);
    }

    return apiSuccess({ verified: true });
  } catch (error) {
    console.error("[POST /api/account/verify]", error);
    return apiError("인증에 실패했습니다", 500);
  }
}
