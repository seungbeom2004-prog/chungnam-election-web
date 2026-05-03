import FeedPlainText from "@/components/feed/FeedPlainText";

export const dynamic = "force-dynamic";

export default function AdminFeedPage() {
  return <FeedPlainText adminMode={true} />;
}
