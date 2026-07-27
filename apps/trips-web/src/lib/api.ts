"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BatchResult, Candidate, CategoryGroup, Place, Reel } from "./types";

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
  return useQuery({ queryKey: ["queue"], queryFn: () => tfetch<Reel[]>("/reels/queue") });
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
    mutationFn: (text: string) =>
      tfetch<BatchResult>("/reels/batch", { method: "POST", body: JSON.stringify({ text }) }),
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
    mutationFn: (id: string) => tfetch<Reel>(`/reels/${id}`, { method: "DELETE" }),
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
