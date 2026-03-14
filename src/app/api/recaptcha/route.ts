import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) return NextResponse.json({ success: false }, { status: 400 });

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ success: true }); // dev fallback

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secretKey}&response=${token}`,
  });
  const data = await res.json();
  return NextResponse.json({ success: data.success });
}
