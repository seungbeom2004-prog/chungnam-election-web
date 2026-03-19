import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PledgeJsonLd } from "@/components/layout/JsonLd";

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

/** Server component — serves OG tags and JSON-LD to crawlers, then redirects users to the map. */
export default async function PledgeSharePage({ params }: Props) {
  const { id } = await params;

  // Fetch pledge for JSON-LD (brief fetch, same as generateMetadata)
  const { data: pledge } = await supabase
    .from("Pledge")
    .select("id, title, description, imageUrl, createdAt, candidate:Candidate!candidateId(id, name)")
    .eq("id", id)
    .eq("visible", true)
    .single();

  const candidate = pledge
    ? (Array.isArray(pledge.candidate) ? pledge.candidate[0] : pledge.candidate)
    : null;

  // Build JSON-LD before redirect() so TypeScript null checks pass.
  // redirect() throws internally, so real users get redirected;
  // crawlers see the rendered HTML (including JSON-LD) before following the redirect.
  const jsonLd = pledge ? (
    <PledgeJsonLd
      id={pledge.id}
      title={pledge.title}
      description={pledge.description ?? ""}
      authorName={(candidate as { name?: string } | null)?.name ?? "후보자"}
      imageUrl={pledge.imageUrl}
      createdAt={pledge.createdAt ?? undefined}
    />
  ) : null;

  redirect(`/?pledge=${encodeURIComponent(id)}`);

  return jsonLd;
}
