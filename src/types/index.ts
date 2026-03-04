export interface Candidate {
  id: string;
  email: string;
  name: string;
  district: string;
  handle: string | null;
  profileImage: string | null;
  slogan: string | null;
  bio: string | null;
  phone: string | null;
  party: string;
  role: string;
  verified: boolean;
  emailVerified: boolean;
  electionId: string | null;
  election?: Election | null;
  candidateStatus: string; // '출마예정자' | '예비후보자' | '후보자'
  caucusStatus: string;    // '공천 미확정' | '공천 확정'
  createdAt: string;
  updatedAt: string;
  pledges?: Pledge[];
}

export interface Election {
  id: string;
  name: string;
  type: string;
  description: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  collaborators?: PledgeCollaboration[];
  createdAt: string;
  updatedAt: string;
}

export interface PledgeCollaboration {
  id: string;
  pledgeId: string;
  candidateId: string;
  candidate?: Pick<Candidate, 'id' | 'name' | 'district' | 'profileImage'>;
  createdAt: string;
}

export interface Schedule {
  id: string;
  candidateId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  isPublic: boolean;
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
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string;
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
