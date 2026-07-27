import { describe, expect, it } from "vitest";
import { guessKind, parseBatchLine, parseShortcode } from "./reels.contracts";

describe("parseShortcode", () => {
  it("accepts every permalink shape Instagram serves the same reel under", () => {
    for (const path of ["reel", "reels", "p", "tv"]) {
      expect(parseShortcode(`https://www.instagram.com/${path}/C8QltIYSc4M/`)).toBe("C8QltIYSc4M");
    }
  });

  it("ignores query strings and trailing junk", () => {
    expect(parseShortcode("https://instagram.com/reel/C8QltIYSc4M/?igsh=abc123")).toBe(
      "C8QltIYSc4M",
    );
  });

  it("tolerates the whitespace a phone clipboard adds", () => {
    expect(parseShortcode("  https://www.instagram.com/reel/C8QltIYSc4M/  ")).toBe("C8QltIYSc4M");
  });

  // Dedupe depends on this: the same reel pasted by both of us must collapse to one row,
  // and it must not collapse reels that merely look similar.
  it("distinguishes different shortcodes", () => {
    expect(parseShortcode("https://www.instagram.com/reel/AAAAAAAAAAA/")).not.toBe(
      parseShortcode("https://www.instagram.com/reel/BBBBBBBBBBB/"),
    );
  });

  it("rejects non-Instagram and malformed URLs", () => {
    expect(parseShortcode("https://www.tiktok.com/@x/video/123")).toBeNull();
    expect(parseShortcode("https://instagram.com.evil.com/reel/C8QltIYSc4M/")).toBeNull();
    expect(parseShortcode("https://www.instagram.com/someuser/")).toBeNull();
    expect(parseShortcode("not a url")).toBeNull();
  });
});

describe("parseBatchLine", () => {
  it("takes a bare url", () => {
    expect(parseBatchLine("https://www.instagram.com/reel/A/")).toEqual({
      url: "https://www.instagram.com/reel/A/",
    });
  });

  // The separator is whatever the clipboard produced; all of these show up in practice.
  it.each(["|", "—", "–", " - "])("splits a note on %s", (sep) => {
    expect(parseBatchLine(`https://www.instagram.com/reel/A/ ${sep} кафе в Соннсу`)).toEqual({
      url: "https://www.instagram.com/reel/A/",
      note: "кафе в Соннсу",
    });
  });

  it("keeps Korean notes intact", () => {
    expect(parseBatchLine("https://www.instagram.com/reel/A/ | 성수동 어니언 카페")?.note).toBe(
      "성수동 어니언 카페",
    );
  });

  it("skips blank lines", () => {
    expect(parseBatchLine("   ")).toBeNull();
    expect(parseBatchLine("")).toBeNull();
  });

  it("treats an empty note as no note", () => {
    expect(parseBatchLine("https://www.instagram.com/reel/A/ |")).toEqual({
      url: "https://www.instagram.com/reel/A/",
    });
  });
});

describe("guessKind", () => {
  it("treats a trail as a route", () => {
    expect(guessKind("여행 > 관광,명소 > 등산로")).toBe("ROUTE");
    expect(guessKind("여행 > 관광,명소 > 둘레길")).toBe("ROUTE");
  });

  // A peak is where a route ENDS, not the route. Getting this wrong is what makes navigation
  // aim at a mountaintop instead of the trailhead car park.
  it("treats a peak as a spot", () => {
    expect(guessKind("여행 > 관광,명소 > 산봉우리")).toBe("SPOT");
  });

  it("defaults to spot for restaurants and for nothing at all", () => {
    expect(guessKind("음식점 > 한식 > 육류,고기")).toBe("SPOT");
    expect(guessKind(null)).toBe("SPOT");
    expect(guessKind(undefined)).toBe("SPOT");
  });
});
