import { NextRequest, NextResponse } from "next/server";

export interface YouTubeVideo {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
  channelName: string;
}

/** Return the UC-style channel ID if the URL already contains one. */
function extractDirectChannelId(url: string): string | null {
  const m = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  return m ? m[1] : null;
}

/**
 * Resolve any YouTube channel URL to a UCxxx channel ID.
 * Handles /channel/UCxxx (direct), /@handle, /user/xxx, /c/xxx.
 * Falls back to null if resolution fails.
 */
async function resolveChannelId(channelUrl: string): Promise<string | null> {
  // Fast path: URL already contains a channel ID
  const direct = extractDirectChannelId(channelUrl);
  if (direct) return direct;

  // Normalise the URL
  let fetchUrl = channelUrl.trim();
  if (!fetchUrl.startsWith("http")) fetchUrl = "https://" + fetchUrl;
  // Ensure it's a YouTube URL
  if (!fetchUrl.includes("youtube.com")) return null;

  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      next: { revalidate: 86400 }, // cache for 24 hours
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Strategy 1: <link rel="canonical" href="https://www.youtube.com/channel/UCxxx">
    const canonicalMatch = html.match(/rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (canonicalMatch) return canonicalMatch[1];

    // Strategy 2: "channelId":"UCxxx"
    const channelIdMatch = html.match(/"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/);
    if (channelIdMatch) return channelIdMatch[1];

    // Strategy 3: /channel/UCxxx in href
    const hrefMatch = html.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (hrefMatch) return hrefMatch[1];

    return null;
  } catch {
    return null;
  }
}

async function fetchVideosFromChannelId(channelId: string, channelUrl: string): Promise<YouTubeVideo[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(rssUrl, {
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const entries: YouTubeVideo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  // Channel name is the first <title> in the feed (before any entry)
  const channelName = xml.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";

    if (videoId) {
      entries.push({
        id: videoId,
        title: title
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
        published,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: channelName
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">"),
      });
    }
    if (entries.length >= 9) break;
  }
  return entries;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("url");
  if (!channelUrl) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
    }

    const videos = await fetchVideosFromChannelId(channelId, channelUrl);
    return NextResponse.json({ videos, channelUrl, channelId }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/sns/youtube]", err);
    return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
  }
}
