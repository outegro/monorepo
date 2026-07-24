"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntakeReview, LoreEntry, LoreStatus } from "./types";

async function ifetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/itmaxxing${path}`, {
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

export function useLoreStatus() {
  return useQuery({ queryKey: ["lore-status"], queryFn: () => ifetch<LoreStatus>("/lore/status") });
}

export function useLoreEntries() {
  return useQuery({
    queryKey: ["lore-entries"],
    queryFn: () => ifetch<LoreEntry[]>("/lore/entries"),
  });
}

/** Step 2: freeform → improved text + red flags. */
export function useReviewIntake() {
  return useMutation({
    mutationFn: (text: string) =>
      ifetch<IntakeReview>("/lore/intake", { method: "POST", body: JSON.stringify({ text }) }),
  });
}

/** Step 3: accepted text → structured lore entries (persisted). */
export function useStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      ifetch<{ entries: unknown[] }>("/lore/structure", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lore-entries"] }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ifetch(`/lore/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lore-entries"] }),
  });
}
