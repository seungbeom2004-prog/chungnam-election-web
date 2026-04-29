import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /qr/[code]
 *
 * QR 코드 단축 URL — DB에서 targetPath를 찾아 리다이렉트하면서 hit 수를 증가.
 * 매 스캔마다 hitCount += 1, 그리고 QrHit에 익명 기록.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const origin = new URL(req.url).origin;
  const fallbackUrl = origin + "/";

  if (!code || code.length > 64) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  const { data: qr } = await supabaseAdmin
    .from("QrCode")
    .select("id, targetPath, hitCount")
    .eq("code", code)
    .maybeSingle();

  if (!qr) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  // Fire-and-forget: increment hit count + log
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256").update(ip + (process.env.NEXTAUTH_SECRET ?? "salt")).digest("hex").slice(0, 16);
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const referrer = req.headers.get("referer")?.slice(0, 300) ?? null;

  // Increment counter
  void supabaseAdmin
    .from("QrCode")
    .update({ hitCount: (qr.hitCount ?? 0) + 1, updatedAt: new Date().toISOString() })
    .eq("id", qr.id)
    .then(() => {});

  // Log individual hit
  void supabaseAdmin
    .from("QrHit")
    .insert({
      qrId: qr.id,
      ipHash,
      userAgent,
      referrer,
      createdAt: new Date().toISOString(),
    })
    .then(() => {});

  // Build final URL — prepend origin so absolute redirect works
  let target = qr.targetPath;
  if (!target.startsWith("/")) target = "/" + target;
  // Append a marker so internal analytics can distinguish QR traffic from organic
  const sep = target.includes("?") ? "&" : "?";
  const finalUrl = origin + target + `${sep}qr=${encodeURIComponent(code)}`;

  return NextResponse.redirect(finalUrl, 302);
}
