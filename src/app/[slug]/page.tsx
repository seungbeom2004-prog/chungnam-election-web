/**
 * Unified slug route – handles two kinds of vanity URLs:
 *
 *   /cheonan        → city map view centred on 천안시
 *   /@seungbeom     → candidate profile (looked up by handle)
 *
 * Next.js passes the raw URL segment (including the leading @) as `slug`.
 */
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { CHUNGNAM_DISTRICTS } from "@/lib/districts";
import CityView from "./CityView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  if (decoded.startsWith("@")) {
    const handle = decoded.slice(1).toLowerCase();
    const { data } = await supabase
      .from("Candidate")
      .select("name, district")
      .eq("handle", handle)
      .single();

    if (data) {
      return {
        title: `${data.name} 후보 | 개혁신당 충남도당`,
        description: `${data.district} ${data.name} 후보의 공약을 확인하세요.`,
      };
    }
  }

  const district =
    CHUNGNAM_DISTRICTS.find((d) => d.code === decoded) ??
    (await supabase
      .from("District")
      .select("name, code")
      .eq("code", decoded)
      .single()
      .then((r) => r.data ?? null));

  if (district) {
    return {
      title: `${district.name} | 개혁신당 충남도당`,
      description: `${district.name} 지역 후보들의 공약 지도를 확인하세요.`,
    };
  }

  return { title: "개혁신당 충남도당" };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  // ── @handle → candidate profile redirect ─────────────────
  if (decoded.startsWith("@")) {
    const handle = decoded.slice(1).toLowerCase();

    const { data: candidate } = await supabase
      .from("Candidate")
      .select("id")
      .eq("handle", handle)
      .single();

    if (!candidate) notFound();
    redirect(`/candidates/${candidate.id}`);
  }

  // ── city code → city map view ─────────────────────────────
  const staticDistrict = CHUNGNAM_DISTRICTS.find((d) => d.code === decoded);
  if (staticDistrict) {
    return (
      <CityView
        district={{
          name: staticDistrict.name,
          code: staticDistrict.code,
          centerLat: staticDistrict.centerLat,
          centerLng: staticDistrict.centerLng,
        }}
      />
    );
  }

  // Fall back to DB districts (admin can add/rename)
  const { data: dbDistrict } = await supabase
    .from("District")
    .select("name, code, centerLat, centerLng")
    .eq("code", decoded)
    .single();

  if (dbDistrict) {
    return <CityView district={dbDistrict} />;
  }

  notFound();
}
