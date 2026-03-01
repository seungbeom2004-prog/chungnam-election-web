# 개혁 충남 홈페이지 구현 계획

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Pretendard font
- Kakao Maps API via react-kakao-maps-sdk
- Zustand (state management)
- Prisma + SQLite (database)
- NextAuth.js (credentials auth)
- npm (package manager)

---

## Phase 1: Project Scaffolding & Design System

### 1.1 Initialize Project
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- Install dependencies: prisma, @prisma/client, next-auth, zustand, react-kakao-maps-sdk, bcryptjs
- Configure .env.local with placeholders (KAKAO_MAP_KEY, NEXTAUTH_SECRET, DATABASE_URL)

### 1.2 Design System (tailwind.config.ts + globals.css)
- Colors: primary (#FF5A00), secondary (navy/black), background (#F8F9FA)
- Pretendard font via CDN
- Reusable UI components: Button, Input, Card, Modal, Badge

### 1.3 Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout (Navbar, Pretendard font)
│   ├── page.tsx                # Homepage - Public Map View
│   ├── globals.css
│   ├── candidates/[id]/
│   │   └── page.tsx            # Candidate Profile Page
│   ├── login/
│   │   └── page.tsx            # Candidate Login Page
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Dashboard home (redirect to pledges)
│   │   ├── profile/page.tsx    # My Profile
│   │   ├── pledges/page.tsx    # Manage Pledges + Map Editor
│   │   └── settings/page.tsx   # Account Settings
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── candidates/route.ts
│       ├── candidates/[id]/route.ts
│       ├── pledges/route.ts
│       ├── pledges/[id]/route.ts
│       └── upload/route.ts
├── components/
│   ├── ui/                     # Button, Input, Card, Modal, Badge
│   ├── layout/                 # Navbar, DashboardSidebar, Footer
│   ├── map/                    # KakaoMap, MapPin, DistrictOverlay, PledgePanel
│   ├── candidate/              # CandidateHero, PledgeCard, ViewToggle
│   └── dashboard/              # PledgeList, MapEditor, PledgeForm
├── lib/
│   ├── prisma.ts               # Prisma singleton
│   ├── auth.ts                 # NextAuth config
│   └── districts.ts            # Chungnam GeoJSON data
├── store/
│   └── useMapStore.ts          # Zustand: zoom, center, selectedPledge
└── types/
    └── index.ts
prisma/
├── schema.prisma
└── seed.ts                     # Seed districts + demo candidate
public/
├── images/
│   └── logo.svg                # Reform Party logo placeholder
└── data/
    └── chungnam-districts.json # GeoJSON boundaries
```

---

## Phase 2: Database Schema & Auth

### 2.1 Prisma Schema
```prisma
model Candidate {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  name         String
  district     String
  profileImage String?
  slogan       String?
  bio          String?
  phone        String?
  party        String   @default("개혁")
  verified     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  pledges      Pledge[]
}

model Pledge {
  id          String   @id @default(cuid())
  title       String
  description String
  budget      String?
  imageUrl    String?
  latitude    Float
  longitude   Float
  address     String?
  visible     Boolean  @default(true)
  candidateId String
  candidate   Candidate @relation(fields: [candidateId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model District {
  id       String @id @default(cuid())
  name     String
  code     String @unique
  centerLat Float
  centerLng Float
}
```

### 2.2 NextAuth.js Setup
- Credentials provider: email + password
- bcryptjs for password hashing
- Session includes candidateId, name, district
- Middleware protects /dashboard/* routes

---

## Phase 3: Core UI Components

### 3.1 Shared UI (src/components/ui/)
- Button (primary orange, secondary dark, ghost, sizes)
- Input (text, search, textarea)
- Card (soft shadow, rounded-xl)
- Modal (overlay + centered content)
- Badge (district labels)

### 3.2 Layout Components
- Navbar: sticky, logo, search bar, login/dashboard button
- DashboardSidebar: vertical nav with icons
- Footer: minimal copyright

---

## Phase 4: Public Map View (Homepage)

### 4.1 Kakao Map Integration
- Load Kakao Maps SDK via Script component
- react-kakao-maps-sdk for React integration
- Zustand store: mapCenter, zoomLevel, selectedDistrict, selectedPledge

### 4.2 District Polygons
- GeoJSON for Chungnam's 15 시/군 boundaries
- Polygon overlays with hover highlight effect
- Tooltip on hover: district name + candidate name/photo

### 4.3 Pledge Pins
- Custom orange markers at zoom level > threshold
- Clustering when zoomed out
- Pin click → opens PledgePanel

### 4.4 PledgePanel (Bottom Sheet / Sidebar)
- Mobile: slides up from bottom (animated)
- Desktop: slides out from left side
- Content: pledge title, description, budget, image, link to candidate profile

### 4.5 Search
- Search input in Navbar: search by district name or dong
- Autocomplete dropdown with matching districts
- On select: pan map to district + zoom in

---

## Phase 5: Candidate Profile Page

### 5.1 Route: /candidates/[id]
- SSR with generateMetadata for SEO (OpenGraph tags for social sharing)
- Fetch candidate + pledges server-side

### 5.2 Components
- CandidateHero: profile photo, name, district, slogan, orange gradient background
- ViewToggle: tabs switching between List View and Map View
- PledgeCard: image, title, description snippet, date, budget badge
- Mini KakaoMap: locked to candidate's district, showing only their pins

---

## Phase 6: Candidate Dashboard

### 6.1 Auth Gate
- Middleware redirects unauthenticated users to /login
- Login page with email/password form

### 6.2 Dashboard Layout
- Sidebar: My Profile, Manage Pledges, Account Settings
- Responsive: sidebar collapses to top tabs on mobile

### 6.3 Profile Management (/dashboard/profile)
- Edit name, slogan, bio, profile image
- Display district (read-only, set by admin)

### 6.4 Pledge Management (/dashboard/pledges)
- Split view: Left pane = pledge list, Right pane = map editor
- Pledge list: cards with Edit/Delete/Hide toggle
- Map editor: interactive Kakao Map of candidate's district
- Click map → drop draft pin → floating PledgeForm appears
- PledgeForm: title, description, budget, image upload
- CRUD operations via API routes

### 6.5 Account Settings (/dashboard/settings)
- Change password
- Contact info

---

## Phase 7: API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/candidates | List all verified candidates |
| GET | /api/candidates/[id] | Get candidate + pledges |
| PUT | /api/candidates/[id] | Update own profile (auth) |
| GET | /api/pledges | List pledges (filterable by district/candidate) |
| POST | /api/pledges | Create pledge (auth) |
| PUT | /api/pledges/[id] | Update pledge (auth, own only) |
| DELETE | /api/pledges/[id] | Delete pledge (auth, own only) |
| POST | /api/upload | Image upload (returns URL) |

---

## Phase 8: Polish & Mobile Optimization

- Responsive breakpoints (mobile-first for voter pages, desktop-first for dashboard)
- Touch gestures for map (pinch-to-zoom)
- Loading skeletons for map and pledge cards
- Error boundaries
- Korean locale throughout (dates, numbers)
- Seed script with demo data for testing

---

## Implementation Order (Files Created Per Phase)

| Phase | Est. Files | Description |
|-------|-----------|-------------|
| 1 | ~12 | Project init, config, design system, UI components |
| 2 | ~5 | Prisma schema, seed, auth config, middleware |
| 3 | ~8 | Layout components, remaining UI pieces |
| 4 | ~8 | Homepage map, pins, panel, search, Zustand store |
| 5 | ~5 | Candidate profile page + components |
| 6 | ~8 | Dashboard pages, map editor, pledge form |
| 7 | ~7 | API routes |
| 8 | ~3 | Polish, loading states, error handling |
| **Total** | **~56 files** | |
