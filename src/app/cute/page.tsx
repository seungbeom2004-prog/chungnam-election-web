"use client";

import { useEffect } from "react";
import MapPageContent from "@/components/map/MapPageContent";
import CuteMascot from "@/components/theme/CuteMascot";
import { useTheme } from "@/contexts/ThemeContext";

export default function CutePage() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("cute");
  }, [setTheme]);

  return (
    <>
      <MapPageContent />
      <CuteMascot />
    </>
  );
}
