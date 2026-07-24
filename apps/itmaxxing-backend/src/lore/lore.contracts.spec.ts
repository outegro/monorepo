import { describe, expect, it } from "vitest";
import {
  intakeReviewSchema,
  intakeSchema,
  structuredEntrySchema,
  structureResultSchema,
} from "./lore.contracts";

describe("intakeSchema", () => {
  it("rejects text shorter than 20 chars", () => {
    expect(intakeSchema.safeParse({ text: "too short" }).success).toBe(false);
  });

  it("rejects text longer than 20000 chars", () => {
    expect(intakeSchema.safeParse({ text: "a".repeat(20_001) }).success).toBe(false);
  });

  it("accepts text within bounds", () => {
    expect(intakeSchema.safeParse({ text: "a".repeat(50) }).success).toBe(true);
  });
});

describe("intakeReviewSchema (LLM output, defensive)", () => {
  it("defaults redFlags and summary when the model omits them", () => {
    const parsed = intakeReviewSchema.parse({ improved: "sharpened text" });
    expect(parsed).toEqual({ improved: "sharpened text", redFlags: [], summary: "" });
  });

  it("defaults missing redFlag sub-fields to empty strings rather than failing", () => {
    const parsed = intakeReviewSchema.parse({
      improved: "x",
      redFlags: [{ issue: "unexplained gap" }],
    });
    expect(parsed.redFlags[0]).toEqual({ issue: "unexplained gap", where: "", why: "", fix: "" });
  });
});

describe("structuredEntrySchema (LLM output, defensive)", () => {
  it("falls back to 'note' when the model invents a type outside the enum", () => {
    const parsed = structuredEntrySchema.parse({ type: "internship", title: "Acme intern" });
    expect(parsed.type).toBe("note");
  });

  it("keeps a valid type as-is", () => {
    const parsed = structuredEntrySchema.parse({ type: "project", title: "Side project" });
    expect(parsed.type).toBe("project");
  });

  it("defaults body/metrics/tags when absent", () => {
    const parsed = structuredEntrySchema.parse({ type: "role", title: "Engineer" });
    expect(parsed.body).toBe("");
    expect(parsed.metrics).toEqual([]);
    expect(parsed.tags).toEqual([]);
  });

  it("rejects an entry with no title", () => {
    expect(structuredEntrySchema.safeParse({ type: "role" }).success).toBe(false);
  });
});

describe("structureResultSchema", () => {
  it("defaults entries to an empty array when the model returns none", () => {
    expect(structureResultSchema.parse({})).toEqual({ entries: [] });
  });

  it("drops an individual malformed entry's bad type instead of failing the whole batch", () => {
    const parsed = structureResultSchema.parse({
      entries: [
        { type: "role", title: "Real entry" },
        { type: "made-up-type", title: "Weird entry" },
      ],
    });
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[1]?.type).toBe("note");
  });
});
