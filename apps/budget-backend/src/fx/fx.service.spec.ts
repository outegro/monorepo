import { beforeEach, describe, expect, it, vi } from "vitest";
import { FxService } from "./fx.service";
import { DEFAULT_FX_RATES } from "./fx.types";

function makeConfig(url = "https://fx.example/latest") {
  return { get: vi.fn().mockReturnValue(url) } as never;
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

const API_PAYLOAD = {
  result: "success",
  rates: { USD: 1, GEL: 2.7, RUB: 87, EUR: 0.92 },
};

describe("FxService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and inverts rates so rates[X] = 1 X in USD", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(okResponse(API_PAYLOAD));
    const svc = new FxService(makeConfig());
    const rates = await svc.getRates();
    expect(rates.USD).toBe(1);
    expect(rates.GEL).toBeCloseTo(1 / 2.7);
    expect(rates.EUR).toBeCloseTo(1 / 0.92);
  });

  it("serves the cache on a second call without refetching", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(okResponse(API_PAYLOAD));
    const svc = new FxService(makeConfig());
    await svc.getRates();
    await svc.getRates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to defaults when the first fetch ever fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const svc = new FxService(makeConfig());
    const rates = await svc.getRates();
    expect(rates).toEqual(DEFAULT_FX_RATES);
  });

  it("falls back to the stale cache when a later refresh fails", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(okResponse(API_PAYLOAD))
      .mockRejectedValueOnce(new Error("network down"));
    const svc = new FxService(makeConfig());
    const fresh = await svc.refresh();
    // Backdate the cache past STALE_MS so the next getRates() attempts a real refresh.
    (svc as unknown as { cache: { fetchedAt: number } }).cache.fetchedAt = 0;
    const stale = await svc.getRates();
    expect(stale).toEqual(fresh.rates);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent refreshes into a single in-flight fetch", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(okResponse(API_PAYLOAD));
    const svc = new FxService(makeConfig());
    const [a, b] = await Promise.all([svc.refresh(), svc.refresh()]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the API reports non-success or missing rates", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(okResponse({ result: "error" }));
    const svc = new FxService(makeConfig());
    await expect(svc.refresh()).rejects.toThrow("malformed payload");
  });

  it("throws when a required currency is missing from the payload", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      okResponse({ result: "success", rates: { USD: 1, GEL: 2.7 } }),
    );
    const svc = new FxService(makeConfig());
    await expect(svc.refresh()).rejects.toThrow(/RUB|EUR/);
  });

  it("getState reports defaults with a null fetchedAt before any fetch", () => {
    const svc = new FxService(makeConfig());
    expect(svc.getState()).toEqual({ rates: DEFAULT_FX_RATES, fetchedAt: null, source: null });
  });
});
