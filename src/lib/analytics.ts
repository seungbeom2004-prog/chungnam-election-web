/**
 * Analytics event tracking utility.
 * - Vercel Analytics: uses @vercel/analytics/react (auto-tracks via <Analytics />)
 * - GA4: uses window.gtag if NEXT_PUBLIC_GA_ID is set
 *
 * Call trackEvent() from client components for custom events.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
  }
}

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/** Send a custom event to GA4 (and any other configured analytics). */
export function trackEvent(eventName: string, params?: EventParams) {
  try {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, params);
    }
  } catch {
    // Silently ignore analytics errors
  }
}

// ── Typed event helpers ────────────────────────────────────────────────────

/** User clicked on a pledge marker or card */
export const trackPledgeClick = (pledgeId: string, pledgeTitle: string) =>
  trackEvent("pledge_click", { pledge_id: pledgeId, pledge_title: pledgeTitle });

/** User liked a pledge */
export const trackPledgeLike = (pledgeId: string, liked: boolean) =>
  trackEvent("pledge_like", { pledge_id: pledgeId, action: liked ? "like" : "unlike" });

/** User submitted a proposal/complaint */
export const trackProposalSubmit = (postType: "민원" | "제안", city?: string) =>
  trackEvent("proposal_submit", { post_type: postType, city: city ?? "unknown" });

/** User clicked share (kakao/copy/qr) */
export const trackShareClick = (method: "kakao" | "copy" | "qr", contentType: "pledge" | "proposal") =>
  trackEvent("share_click", { method, content_type: contentType });

/** User switched theme */
export const trackThemeSwitch = (theme: "regular" | "cute") =>
  trackEvent("theme_switch", { theme });

/** User changed region/city */
export const trackRegionChange = (city: string) =>
  trackEvent("region_change", { city });
