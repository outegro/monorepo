import { describe, expect, it } from "vitest";
import { safeNextUrl } from "./next-url";

describe("safeNextUrl", () => {
  it("accepts the apex domain and subdomains over https", () => {
    expect(safeNextUrl("https://outegro.com/")).toBe("https://outegro.com/");
    expect(safeNextUrl("https://budget.outegro.com/settings")).toBe(
      "https://budget.outegro.com/settings",
    );
  });

  it("rejects other hosts", () => {
    expect(safeNextUrl("https://evil.com/")).toBeNull();
  });

  // The classic bypass: a host that merely *ends with* the brand string. `endsWith` is
  // applied to ".outegro.com" (with the dot) precisely so this cannot match.
  it("rejects a lookalike host that only ends with the brand", () => {
    expect(safeNextUrl("https://notoutegro.com/")).toBeNull();
    expect(safeNextUrl("https://outegro.com.evil.com/")).toBeNull();
  });

  it("rejects non-https schemes, including javascript:", () => {
    expect(safeNextUrl("http://outegro.com/")).toBeNull();
    expect(safeNextUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects relative paths and junk", () => {
    expect(safeNextUrl("/profile")).toBeNull();
    expect(safeNextUrl("not a url")).toBeNull();
    expect(safeNextUrl(null)).toBeNull();
    expect(safeNextUrl("")).toBeNull();
  });
});
