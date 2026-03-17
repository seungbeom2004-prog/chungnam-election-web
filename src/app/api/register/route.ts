import { NextRequest } from "next/server";
import { ZodError } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { registerCandidateSchema } from "@/lib/validations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per hour
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`register:${ip}`, 5, 3600000)) {
      return apiError("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    }

    const body = await request.json();
    const validated = registerCandidateSchema.parse(body);

    // Check if email already exists
    const { data: existing } = await supabase
      .from("Candidate")
      .select("id")
      .eq("email", validated.email)
      .single();

    if (existing) {
      return apiError("이미 등록된 이메일입니다", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create candidate (unverified by default)
    const { data: candidate, error } = await supabase
      .from("Candidate")
      .insert({
        email: validated.email,
        password: hashedPassword,
        name: validated.name,
        phone: validated.phone,
        electionType: validated.electionType,
        province: validated.province,
        district: validated.district,
        profileImage: validated.profileImage ?? null,
        isNominated: validated.isNominated ?? false,
        isNecRegistered: validated.isNecRegistered ?? false,
        detailedElectionName: validated.detailedElectionName ?? null,
        party: "개혁",
        verified: false,
        role: "candidate",
      })
      .select("id, email, name, district, verified, createdAt")
      .single();

    if (error) {
      console.error("[POST /api/register] Supabase error:", error);
      return apiError("회원가입에 실패했습니다", 500);
    }

    return apiSuccess(
      {
        ...candidate,
        message: "출마자 등록이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.",
      },
      201
    );
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);
    console.error("[POST /api/register]", error);
    return apiError("회원가입에 실패했습니다", 500);
  }
}
