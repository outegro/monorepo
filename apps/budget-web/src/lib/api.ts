"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Currency } from "./fx";
import type { BaseItem, FxState, MonthWithItems } from "./types";

async function bfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/budget${path}`, {
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

// ───── Months ─────

export function useMonths() {
  return useQuery({ queryKey: ["months"], queryFn: () => bfetch<MonthWithItems[]>("/months") });
}

export function useCreateMonths() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      year?: number;
      month?: number;
      label?: string;
      startingBalance?: number;
      useBaseExpenses?: boolean;
      useBaseIncomes?: boolean;
      count?: number;
    }) => bfetch<{ created: string[] }>("/months", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useUpdateMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; notes?: string | null; isClosed?: boolean }) =>
      bfetch(`/months/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useDeleteMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bfetch(`/months/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

// ───── Expenses / incomes ─────

export interface LineInput {
  name: string;
  amount: number;
  currency: Currency;
  category?: string;
  group?: string;
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ monthId, ...input }: LineInput & { monthId: string }) =>
      bfetch(`/months/${monthId}/expenses`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: "planned" | "paid" }) =>
      bfetch(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bfetch(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ monthId, ...input }: LineInput & { monthId: string }) =>
      bfetch(`/months/${monthId}/incomes`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bfetch(`/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

// ───── Cumulative caps ─────

export function useSetCumulativeSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      monthId,
      baseExpenseId,
      spent,
    }: {
      monthId: string;
      baseExpenseId: string;
      spent: number;
    }) =>
      bfetch(`/months/${monthId}/cumulative`, {
        method: "PUT",
        body: JSON.stringify({ baseExpenseId, spent }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["months"] }),
  });
}

// ───── Base templates ─────

export function useBaseExpenses() {
  return useQuery({
    queryKey: ["base-expenses"],
    queryFn: () => bfetch<BaseItem[]>("/base/expenses"),
  });
}

export function useCreateBaseExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LineInput & { isCumulative?: boolean }) =>
      bfetch("/base/expenses", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["base-expenses"] }),
  });
}

export function useDeleteBaseExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bfetch(`/base/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["base-expenses"] }),
  });
}

export function useBaseIncomes() {
  return useQuery({
    queryKey: ["base-incomes"],
    queryFn: () => bfetch<BaseItem[]>("/base/incomes"),
  });
}

export function useCreateBaseIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LineInput) =>
      bfetch("/base/incomes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["base-incomes"] }),
  });
}

export function useDeleteBaseIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bfetch(`/base/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["base-incomes"] }),
  });
}

// ───── Settings + FX ─────

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => bfetch<{ initialBalance: number }>("/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { initialBalance: number }) =>
      bfetch("/settings", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["months"] });
    },
  });
}

export function useFx() {
  return useQuery({ queryKey: ["fx"], queryFn: () => bfetch<FxState>("/fx") });
}

export function useRefreshFx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bfetch<FxState>("/fx/refresh", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fx"] });
      qc.invalidateQueries({ queryKey: ["months"] });
    },
  });
}
