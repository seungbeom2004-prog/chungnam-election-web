import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProposalDetailClient from "./ProposalDetailClient";
import RelatedPostsSidebar from "@/components/proposals/RelatedPostsSidebar";

const BASE_URL = "https://www.reform-chungnam.kr";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: post } = await supabase
    .from("ProposalPost")
    .select("title, content, postType")
    .eq("id", id)
    .single();
  if (!post) return { title: "게시물을 찾을 수 없습니다" };
  const title = post.title || post.content.slice(0, 60);
  const typeLabel = post.postType === "민원" ? "불편 제보" : "공약 제안";
  return {
    title: `${title} | 개혁 충남`,
    description: `${typeLabel}: ${post.content.slice(0, 150)}`,
    openGraph: {
      title: `${title} | 개혁 충남`,
      description: `${typeLabel}: ${post.content.slice(0, 150)}`,
      url: `${BASE_URL}/proposals/${id}`,
      type: "article",
    },
  };
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: post } = await supabase
    .from("ProposalPost")
    .select("id, title, content, authorName, postType, status, createdAt, latitude, longitude, candidateId, parentId, dong, adminStatus, candidate:Candidate!candidateId(id, name, district, profileImage, role)")
    .eq("id", id)
    .neq("status", "deleted")
    .single();
  if (!post) notFound();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/proposals" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          불편 제보 &amp; 공약 제안으로 돌아가기
        </Link>
        <div className="lg:grid lg:grid-cols-[1fr,300px] lg:gap-8 items-start">
          {/* Main article */}
          <div>
            <ProposalDetailClient post={post as unknown as Parameters<typeof ProposalDetailClient>[0]['post']} />
          </div>
          {/* Sidebar — right on desktop, below on mobile */}
          <div className="mt-8 lg:mt-0">
            <RelatedPostsSidebar currentPostId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
