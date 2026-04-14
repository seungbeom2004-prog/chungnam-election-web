import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return apiError("로그인이 필요합니다", 401);
    }

    const userId = session.user.id;
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError("현재 비밀번호와 새 비밀번호를 입력해주세요", 400);
    }

    if (newPassword.length < 8) {
      return apiError("새 비밀번호는 8자 이상이어야 합니다", 400);
    }

    // Fetch current hashed password
    const { data: candidate } = await supabase
      .from("Candidate")
      .select("password")
      .eq("id", userId)
      .single();

    if (!candidate) {
      return apiError("사용자를 찾을 수 없습니다", 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, candidate.password);
    if (!isValid) {
      return apiError("현재 비밀번호가 올바르지 않습니다", 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error } = await supabase
      .from("Candidate")
      .update({
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[PUT /api/account/password] Supabase error:", error);
      return apiError("비밀번호 변경에 실패했습니다", 500);
    }

    return apiSuccess({ message: "비밀번호가 변경되었습니다." });
  } catch (error) {
    console.error("[PUT /api/account/password]", error);
    return apiError("비밀번호 변경에 실패했습니다", 500);
  }
}
