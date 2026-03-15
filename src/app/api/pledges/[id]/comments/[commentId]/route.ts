import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deletePledgeCommentSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;

  try {
    const body = await request.json();
    const { password } = deletePledgeCommentSchema.parse(body);

    const { data: comment, error } = await supabaseAdmin
      .from("PledgeComment")
      .select("id, passwordHash, status")
      .eq("id", commentId)
      .single();

    if (error || !comment) return apiError("댓글을 찾을 수 없습니다", 404);
    if (comment.status !== "visible") return apiError("이미 삭제된 댓글입니다", 400);

    const match = await bcrypt.compare(password, comment.passwordHash);
    if (!match) return apiError("비밀번호가 올바르지 않습니다", 403);

    await supabaseAdmin
      .from("PledgeComment")
      .update({ status: "deleted", deletedAt: new Date().toISOString() })
      .eq("id", commentId);

    return apiSuccess({ deleted: true });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[DELETE /api/pledges/[id]/comments/[commentId]]", err);
    return apiError("댓글 삭제에 실패했습니다", 500);
  }
}
