import FeedPlainText from "@/components/feed/FeedPlainText";

export const dynamic = "force-dynamic";

export default function DashboardFeedPage() {
  return <FeedPlainText adminMode={false} />;
}
