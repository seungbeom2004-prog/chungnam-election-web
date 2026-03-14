import crypto from "crypto";
import { NextResponse } from "next/server";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "reform-captcha-2024";

/** Returns current 5-minute time window (changes every 5 min). */
function timeWindow() {
  return Math.floor(Date.now() / (5 * 60 * 1000));
}

/** HMAC-sign the expected answer so server can verify without storing state. */
export function makeCaptchaToken(answer: number, tw: number): string {
  return crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${answer}:${tw}`)
    .digest("hex")
    .slice(0, 24);
}

/** Verify token against user's answer, accepting current + previous window. */
export function verifyCaptchaToken(token: string, answer: string): boolean {
  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 2 || num > 18) return false;
  const tw = timeWindow();
  for (const w of [tw, tw - 1]) {
    if (makeCaptchaToken(num, w) === token) return true;
  }
  return false;
}

/** GET /api/captcha — Issue a fresh math CAPTCHA challenge. */
export async function GET() {
  const a = Math.floor(Math.random() * 9) + 1; // 1–9
  const b = Math.floor(Math.random() * 9) + 1; // 1–9
  const answer = a + b;
  const token = makeCaptchaToken(answer, timeWindow());
  return NextResponse.json({ token, question: `${a} + ${b} = ?` });
}
