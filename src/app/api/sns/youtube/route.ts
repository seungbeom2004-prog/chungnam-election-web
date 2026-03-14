import { NextRequest, NextResponse } from "next/server";

/** Extract YouTube channel ID (UCxxx) from various URL formats. */
function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_.-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
  channelName: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("url");
  if (!channelUrl) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const handle = extractChannelId(channelUrl);
  if (!handle) {
    return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
  }

  // If the handle starts with "UC" (22 chars), it's a channel ID
  const isChannelId = /^UC[a-zA-Z0-9_-]{22}$/.test(handle);

  if (!isChannelId) {
    // For @handle or /user/ or /c/ without a channel ID, we can't fetch RSS
    // without the YouTube Data API. Return empty so client shows a link card.
    return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
  }

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${handle}`;
    const res = await fetch(rssUrl, {
      next: { revalidate: 3600 }, // cache for 1 hour
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
    }

    const xml = await res.text();

    // Parse the Atom feed manually (no xml parser dependency needed)
    const entries: YouTubeVideo[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
      const title = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const channelName = xml.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";

      if (videoId) {
        entries.push({
          id: videoId,
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'),
          published,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          channelName,
        });
      }
      if (entries.length >= 9) break;
    }

    return NextResponse.json({ videos: entries, channelUrl }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/sns/youtube]", err);
    return NextResponse.json({ videos: [], channelUrl }, { status: 200 });
  }
}
