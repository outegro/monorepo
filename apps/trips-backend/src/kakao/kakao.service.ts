import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import type { Candidate, CategoryGroup } from "../reels/reels.contracts";

/** Shape of a Kakao Local `documents[]` entry we care about. */
interface KakaoDoc {
  id: string;
  place_name: string;
  category_group_code?: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  phone?: string;
  place_url?: string;
  x: string; // longitude, as a string
  y: string; // latitude, as a string
}

/**
 * Kakao Local keyword search. Korea-only mapping: Google's POI and directions coverage there
 * is crippled by the map-export restrictions, and Naver Cloud bills Maps from the first call
 * behind Korean identity verification — Kakao has a free monthly quota and an ordinary
 * account is enough.
 *
 * The key is OPTIONAL by design: without it reels still queue for review, they just arrive
 * with no candidates. A missing key must not take the whole catalogue down.
 */
@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("KAKAO_LOCAL_BASE_URL", { infer: true }).replace(/\/+$/, "");
    this.apiKey = config.get("KAKAO_REST_API_KEY", { infer: true })?.trim() || undefined;
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Find candidates for one reel. Runs several queries and merges them, because no single
   * query shape wins — measured against real reels on 2026-07-27:
   *
   * - An ADDRESS from the note is the strongest signal by far, but only with a category
   *   filter. Bare "명동10길 19-3" returns the hardware shop, the noodle place and the gimbap
   *   counter in the same building; the same address with CE7 returns the cat cafe we wanted.
   * - Prepending the district ACTIVELY BREAKS some searches. "월악산 제비봉" returns zero —
   *   Kakao parses 월악산 as a region and looks for 제비봉 inside it, and the peak is
   *   administratively in 단양군, not 제천시. Bare "제비봉" finds it immediately. So the
   *   district-qualified query is one attempt among several, never the only one.
   *
   * Ordering matters: earlier queries are more trustworthy, and the reviewer reads top-down.
   */
  async search(
    query: string,
    opts: {
      categoryGroup?: CategoryGroup;
      district?: string;
      address?: string;
      queryAlt?: string;
      queryKo?: string;
    } = {},
  ): Promise<Candidate[]> {
    if (!this.apiKey) return [];

    const attempts: { q: string; cat?: CategoryGroup }[] = [];
    const seen = new Set<string>();
    const add = (q: string | undefined, cat?: CategoryGroup) => {
      const key = `${q}|${cat ?? ""}`;
      if (!q?.trim() || seen.has(key)) return;
      seen.add(key);
      attempts.push({ q: q.trim(), cat });
    };
    if (opts.address) {
      add(opts.address, opts.categoryGroup);
      // Without the filter too: the category guess can be wrong, and a right address with a
      // wrong category would otherwise hide the answer completely.
      if (opts.categoryGroup) add(opts.address);
    }
    if (query) {
      add(query, opts.categoryGroup);
      // Bare name, stripped of a district and a branch suffix. Measured: "Crazy Lamb 건대점"
      // returns nothing while "Crazy Lamb" returns the place — Kakao treats the extra tokens
      // as constraints and a branch that is not indexed under that exact string kills the hit.
      const bare = bareName(query, opts.district);
      add(bare, opts.categoryGroup);
      add(bare);
      add(opts.queryAlt, opts.categoryGroup);
      add(bareName(opts.queryAlt ?? "", opts.district), opts.categoryGroup);
      if (opts.district) add(`${opts.district} ${bare}`, opts.categoryGroup);
    }
    // Descriptive Korean last: least precise, but it is what finds a place whose registered
    // name bears no resemblance to its marketing one.
    add(opts.queryKo, opts.categoryGroup);
    add(opts.queryKo);

    const merged = new Map<string, Candidate>();
    for (const a of attempts) {
      if (merged.size >= 12) break;
      for (const c of await this.searchOnce(a.q, a.cat)) {
        if (!merged.has(c.kakaoId)) merged.set(c.kakaoId, c);
      }
    }
    return [...merged.values()].slice(0, 12);
  }

  private async searchOnce(q: string, categoryGroup?: CategoryGroup): Promise<Candidate[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];

    const url = new URL(`${this.baseUrl}/v2/local/search/keyword.json`);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("size", "5");
    url.searchParams.set("sort", "accuracy");
    if (categoryGroup) url.searchParams.set("category_group_code", categoryGroup);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${this.apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      this.logger.error(`kakao search failed for "${trimmed}": ${String(error)}`);
      return [];
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      // 403 here almost always means the app has Kakao Map switched off in the console
      // (errorType NotAuthorizedError, "disabled OPEN_MAP_AND_LOCAL service") rather than a
      // bad key — worth saying out loud, it is a one-toggle fix that looks like an auth bug.
      this.logger.error(`kakao ${res.status} for "${trimmed}": ${body}`);
      return [];
    }

    const data = (await res.json()) as { documents?: KakaoDoc[] };
    return (data.documents ?? []).map(toCandidate);
  }
}

/**
 * Reduce a query to the bare business name: drop the district if it was appended, and drop a
 * trailing branch token (…점 — 건대점, 명동2호점). Kakao indexes the brand, and the branch
 * spelling in a caption rarely matches the registered one.
 */
export function bareName(query: string, district?: string): string {
  let q = query.trim();
  if (district) q = q.replace(new RegExp(`\\s*${escapeRe(district)}\\s*`, "g"), " ");
  q = q.replace(/\s*\S*점\s*$/u, " ");
  return q.replace(/\s+/g, " ").trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Kakao returns coordinates as strings, x=lng and y=lat — an easy pair to swap by accident. */
function toCandidate(d: KakaoDoc): Candidate {
  return {
    kakaoId: d.id,
    name: d.place_name,
    categoryGroup: d.category_group_code || null,
    categoryName: d.category_name || null,
    address: d.address_name || null,
    roadAddress: d.road_address_name || null,
    phone: d.phone || null,
    kakaoUrl: d.place_url || null,
    lat: Number(d.y),
    lng: Number(d.x),
  };
}
