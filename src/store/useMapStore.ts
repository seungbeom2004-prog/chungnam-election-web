import { create } from "zustand";
import type { MapState } from "@/types";

// Default: 천안시 center — matches the hardcoded DEFAULT_DISTRICT in NaverMap.tsx
// so the map starts at the designated spot immediately (no visible "jump").
const CHUNGNAM_CENTER = { lat: 36.8151, lng: 127.1139 };

// storeLevel 6 → naverZoom 15 → approx. 3 km height on a typical monitor.
const DEFAULT_ZOOM = 6;

export const useMapStore = create<MapState>((set) => ({
  center: CHUNGNAM_CENTER,
  zoomLevel: DEFAULT_ZOOM,
  selectedDistrict: null,
  selectedPledge: null,
  isPanelOpen: false,

  setCenter: (lat, lng) => set({ center: { lat, lng } }),
  setZoomLevel: (level) => set({ zoomLevel: level }),
  setSelectedDistrict: (district) => set({ selectedDistrict: district }),
  setSelectedPledge: (pledge) =>
    set({ selectedPledge: pledge, isPanelOpen: pledge !== null }),
  setIsPanelOpen: (open) =>
    set({ isPanelOpen: open, selectedPledge: open ? undefined : null }),
  reset: () =>
    set({
      center: CHUNGNAM_CENTER,
      zoomLevel: DEFAULT_ZOOM,
      selectedDistrict: null,
      selectedPledge: null,
      isPanelOpen: false,
    }),
}));
