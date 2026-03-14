import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import PledgeListView from "./PledgeListView";
import type { PledgeTile } from "./PledgeTicker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공약 목록 | 개혁 충남",
  description: "충남 지역 개혁신당 후보자들의 공약을 확인하세요.",
};

interface CandidateInfo {
  id: string;
  name: string;
  district: string;
  profileImage: string | null;
}

export default async function PledgesPage() {
  // Fetch eligible candidates
  const { data: eligible } = await supabase
    .from("Candidate")
    .select("id, name, district, profileImage")
    .eq("verified", true)
    .eq("role", "candidate")
    .eq("caucusStatus", "공천 확정")
    .in("candidateStatus", ["예비후보자", "후보자"])
    .order("createdAt", { ascending: true });

  const eligibleCandidates = (eligible ?? []) as CandidateInfo[];
  const eligibleIds = eligibleCandidates.map((c) => c.id);

  // Build candidate lookup
  const candidateMap: Record<string, CandidateInfo> = {};
  eligibleCandidates.forEach((c) => { candidateMap[c.id] = c; });

  // Fetch all visible pledges for eligible candidates
  const { data: pledgesRaw } = eligibleIds.length > 0
    ? await supabase
        .from("Pledge")
        .select(
          "id, title, description, budget, youtubeUrl, pledgeType, createdAt, candidateId, latitude, longitude, address, imageUrl, category:Category!categoryId(id, name, emoji, color, iconImage)"
        )
        .in("candidateId", eligibleIds)
        .eq("visible", true)
        .order("createdAt", { ascending: false })
        .limit(500)
    : { data: [] };

  type RawPledge = {
    id: string;
    title: string;
    description: string;
    budget: string | null;
    youtubeUrl: string | null;
    pledgeType: string;
    candidateId: string;
    latitude: number;
    longitude: number;
    address: string | null;
    imageUrl: string | null;
    category: { name: string; emoji: string | null; color: string } | { name: string; emoji: string | null; color: string }[] | null;
  };

  const pledgesList = (pledgesRaw ?? []) as unknown as RawPledge[];
  const pledgeIds = pledgesList.map((p) => p.id);

  // Fetch all collaborations for these pledges (includes candidate info for stacked avatars)
  type RawCollab = {
    pledgeId: string;
    candidateId: string;
    candidate: { id: string; name: string; profileImage: string | null } | null;
  };

  const { data: collabsRaw } = pledgeIds.length > 0
    ? await supabase
        .from("PledgeCollaboration")
        .select("pledgeId, candidateId, candidate:Candidate!candidateId(id, name, profileImage)")
        .in("pledgeId", pledgeIds)
    : { data: [] };

  // Build a map: pledgeId → collaborators[]
  const collabsByPledge: Record<string, { id: string; name: string; profileImage: string | null }[]> = {};
  for (const c of ((collabsRaw ?? []) as unknown as RawCollab[])) {
    if (!collabsByPledge[c.pledgeId]) collabsByPledge[c.pledgeId] = [];
    if (c.candidate) {
      collabsByPledge[c.pledgeId]!.push({
        id: c.candidateId,
        name: c.candidate.name,
        profileImage: c.candidate.profileImage,
      });
    }
  }

  // Build flat tile list ordered by candidate (interleave candidates)
  // Group pledges by candidate first
  const byCandidate: Record<string, RawPledge[]> = {};
  for (const p of pledgesList) {
    if (!byCandidate[p.candidateId]) byCandidate[p.candidateId] = [];
    byCandidate[p.candidateId]!.push(p);
  }

  // Interleave pledges across candidates so each candidate appears throughout the ticker
  const tiles: PledgeTile[] = [];
  const maxPledges = Math.max(...Object.values(byCandidate).map((arr) => arr?.length ?? 0), 0);
  for (let i = 0; i < maxPledges; i++) {
    for (const cid of eligibleIds) {
      const cPledges = byCandidate[cid];
      if (!cPledges || i >= cPledges.length) continue;
      const p = cPledges[i]!;
      const candidate = candidateMap[p.candidateId];
      if (!candidate) continue;
      tiles.push({
        id: p.id,
        title: p.title,
        description: p.description,
        budget: p.budget,
        youtubeUrl: p.youtubeUrl,
        pledgeType: p.pledgeType as "map" | "bylaws",
        bylawTagged: (p as unknown as { bylawTagged?: boolean }).bylawTagged ?? false,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
        imageUrl: p.imageUrl,
        category: p.category
          ? Array.isArray(p.category) ? (p.category[0] ?? null) : p.category
          : null,
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateDistrict: candidate.district,
        candidateProfileImage: candidate.profileImage,
        collaborators: collabsByPledge[p.id] ?? [],
      });
    }
  }

  const totalCandidates = eligibleCandidates.length;
  const totalPledges = tiles.length;

  // Fetch categories
  const { data: categoriesRaw } = await supabase
    .from("Category")
    .select("id, name, emoji, color")
    .order("name");

  const categories = (categoriesRaw ?? []) as { id: string; name: string; emoji: string | null; color: string }[];

  return (
    <PledgeListView
      tiles={tiles}
      totalCandidates={totalCandidates}
      totalPledges={totalPledges}
      candidates={eligibleCandidates}
      categories={categories}
    />
  );
}
