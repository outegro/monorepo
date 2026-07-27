import { describe, expect, it, vi } from "vitest";
import { KakaoService } from "./kakao.service";

/** Minimal ConfigService stand-in — the real one needs the whole Nest container. */
function makeService(apiKey = "test-key") {
  const config = {
    get: (k: string) =>
      k === "KAKAO_LOCAL_BASE_URL" ? "https://dapi.kakao.com" : apiKey || undefined,
  };
  return new KakaoService(config as never);
}

function stubFetch(byQuery: Record<string, { id: string; place_name: string }[]>) {
  return vi.fn(async (url: URL) => {
    const q = url.searchParams.get("query") ?? "";
    const docs = (byQuery[q] ?? []).map((d) => ({
      ...d,
      x: "126.98",
      y: "37.56",
      category_group_code: url.searchParams.get("category_group_code") ?? undefined,
    }));
    return { ok: true, json: async () => ({ documents: docs }) } as unknown as Response;
  });
}

describe("KakaoService.search", () => {
  it("returns nothing without an API key rather than throwing", async () => {
    expect(await makeService("").search("어니언")).toEqual([]);
  });

  /**
   * The regression this file exists for. Prepending the district to the query does not narrow
   * the search, it overrides it: "월악산 제비봉" returns zero from the live API because Kakao
   * treats 월악산 as a region and the peak is registered in a different county. Bare "제비봉"
   * finds it. So the bare query must always be attempted, not only the qualified one.
   */
  it("still finds a place whose district-qualified query returns nothing", async () => {
    const fetchMock = stubFetch({
      제비봉: [{ id: "1", place_name: "제비봉" }],
      "월악산 제비봉": [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await makeService().search("제비봉", { district: "월악산", categoryGroup: "AT4" });
    expect(out.map((c) => c.name)).toContain("제비봉");
    vi.unstubAllGlobals();
  });

  it("searches the address first when one was extracted", async () => {
    const fetchMock = stubFetch({
      "명동10길 19-3": [{ id: "cat", place_name: "고양이사랑채" }],
      고양이카페: [{ id: "other", place_name: "고양이놀이터 명동점" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await makeService().search("고양이카페", {
      address: "명동10길 19-3",
      categoryGroup: "CE7",
    });
    // Address hit ranks above the generic name hit — the reviewer reads top-down.
    expect(out[0]?.name).toBe("고양이사랑채");
    vi.unstubAllGlobals();
  });

  it("resolves from an address alone when there is no usable name", async () => {
    const fetchMock = stubFetch({ "명동3길 44": [{ id: "bbq", place_name: "무한리필 몽블리" }] });
    vi.stubGlobal("fetch", fetchMock);

    const out = await makeService().search("", { address: "명동3길 44", categoryGroup: "FD6" });
    expect(out.map((c) => c.name)).toEqual(["무한리필 몽블리"]);
    vi.unstubAllGlobals();
  });

  it("dedupes the same place returned by more than one attempt", async () => {
    const same = [{ id: "dup", place_name: "어니언 성수" }];
    const fetchMock = stubFetch({ 어니언: same, "성수동 어니언": same });
    vi.stubGlobal("fetch", fetchMock);

    const out = await makeService().search("어니언", { district: "성수동" });
    expect(out).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("maps Kakao's string x/y onto lng/lat and not the other way round", async () => {
    const fetchMock = stubFetch({ 어니언: [{ id: "1", place_name: "어니언" }] });
    vi.stubGlobal("fetch", fetchMock);

    const [c] = await makeService().search("어니언");
    // x is longitude, y is latitude — an easy pair to swap, and Seoul would land in Somalia.
    expect(c?.lat).toBeCloseTo(37.56);
    expect(c?.lng).toBeCloseTo(126.98);
    vi.unstubAllGlobals();
  });
});
