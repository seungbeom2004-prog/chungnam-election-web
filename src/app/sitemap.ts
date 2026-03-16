import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://www.reform-chungnam.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/pledges`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/proposals`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  // Dynamic candidate profile pages
  const { data: candidates } = await supabase
    .from("Candidate")
    .select("id, updatedAt")
    .eq("verified", true)
    .eq("role", "candidate")
    .eq("caucusStatus", "공천 확정")
    .in("candidateStatus", ["예비후보자", "후보자"]);

  const candidateRoutes: MetadataRoute.Sitemap = (candidates ?? []).map((c) => ({
    url: `${BASE_URL}/candidates/${c.id}`,
    lastModified: new Date(c.updatedAt ?? new Date()),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  return [...staticRoutes, ...candidateRoutes];
}
