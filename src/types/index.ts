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
  youtube: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  tiktok: string | null;
  kakao: string | null;
  naverBlog: string | null;
  donationUrl?: string | null;
  articleUrl: string | null;
  articleTitle: string | null;
  party: string;
  role: string;
  verified: boolean;
  emailVerified: boolean;
  electionId: string | null;
  electionType: string | null;
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

export interface RelatedLink {
  url: string;
  title: string;
  /** "youtube" | "instagram" | "facebook" | "news" | "other" */
  type?: string;
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
  youtubeUrl?: string | null;
  visible: boolean;
  pledgeType: "map" | "bylaws";
  /** True when a map pledge is also tagged as bylaw-related (shows in bylaw list too). */
  bylawTagged?: boolean;
  /** ID of a related pledge (links a map pledge ↔ bylaw pledge). */
  relatedPledgeId?: string | null;
  /** 배경/필요성 */
  background?: string | null;
  /** 실행 방안 */
  plan?: string | null;
  /** 기대 효과 */
  expectedEffect?: string | null;
  /** 관련 링크 */
  relatedLinks?: RelatedLink[] | null;
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
  iconImage: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalResponse {
  id: string;
  proposalId: string | null;
  pledgeProposalId?: string | null;
  candidateId: string;
  candidateName: string;
  candidateProfileImage: string | null;
  /** "접수됨" | "검토 중" | "공약 반영 예정" | "공약 반영 완료" | "반영 불가" */
  status: string;
  content: string;
  pledgeId: string | null;
  createdAt: string;
}

export interface ProposalPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  city?: string | null;
  candidateId?: string | null;
  ipHash: string;
  status: string;
  acceptedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  likeCount?: number;
  postType?: string;  // "민원" | "제안"
  hasLiked?: boolean;
  authorType?: string | null;
  candidate?: { id: string; name: string; district: string; profileImage?: string | null } | null;
  responses?: ProposalResponse[];
}

export interface PledgeLike {
  id: string;
  pledgeId: string;
  ipHash: string;
  createdAt: string;
}

export interface PledgeComment {
  id: string;
  pledgeId: string;
  content: string;
  authorName: string;
  ipHash: string;
  status: string;
  deletedAt?: string | null;
  createdAt: string;
  candidateId?: string | null; // present when comment was posted by a logged-in candidate
}

export interface CandidateLike {
  id: string;
  candidateId: string;
  ipHash: string;
  createdAt: string;
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
  selectedBylawGroup: BylawGroup | null;
  isBylawPanelOpen: boolean;
  setSelectedBylawGroup: (group: BylawGroup | null) => void;
  setIsBylawPanelOpen: (open: boolean) => void;
}

export interface BylawGroup {
  /** City name, e.g. "천안시" */
  cityName: string;
  councilLat: number;
  councilLng: number;
  /** All bylaw (+ bylawTagged) pledges in this city, from any candidate. */
  pledges: Pledge[];
}

export interface PledgeProposalRevision {
  id: string;
  pledgeProposalId: string;
  revisionNumber: number;
  title: string;
  content: string;
  authorName: string;
  authorType: "visitor" | "candidate";
  candidateId: string | null;
  commitMessage: string | null;
  createdAt: string;
}

export interface PledgeProposalComment {
  id: string;
  pledgeProposalId: string;
  content: string;
  authorName: string;
  authorType: "visitor" | "candidate";
  candidateId: string | null;
  status: "visible" | "deleted";
  createdAt: string;
}

export interface PledgeProposal {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorType: "visitor" | "candidate";
  candidateId: string | null;
  ipHash: string | null;
  status: string;
  createdAt: string;
  mergedAt?: string | null;
  mergedBy?: string | null;
  mergedPledgeId?: string | null;
  revisionCount?: number;
  latestRevision?: PledgeProposalRevision | null;
  minwonLinks?: { minwonId: string }[];
  candidate?: { id: string; name: string; district: string } | null;
}
