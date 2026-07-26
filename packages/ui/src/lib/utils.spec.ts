import { describe, expect, it } from "vitest";
import { cn } from "./utils.js";

describe("cn", () => {
  it("merges tailwind classes, last wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
  it("drops falsy values", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
  // The whole point of tailwind-merge here: a caller's className must be able to override a
  // component's baked-in variant classes, which is how every `<Button className="...">` works.
  it("lets a caller override a variant class", () => {
    expect(cn("bg-primary text-primary-foreground", "bg-destructive")).toBe(
      "text-primary-foreground bg-destructive",
    );
  });
});
