import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCALE,
  detectInitialLocale,
  isLocale,
  readLocaleCookie,
  writeLocaleCookie,
} from "./locale.js";

describe("isLocale", () => {
  it("accepts the two shipped locales and nothing else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    // Dropped in favour of the two the platform actually maintains.
    expect(isLocale("uz")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("readLocaleCookie", () => {
  it("finds the cookie among others", () => {
    expect(readLocaleCookie("og_access=x; og_locale=ru; theme=dark")).toBe("ru");
  });

  it("is not fooled by a cookie whose name merely ends with the same suffix", () => {
    expect(readLocaleCookie("not_og_locale=ru")).toBeNull();
  });

  it("rejects a value that is no longer a supported locale", () => {
    expect(readLocaleCookie("og_locale=tg")).toBeNull();
  });

  it("returns null when absent", () => {
    expect(readLocaleCookie("")).toBeNull();
  });
});

describe("detectInitialLocale", () => {
  it("prefers the cookie over the browser language", () => {
    expect(detectInitialLocale("og_locale=en", "ru-RU")).toBe("en");
  });

  it("falls back to Russian only for a Russian browser with no cookie", () => {
    expect(detectInitialLocale("", "ru-RU")).toBe("ru");
  });

  it("defaults to English for everything else", () => {
    expect(detectInitialLocale("", "ko-KR")).toBe(DEFAULT_LOCALE);
    expect(detectInitialLocale("", undefined)).toBe("en");
  });
});

describe("writeLocaleCookie", () => {
  const written: string[] = [];

  function stubHost(hostname: string, protocol = "https:") {
    written.length = 0;
    vi.stubGlobal("window", { location: { hostname, protocol } });
    vi.stubGlobal("document", {
      set cookie(v: string) {
        written.push(v);
      },
      get cookie() {
        return written.join("; ");
      },
    });
  }

  afterEach(() => vi.unstubAllGlobals());

  // The bug this module exists to fix: without domain=.outegro.com the cookie is host-only,
  // so a locale chosen on id.outegro.com never reached trips.outegro.com.
  it("scopes the cookie to .outegro.com on a subdomain", () => {
    stubHost("trips.outegro.com");
    writeLocaleCookie("ru");
    expect(written[0]).toContain("domain=.outegro.com");
    expect(written[0]).toContain("og_locale=ru");
    expect(written[0]).toContain("secure");
  });

  it("scopes it on the apex domain too", () => {
    stubHost("outegro.com");
    writeLocaleCookie("en");
    expect(written[0]).toContain("domain=.outegro.com");
  });

  // A domain attribute the browser is not on gets the cookie dropped silently, which during
  // local dev looks exactly like "the language switcher does nothing".
  it("omits the domain on localhost", () => {
    stubHost("localhost", "http:");
    writeLocaleCookie("ru");
    expect(written[0]).not.toContain("domain=");
    expect(written[0]).not.toContain("secure");
  });

  it("omits the domain on an unrelated host", () => {
    stubHost("example.com");
    writeLocaleCookie("ru");
    expect(written[0]).not.toContain("domain=");
  });
});
