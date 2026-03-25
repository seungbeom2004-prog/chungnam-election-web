export default function DailyStatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 pb-12">
        {children}
      </div>
    </div>
  );
}
