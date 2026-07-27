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
   * Keyword search. `district` is prepended rather than passed as a coordinate box: the notes
   * give us area names ("성수동", "Hongdae"), not coordinates, and Kakao's own relevance
   * handles "성수동 카페 어니언" better than an arbitrary radius would.
   */
  async search(query: string, opts: { categoryGroup?: CategoryGroup; district?: string } = {}) {
    if (!this.apiKey) return [];

    const q = [opts.district, query].filter(Boolean).join(" ").trim();
    if (!q) return [];

    const url = new URL(`${this.baseUrl}/v2/local/search/keyword.json`);
    url.searchParams.set("query", q);
    url.searchParams.set("size", "10");
    // Bias towards Korea; Kakao only indexes Korea anyway, this just steadies the ranking.
    url.searchParams.set("sort", "accuracy");
    if (opts.categoryGroup) url.searchParams.set("category_group_code", opts.categoryGroup);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${this.apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      this.logger.error(`kakao search failed for "${q}": ${String(error)}`);
      return [];
    }
    if (!res.ok) {
      this.logger.error(`kakao ${res.status} for "${q}": ${(await res.text()).slice(0, 200)}`);
      return [];
    }

    const data = (await res.json()) as { documents?: KakaoDoc[] };
    return (data.documents ?? []).map(toCandidate);
  }
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
