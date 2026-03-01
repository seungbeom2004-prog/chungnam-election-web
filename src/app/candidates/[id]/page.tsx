import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CandidateHero from "@/components/candidate/CandidateHero";
import CandidateContent from "@/components/candidate/CandidateContent";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { name: true, district: true, slogan: true },
  });

  if (!candidate) return { title: "후보를 찾을 수 없습니다" };

  return {
    title: `${candidate.name} - ${candidate.district} | 개혁 충남`,
    description: candidate.slogan || `${candidate.name} 후보의 공약을 확인하세요`,
    openGraph: {
      title: `${candidate.name} - ${candidate.district}`,
      description: candidate.slogan || `${candidate.name} 후보의 공약을 확인하세요`,
    },
  };
}

export default async function CandidateProfilePage({ params }: Props) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      pledges: {
        where: { visible: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!candidate) notFound();

  const candidateData = {
    id: candidate.id,
    name: candidate.name,
    district: candidate.district,
    profileImage: candidate.profileImage,
    slogan: candidate.slogan,
    bio: candidate.bio,
    party: candidate.party,
    pledges: candidate.pledges.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      budget: p.budget,
      imageUrl: p.imageUrl,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <CandidateHero candidate={candidateData} />
      <CandidateContent candidate={candidateData} />
    </div>
  );
}
