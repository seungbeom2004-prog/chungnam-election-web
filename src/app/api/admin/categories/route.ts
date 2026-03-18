import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { createCategorySchema, updateCategorySchema } from "@/lib/validations";

// GET /api/admin/categories — List all categories
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { data: categories, error } = await supabase
      .from("Category")
      .select("*")
      .order("sortOrder");

    if (error) {
      console.error("[GET /api/admin/categories] Supabase error:", error);
      return apiError("카테고리 목록을 불러올 수 없습니다", 500);
    }

    return apiSuccess(categories ?? []);
  } catch (error) {
    console.error("[GET /api/admin/categories]", error);
    return apiError("카테고리 목록을 불러올 수 없습니다", 500);
  }
}

// POST /api/admin/categories — Create a new category
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    const { data: category, error } = await supabase
      .from("Category")
      .insert(validated)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("이미 존재하는 카테고리명입니다", 409);
      }
      console.error("[POST /api/admin/categories] Supabase error:", error);
      return apiError("카테고리 생성에 실패했습니다", 500);
    }

    return apiSuccess(category, 201);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/admin/categories]", error);
    return apiError("카테고리 생성에 실패했습니다", 500);
  }
}

// PATCH /api/admin/categories — Update a category
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    const { categoryId, ...updateData } = validated;

    const { data: category, error } = await supabase
      .from("Category")
      .update({ ...updateData, updatedAt: new Date().toISOString() })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("이미 존재하는 카테고리명입니다", 409);
      }
      console.error("[PATCH /api/admin/categories] Supabase error:", error);
      return apiError("카테고리 수정에 실패했습니다", 500);
    }

    return apiSuccess(category);
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[PATCH /api/admin/categories]", error);
    return apiError("카테고리 수정에 실패했습니다", 500);
  }
}

// DELETE /api/admin/categories — Delete a category
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return apiError("관리자 권한이 필요합니다", 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiError("카테고리 ID가 필요합니다", 400);
    }

    const { error } = await supabase.from("Category").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/admin/categories] Supabase error:", error);
      return apiError("카테고리 삭제에 실패했습니다", 500);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/admin/categories]", error);
    return apiError("카테고리 삭제에 실패했습니다", 500);
  }
}
