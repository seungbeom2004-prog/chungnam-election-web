import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import AboutClient from "./AboutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "사이트 & 후보자 소개 | 개혁 충남",
  description: "충남 지역 개혁신당 후보자들을 소개합니다.",
};

export default async function AboutPage() {
  const { data: candidatesRaw } = await supabase
    .from("Candidate")
    .select("id, name, district, profileImage, slogan, createdAt, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog")
    .eq("verified", true)
    .eq("role", "candidate")
    .eq("caucusStatus", "공천 확정")
    .in("candidateStatus", ["예비후보자", "후보자"])
    .order("createdAt", { ascending: true })
    .limit(500);

  const eligibleIds = (candidatesRaw ?? []).map((c: { id: string }) => c.id);

  // Get like counts and pledge counts in parallel
  const [likesResult, pledgesResult] = await Promise.all([
    supabase.from("CandidateLike").select("candidateId"),
    eligibleIds.length > 0
      ? supabase
          .from("Pledge")
          .select("candidateId")
          .in("candidateId", eligibleIds)
          .eq("visible", true)
      : Promise.resolve({ data: [] }),
  ]);

  const likeMap: Record<string, number> = {};
  (likesResult.data ?? []).forEach((l: { candidateId: string }) => {
    likeMap[l.candidateId] = (likeMap[l.candidateId] ?? 0) + 1;
  });

  const pledgeMap: Record<string, number> = {};
  (pledgesResult.data ?? []).forEach((p: { candidateId: string }) => {
    pledgeMap[p.candidateId] = (pledgeMap[p.candidateId] ?? 0) + 1;
  });

  const candidates = (candidatesRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    district: c.district ?? "",
    profileImage: c.profileImage ?? null,
    slogan: c.slogan ?? null,
    createdAt: c.createdAt,
    youtube: c.youtube ?? null,
    instagram: c.instagram ?? null,
    twitter: c.twitter ?? null,
    facebook: c.facebook ?? null,
    tiktok: c.tiktok ?? null,
    kakao: c.kakao ?? null,
    naverBlog: c.naverBlog ?? null,
    likeCount: likeMap[c.id] ?? 0,
    pledgeCount: pledgeMap[c.id] ?? 0,
  }));

  return <AboutClient candidates={candidates} />;
}
