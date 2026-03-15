"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
