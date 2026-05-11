import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, postType, title, content, city, latitude, longitude, categoryId, adminStatus, parentId, issueId, anonymize } = body;

  // hide_stats / show_stats are deprecated — '현황판 제외' was merged into '숨김' (status='hidden')
  if (adminStatus === "hide_stats") {
    return NextResponse.json({ error: "'현황판 제외' is deprecated — use status='hidden' instead" }, { status: 400 });
  }

  // Anonymize: remove candidateId and set authorName to "익명"
  if (anonymize === true) {
    const { error } = await supabaseAdmin
      .from("ProposalPost")
      .update({ candidateId: null, authorName: "익명" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Edit update (title/content/city/latitude/longitude/categoryId/adminStatus/parentId)
  if (
    title !== undefined || content !== undefined || city !== undefined ||
    latitude !== undefined || longitude !== undefined || categoryId !== undefined ||
    adminStatus !== undefined || parentId !== undefined || issueId !== undefined
  ) {
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (city !== undefined) updateData.city = city;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (adminStatus !== undefined) updateData.adminStatus = adminStatus; // null clears the field
    if (parentId !== undefined) updateData.parentId = parentId; // null to unlink
    if (issueId !== undefined) updateData.issueId = issueId; // null to unlink
    const { error } = await supabaseAdmin.from("ProposalPost").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // postType-only update (종류 변경)
  if (postType !== undefined && status === undefined) {
    if (postType !== "민원" && postType !== "제안") {
      return NextResponse.json({ error: "Invalid postType" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("ProposalPost").update({ postType }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // "accepted"는 deprecated — 사이트에서 '채택' 상태 제거됨. 들어오면 거부.
  const allowed = ["pending", "hidden", "deleted"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "deleted") updateData.deletedAt = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("ProposalPost")
    .update(updateData)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
