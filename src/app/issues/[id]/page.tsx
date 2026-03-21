import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import IssueDetailClient from "./IssueDetailClient";

const BASE_URL = "https://www.reform-chungnam.kr";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const { data: issue } = await supabaseAdmin
    .from("Issue")
    .select("title, summary, category, city")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!issue) {
    return {
      title: "이슈를 찾을 수 없습니다 | 개혁 충남",
    };
  }

  const title = `${issue.title} | 충남 지역 이슈`;
  const description =
    issue.summary ??
    `${issue.city ? issue.city + " " : ""}${issue.category ? issue.category + " " : ""}관련 지역 이슈`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/issues/${id}` },
    openGraph: {
      url: `${BASE_URL}/issues/${id}`,
      title,
      description,
      type: "article",
      locale: "ko_KR",
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: issue.title,
        },
      ],
    },
  };
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <IssueDetailClient issueId={id} />;
}
