import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://www.reform-chungnam.kr";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: pledge } = await supabase
    .from("Pledge")
    .select(
      "id, title, description, imageUrl, candidate:Candidate!candidateId(id, name, district, profileImage)"
    )
    .eq("id", id)
    .eq("visible", true)
    .single();

  if (!pledge) {
    return {
      title: "공약 | 개혁 충남",
      description: "2026 충남 지방선거 개혁신당 후보자 공약",
      alternates: { canonical: `${BASE_URL}/pledge/${id}` },
      openGraph: {
        url: `${BASE_URL}/pledge/${id}`,
        title: "공약 | 개혁 충남",
        description: "2026 충남 지방선거 개혁신당 후보자 공약",
        type: "website",
        locale: "ko_KR",
        images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
      },
    };
  }

  const candidate = Array.isArray(pledge.candidate)
    ? pledge.candidate[0]
    : pledge.candidate;

  const title = `${pledge.title} | 개혁 충남`;
  const description =
    (pledge.description ?? "").slice(0, 100) ||
    "2026 충남 지방선거 개혁신당 후보자 공약";
  const image =
    pledge.imageUrl ??
    (candidate as { profileImage?: string | null } | null)?.profileImage ??
    `${BASE_URL}/og-image.png`;
  const canonicalUrl = `${BASE_URL}/pledge/${id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      url: canonicalUrl,
      title,
      description,
      type: "article",
      locale: "ko_KR",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: pledge.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** Server component — just redirects to the map with the pledge pre-selected.
 *  OG tags above are served to crawlers before the redirect. */
export default async function PledgeSharePage({ params }: Props) {
  const { id } = await params;
  redirect(`/?pledge=${encodeURIComponent(id)}`);
}
