import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/proposals/batch
 * Body: { ids: string[], action: "hide" | "restore" | "delete" }
 *
 * Applies the same action to all given proposal IDs in a single DB call.
 * Returns { success: true, updated: number }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids, action } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const validIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid ids" }, { status: 400 });
  }

  // Safety cap
  if (validIds.length > 200) {
    return NextResponse.json({ error: "Too many ids (max 200)" }, { status: 400 });
  }

  let updateData: Record<string, unknown> | null = null;

  switch (action) {
    case "hide":
      updateData = { status: "hidden" };
      break;
    case "restore":
      updateData = { status: "pending" };
      break;
    case "delete":
      updateData = { status: "deleted" };
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const { error, count } = await supabaseAdmin
      .from("ProposalPost")
      .update(updateData!)
      .in("id", validIds);

    if (error) {
      console.error("[batch] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: count ?? validIds.length });
  } catch (err) {
    console.error("[batch] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
