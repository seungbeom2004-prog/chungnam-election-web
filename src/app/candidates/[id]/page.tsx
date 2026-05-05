import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import CandidateHero from "@/components/candidate/CandidateHero";
import CandidateContent from "@/components/candidate/CandidateContent";

// Revalidate candidate profiles every 60 seconds (ISR) for fresh data without full SSR cost
export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: candidate } = await supabase
    .from("Candidate")
    .select("name, district, slogan")
    .eq("id", id)
    .single();

  if (!candidate) return { title: "출마자를 찾을 수 없습니다" };

  return {
    title: `${candidate.name} - ${candidate.district} | 개혁 충남`,
    description: candidate.slogan || `${candidate.name} 출마자의 공약을 확인하세요`,
    openGraph: {
      title: `${candidate.name} - ${candidate.district}`,
      description: candidate.slogan || `${candidate.name} 출마자의 공약을 확인하세요`,
    },
  };
}

export default async function CandidateProfilePage({ params }: Props) {
  const { id } = await params;

  const { data: candidate } = await supabase
    .from("Candidate")
    .select("id, name, district, profileImage, slogan, bio, party, caucusStatus, candidateStatus, pinLat, pinLng, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog, donationUrl, phone, contactEmail, showPhone, showContactEmail")
    .eq("id", id)
    .single();

  if (!candidate) notFound();

  // Only show pledges for officially registered candidates:
  // caucusStatus = "공천 확정" AND candidateStatus IN ("예비후보자", "후보자")
  const isPledgeEligible =
    candidate.caucusStatus === "공천 확정" &&
    ["예비후보자", "후보자"].includes(candidate.candidateStatus ?? "");

  // Fetch map pledges (with category for icons)
  const { data: pledgesRaw } = isPledgeEligible
    ? await supabase
        .from("Pledge")
        .select("id, title, description, budget, imageUrl, latitude, longitude, address, pledgeType, createdAt, category:Category!categoryId(id, name, emoji, color, iconImage)")
        .eq("candidateId", id)
        .eq("visible", true)
        .eq("pledgeType", "map")
        .order("createdAt", { ascending: false })
    : { data: [] };

  // Fetch bylaws pledges (with category for icons)
  const { data: bylawsPledgesRaw } = isPledgeEligible
    ? await supabase
        .from("Pledge")
        .select("id, title, description, budget, imageUrl, latitude, longitude, address, pledgeType, createdAt, category:Category!categoryId(id, name, emoji, color, iconImage)")
        .eq("candidateId", id)
        .eq("visible", true)
        .eq("pledgeType", "bylaws")
        .order("createdAt", { ascending: false })
    : { data: [] };

  // Fetch shared pledges: pledges written by OTHER candidates where this candidate is a co-proposer
  // Use supabaseAdmin to bypass RLS restrictions on PledgeCollaboration table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: collabsRaw } = isPledgeEligible
    ? await supabaseAdmin
        .from("PledgeCollaboration")
        .select("pledgeId, pledge:Pledge!pledgeId(id, title, description, budget, imageUrl, latitude, longitude, address, pledgeType, visible, createdAt, category:Category!categoryId(id, name, emoji, color, iconImage), author:Candidate!candidateId(id, name, district, profileImage))")
        .eq("candidateId", id)
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedPledgesRaw = (collabsRaw ?? []).map((c: any) => c.pledge).filter((p: any) => p && p.visible);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapPledge = (p: any, author?: { id: string; name: string; district: string; profileImage: string | null } | null) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    budget: p.budget,
    imageUrl: p.imageUrl,
    latitude: p.latitude,
    longitude: p.longitude,
    address: p.address,
    pledgeType: p.pledgeType,
    createdAt: p.createdAt,
    category: Array.isArray(p.category) ? (p.category[0] ?? null) : (p.category ?? null),
    author: author ?? null,
  });

  const candidateData = {
    id: candidate.id,
    name: candidate.name,
    district: candidate.district,
    profileImage: candidate.profileImage,
    slogan: candidate.slogan,
    bio: candidate.bio,
    party: candidate.party,
    caucusStatus: candidate.caucusStatus ?? null,
    pinLat: candidate.pinLat ?? null,
    pinLng: candidate.pinLng ?? null,
    youtube: candidate.youtube ?? null,
    instagram: candidate.instagram ?? null,
    twitter: candidate.twitter ?? null,
    facebook: candidate.facebook ?? null,
    tiktok: candidate.tiktok ?? null,
    kakao: candidate.kakao ?? null,
    naverBlog: candidate.naverBlog ?? null,
    donationUrl: (candidate as { donationUrl?: string | null }).donationUrl ?? null,
    articleUrl: (candidate as { articleUrl?: string | null }).articleUrl ?? null,
    articleTitle: (candidate as { articleTitle?: string | null }).articleTitle ?? null,
    phone: (candidate as { phone?: string | null }).phone ?? null,
    contactEmail: (candidate as { contactEmail?: string | null }).contactEmail ?? null,
    showPhone: (candidate as { showPhone?: boolean }).showPhone ?? false,
    showContactEmail: (candidate as { showContactEmail?: boolean }).showContactEmail ?? false,
    pledges: (pledgesRaw ?? []).map((p) => mapPledge(p)),
    bylaws: (bylawsPledgesRaw ?? []).map((p) => mapPledge(p)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedPledges: sharedPledgesRaw.map((p: any) => mapPledge(p, p.author)),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: candidate.name,
    description: candidate.slogan ?? undefined,
    image: candidate.profileImage ?? undefined,
    affiliation: { "@type": "Organization", name: candidate.party ?? "개혁신당" },
    address: { "@type": "PostalAddress", addressRegion: candidate.district },
    url: `https://www.reform-chungnam.kr/candidates/${candidate.id}`,
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CandidateHero candidate={candidateData} />
      <CandidateContent candidate={candidateData} />
    </div>
  );
}
