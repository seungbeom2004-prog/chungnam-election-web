export interface Candidate {
  id: string;
  email: string;
  name: string;
  district: string;
  profileImage: string | null;
  slogan: string | null;
  bio: string | null;
  phone: string | null;
  party: string;
  role: string;
  verified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  pledges?: Pledge[];
}

export interface Pledge {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  visible: boolean;
  candidateId: string;
  categoryId: string | null;
  candidate?: Candidate;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  id: string;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
  visible: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MapState {
  center: { lat: number; lng: number };
  zoomLevel: number;
  selectedDistrict: string | null;
  selectedPledge: Pledge | null;
  isPanelOpen: boolean;
  setCenter: (lat: number, lng: number) => void;
  setZoomLevel: (level: number) => void;
  setSelectedDistrict: (district: string | null) => void;
  setSelectedPledge: (pledge: Pledge | null) => void;
  setIsPanelOpen: (open: boolean) => void;
  reset: () => void;
}
