"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

const MAP_ROUTES = ["/", "/regular", "/cute"];

export function NavbarConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}

export function FooterConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  return <Footer />;
}

/** Persistent mobile bottom nav on all non-map pages. */
export function MobileBottomNavConditional() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  return <MobileBottomNav />;
}

/**
 * Spacer that adds bottom padding on mobile for non-map pages,
 * so content doesn't hide behind the fixed bottom nav.
 */
export function MobileContentSpacer() {
  const pathname = usePathname();
  if (MAP_ROUTES.includes(pathname)) return null;
  return <div className="md:hidden h-14" aria-hidden="true" />;
}
