import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import CandidateHero from "@/components/candidate/CandidateHero";
import CandidateContent from "@/components/candidate/CandidateContent";

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
    .select("id, name, district, profileImage, slogan, bio, party, caucusStatus, candidateStatus, pinLat, pinLng, youtube, instagram, twitter, facebook, tiktok, kakao, naverBlog")
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: collabsRaw } = isPledgeEligible
    ? await supabase
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
    pledges: (pledgesRaw ?? []).map((p) => mapPledge(p)),
    bylaws: (bylawsPledgesRaw ?? []).map((p) => mapPledge(p)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedPledges: sharedPledgesRaw.map((p: any) => mapPledge(p, p.author)),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-14 z-10 bg-white/80 backdrop-blur-sm">
        <Link href="/cute" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-4 py-2">
          ← 지도로 돌아가기
        </Link>
      </div>
      <CandidateHero candidate={candidateData} />
      <CandidateContent candidate={candidateData} />
    </div>
  );
}
