"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import AlertSidebar from "@/components/dashboard/AlertSidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <ThemeProvider initialTheme="regular">
      {/* On mobile: offset top by 3rem (mobile sticky header h-12).
          On desktop: the Navbar is a fixed left rail (w-20), no top bar.
          pl-20 offsets the main content past the fixed left rail. */}
      <div className="flex h-[calc(100vh-3rem)] md:h-screen md:pl-20 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto min-w-0">
          {children}
        </div>
        <AlertSidebar role="candidate" />
      </div>
    </ThemeProvider>
  );
}
