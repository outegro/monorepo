"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BatchResult,
  Candidate,
  CategoryGroup,
  Place,
  PlaceDetail,
  Reel,
  Trip,
  TripItem,
} from "./types";

async function tfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/trips${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.code ?? `request_failed_${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: () => tfetch<Reel[]>("/reels/queue"),
    // Submitting kicks processing off in the background, so the list has to come back on its
    // own. Polling stops the moment nothing is PENDING — there is nothing to wait for then.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => r.status === "PENDING") ? 4000 : false,
  });
}

export function useCounts() {
  return useQuery({
    queryKey: ["counts"],
    queryFn: () => tfetch<Record<string, number>>("/reels/counts"),
  });
}

export function usePlaces() {
  return useQuery({ queryKey: ["places"], queryFn: () => tfetch<Place[]>("/places") });
}

export function useSubmitBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { reels: { url: string; note?: string }[] }) =>
      tfetch<BatchResult>("/reels/batch", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
  });
}

/** Runs extraction + Kakao search over the pending backlog, a chunk at a time. */
export function useProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tfetch<{ processed: number }>("/reels/process", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; note: string | null }) =>
      tfetch<Reel>(`/reels/${v.id}/note`, {
        method: "PATCH",
        body: JSON.stringify({ note: v.note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
  });
}

export function useResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; q: string; categoryGroup?: CategoryGroup }) => {
      const params = new URLSearchParams({ q: v.q });
      if (v.categoryGroup) params.set("categoryGroup", v.categoryGroup);
      return tfetch<Candidate[]>(`/reels/${v.id}/research?${params}`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
  });
}

export function useConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; candidateIndex: number; day?: number | null }) =>
      tfetch<Place>(`/reels/${v.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ candidateIndex: v.candidateIndex, day: v.day ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
      qc.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function useSkip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tfetch<Reel>(`/reels/${id}/skip`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
  });
}

export function useUpdatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; day?: number | null; priceNote?: string | null }) =>
      tfetch<Place>(`/places/${v.id}`, { method: "PATCH", body: JSON.stringify(v) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places"] }),
  });
}

export function useDeletePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tfetch<{ ok: true }>(`/places/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

// ── trip plan ────────────────────────────────────────────────────────────────

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => tfetch<Trip[]>("/trips") });
}

export function useTrip(tripId: string | null) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => tfetch<Trip>(`/trips/${tripId}`),
    enabled: Boolean(tripId),
  });
}

export function useImportKorea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) =>
      tfetch<Trip>("/trips/import/korea-2026", {
        method: "POST",
        body: JSON.stringify({ label }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useJoinTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { inviteCode: string; label?: string }) =>
      tfetch<Trip>("/trips/join", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useVote(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: string; value: number }) =>
      tfetch<{ ok: true }>(`/trips/${tripId}/items/${input.itemId}/vote`, {
        method: "POST",
        body: JSON.stringify({ value: input.value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

export function useChooseOption(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      tfetch<{ ok: true }>(`/trips/${tripId}/items/${itemId}/choose`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

export function useAttachPlace(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dayId: string; placeId: string }) =>
      tfetch<TripItem>(`/trips/${tripId}/days/${input.dayId}/places`, {
        method: "POST",
        body: JSON.stringify({ placeId: input.placeId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

/**
 * Playable URLs for one reel, fetched only when the card is opened. Instagram signs these and
 * expires them within hours, so they are never stored — resolving fresh is both simpler and
 * more reliable than keeping a copy that rots.
 */
export function useReelMedia(reelId: string | null) {
  return useQuery({
    queryKey: ["reel-media", reelId],
    queryFn: () =>
      tfetch<{ videoUrl: string | null; thumbnail: string | null }>(`/reels/${reelId}/media`),
    enabled: Boolean(reelId),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useDeleteReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tfetch<{ ok: true }>(`/reels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function usePlace(id: string | null) {
  return useQuery({
    queryKey: ["place", id],
    queryFn: () => tfetch<PlaceDetail>(`/places/${id}`),
    enabled: Boolean(id),
  });
}
