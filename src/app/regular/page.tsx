"use client";

import { useEffect, Suspense } from "react";
import MapPageContent from "@/components/map/MapPageContent";
import CuteInviteBox from "@/components/theme/CuteInviteBox";
import { useTheme } from "@/contexts/ThemeContext";

export default function RegularPage() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("regular");
  }, [setTheme]);

  return (
    <>
      <Suspense>
        <MapPageContent />
      </Suspense>
      <CuteInviteBox />
    </>
  );
}
