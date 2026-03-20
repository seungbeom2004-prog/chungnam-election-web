"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

/** Routes that manage their own full-screen layout (no global nav/footer). */
const MAP_ROUTES = ["/", "/regular", "/cute"];

/** Routes that are completely plain (no navbar, no footer). */
const PLAIN_ROUTES = ["/login"];

export function NavbarConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  if (PLAIN_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

export function FooterConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  if (PLAIN_ROUTES.includes(pathname)) return null;
  return <Footer />;
}

/** Persistent mobile bottom nav on all non-map, non-plain, non-dashboard pages. */
export function MobileBottomNavConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  if (PLAIN_ROUTES.includes(pathname)) return null;
  // Dashboard and admin have their own mobile tab bar (DashboardSidebar)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;
  return <MobileBottomNav />;
}

/**
 * Spacer that adds bottom padding on mobile for non-map pages,
 * so content doesn't hide behind the fixed bottom nav.
 */
export function MobileContentSpacer() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  if (PLAIN_ROUTES.includes(pathname)) return null;
  // Dashboard manages its own bottom padding (pb-20 in layout.tsx)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;
  return <div className="md:hidden h-14" aria-hidden="true" />;
}

/**
 * Wraps content with left padding on desktop to offset the fixed left rail.
 * Map pages, dashboard, and plain pages manage their own layout.
 */
export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const needsOffset =
    !MAP_ROUTES.includes(pathname) &&
    !PLAIN_ROUTES.includes(pathname) &&
    !pathname.startsWith("/dashboard");

  if (!needsOffset) return <>{children}</>;
  return <div className="md:pl-20">{children}</div>;
}
