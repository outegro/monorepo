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
