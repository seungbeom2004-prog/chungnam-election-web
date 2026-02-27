import { create } from "zustand";
import type { MapState } from "@/types";

// Center of Chungcheongnam-do
const CHUNGNAM_CENTER = { lat: 36.5184, lng: 126.8 };
const DEFAULT_ZOOM = 9;

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
