import { create } from "zustand";
import type { MapState, BylawGroup } from "@/types";

const CHUNGNAM_CENTER = { lat: 36.81333, lng: 127.133274 };
const DEFAULT_ZOOM = 6;

export type ExtendedMapState = MapState & {
  selectedBylawGroup: BylawGroup | null;
  isBylawPanelOpen: boolean;
  setSelectedBylawGroup: (group: BylawGroup | null) => void;
  setIsBylawPanelOpen: (open: boolean) => void;
};

export const useMapStore = create<ExtendedMapState>((set) => ({
  center: CHUNGNAM_CENTER,
  zoomLevel: DEFAULT_ZOOM,
  selectedDistrict: null,
  selectedPledge: null,
  isPanelOpen: false,
  selectedBylawGroup: null,
  isBylawPanelOpen: false,

  setCenter: (lat, lng) => set({ center: { lat, lng } }),
  setZoomLevel: (level) => set({ zoomLevel: level }),
  setSelectedDistrict: (district) => set({ selectedDistrict: district }),
  setSelectedPledge: (pledge) =>
    set({ selectedPledge: pledge, isPanelOpen: pledge !== null, selectedBylawGroup: null, isBylawPanelOpen: false }),
  setIsPanelOpen: (open) =>
    set({ isPanelOpen: open, selectedPledge: open ? undefined : null }),
  setSelectedBylawGroup: (group) =>
    set({ selectedBylawGroup: group, isBylawPanelOpen: group !== null, selectedPledge: null, isPanelOpen: false }),
  setIsBylawPanelOpen: (open) =>
    set({ isBylawPanelOpen: open, selectedBylawGroup: open ? undefined : null }),
  reset: () =>
    set({
      center: CHUNGNAM_CENTER,
      zoomLevel: DEFAULT_ZOOM,
      selectedDistrict: null,
      selectedPledge: null,
      isPanelOpen: false,
      selectedBylawGroup: null,
      isBylawPanelOpen: false,
    }),
}));
