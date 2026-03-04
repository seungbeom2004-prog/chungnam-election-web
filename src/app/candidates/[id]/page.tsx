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
    .select("id, name, district, profileImage, slogan, bio, party")
    .eq("id", id)
    .single();

  if (!candidate) notFound();

  const { data: pledges } = await supabase
    .from("Pledge")
    .select("id, title, description, budget, imageUrl, latitude, longitude, address, createdAt")
    .eq("candidateId", id)
    .eq("visible", true)
    .order("createdAt", { ascending: false });

  const candidateData = {
    id: candidate.id,
    name: candidate.name,
    district: candidate.district,
    profileImage: candidate.profileImage,
    slogan: candidate.slogan,
    bio: candidate.bio,
    party: candidate.party,
    pledges: (pledges ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      budget: p.budget,
      imageUrl: p.imageUrl,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      createdAt: p.createdAt,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <CandidateHero candidate={candidateData} />
      <CandidateContent candidate={candidateData} />
    </div>
  );
}
