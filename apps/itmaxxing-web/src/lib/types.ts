export type LoreEntryType = "role" | "project" | "achievement" | "skill" | "education" | "note";

export interface Metric {
  label: string;
  value: string;
}

export interface LoreEntry {
  id: string;
  type: LoreEntryType;
  title: string;
  org: string | null;
  startDate: string | null;
  endDate: string | null;
  body: string;
  metrics: Metric[];
  tags: string[];
  order: number;
}

export interface RedFlag {
  issue: string;
  where: string;
  why: string;
  fix: string;
}

export interface IntakeReview {
  improved: string;
  redFlags: RedFlag[];
  summary: string;
}

export interface LoreStatus {
  llmEnabled: boolean;
  model: string;
}
