/** Mirrors trips-backend's contracts. Hand-written on purpose — one small, stable surface. */

export type ReelStatus =
  | "PENDING"
  | "EXTRACTED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "SKIPPED"
  | "FAILED";

export type CategoryGroup = "FD6" | "CE7" | "AT4" | "CT1" | "AD5";

export interface Extraction {
  query?: string;
  categoryGroup?: CategoryGroup;
  district?: string;
  priceHint?: string;
  keywords?: string[];
}

export interface Candidate {
  kakaoId: string;
  name: string;
  categoryGroup: string | null;
  categoryName: string | null;
  address: string | null;
  roadAddress: string | null;
  phone: string | null;
  kakaoUrl: string | null;
  lat: number;
  lng: number;
}

export interface Reel {
  id: string;
  url: string;
  shortcode: string;
  note: string | null;
  status: ReelStatus;
  extracted: Extraction | null;
  candidates: Candidate[] | null;
  error: string | null;
  createdAt: string;
}

export interface Place {
  id: string;
  reelId: string;
  kakaoId: string;
  name: string;
  categoryGroup: string | null;
  categoryName: string | null;
  address: string | null;
  roadAddress: string | null;
  phone: string | null;
  kakaoUrl: string | null;
  lat: number;
  lng: number;
  priceNote: string | null;
  tags: string[];
  day: number | null;
  orderInDay: number | null;
  reel: { url: string; note: string | null };
}

export interface BatchResult {
  created: number;
  duplicates: number;
  invalid: string[];
}

// ── trip plan ────────────────────────────────────────────────────────────────

export interface TripMember {
  userId: string;
  label: string | null;
  role: "OWNER" | "MEMBER";
}

export interface TripVote {
  itemId: string;
  userId: string;
  value: number;
}

export interface TripItem {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  title: string;
  titleKr: string | null;
  details: string | null;
  address: string | null;
  addressKr: string | null;
  lat: number | null;
  lng: number | null;
  cost: string | null;
  bookingUrl: string | null;
  /** Items sharing a group are alternatives the team picks between, not a sequence. */
  optionGroup: string | null;
  optionLabel: string | null;
  chosen: boolean;
  placeId: string | null;
  place: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    kind: "SPOT" | "ROUTE";
    categoryGroup: string | null;
    kakaoUrl: string | null;
  } | null;
  votes: TripVote[];
}

export interface TripDay {
  id: string;
  date: string;
  title: string | null;
  city: string | null;
  items: TripItem[];
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseName: string | null;
  baseAddress: string | null;
  inviteCode: string;
  members: TripMember[];
  days: TripDay[];
}
