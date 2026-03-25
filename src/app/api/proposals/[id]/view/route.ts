import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Increment view count for a proposal post. Silently no-ops if the column doesn't exist yet. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    // Fetch current viewCount
    const { data, error: fetchError } = await supabaseAdmin
      .from("ProposalPost")
      .select("viewCount")
      .eq("id", id)
      .single();

    // Column doesn't exist yet — migration pending, skip silently
    if (fetchError?.code === "42703" || fetchError?.code === "PGRST204") {
      return NextResponse.json({ ok: true, viewCount: null });
    }
    if (fetchError) return NextResponse.json({ ok: false }, { status: 404 });

    const current = (data as { viewCount?: number | null })?.viewCount ?? 0;
    const next = current + 1;

    await supabaseAdmin
      .from("ProposalPost")
      .update({ viewCount: next })
      .eq("id", id);

    return NextResponse.json({ ok: true, viewCount: next });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
