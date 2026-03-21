import { NextResponse } from "next/server";
import { categorizeProposal } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const category = await categorizeProposal(content);
    return NextResponse.json({ category });
  } catch (err) {
    console.error("[AI/categorize] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
