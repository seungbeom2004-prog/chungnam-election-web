import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
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

  const pledges = pledgesRaw;
  const bylawsPledges = bylawsPledgesRaw;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapPledge = (p: any) => ({
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
    category: p.category ?? null,
  });

  const candidateData = {
    id: candidate.id,
    name: candidate.name,
    district: candidate.district,
    profileImage: candidate.profileImage,
    slogan: candidate.slogan,
    bio: candidate.bio,
    party: candidate.party,
    pinLat: candidate.pinLat ?? null,
    pinLng: candidate.pinLng ?? null,
    youtube: candidate.youtube ?? null,
    instagram: candidate.instagram ?? null,
    twitter: candidate.twitter ?? null,
    facebook: candidate.facebook ?? null,
    tiktok: candidate.tiktok ?? null,
    kakao: candidate.kakao ?? null,
    naverBlog: candidate.naverBlog ?? null,
    pledges: (pledges ?? []).map(mapPledge),
    bylaws: (bylawsPledges ?? []).map(mapPledge),
  };

  return (
    <div className="min-h-screen bg-background">
      <CandidateHero candidate={candidateData} />
      <CandidateContent candidate={candidateData} />
    </div>
  );
}
