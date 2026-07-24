import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { DEFAULT_FX_RATES, type FxRates } from "./fx.types";

interface CacheEntry {
  rates: FxRates;
  fetchedAt: number;
  source: string;
}

const STALE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Live FX rates with an in-memory cache (single instance is fine — rates are
 * read-only system data, not per-user). First read blocks on a fresh fetch;
 * afterwards reads return the cache while fresh, falling back to stale-on-error.
 * A scheduled job (budget FX-refresh cron) calls `refresh()` proactively so
 * requests rarely hit a cold cache.
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cache: CacheEntry | null = null;
  private inflight: Promise<CacheEntry> | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async getRates(): Promise<FxRates> {
    if (this.cache && Date.now() - this.cache.fetchedAt < STALE_MS) {
      return this.cache.rates;
    }
    try {
      const entry = await this.refresh();
      return entry.rates;
    } catch (err) {
      this.logger.warn(`FX fetch failed, using ${this.cache ? "stale cache" : "defaults"}: ${err}`);
      return this.cache?.rates ?? DEFAULT_FX_RATES;
    }
  }

  getState(): { rates: FxRates; fetchedAt: number | null; source: string | null } {
    return {
      rates: this.cache?.rates ?? DEFAULT_FX_RATES,
      fetchedAt: this.cache?.fetchedAt ?? null,
      source: this.cache?.source ?? null,
    };
  }

  async refresh(): Promise<CacheEntry> {
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchFromApi().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchFromApi(): Promise<CacheEntry> {
    const res = await fetch(this.config.get("FX_API_URL", { infer: true }), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`FX API returned ${res.status}`);
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) {
      throw new Error("FX API returned malformed payload");
    }
    const rates = invert(data.rates);
    for (const k of ["GEL", "RUB", "EUR"] as const) {
      if (!Number.isFinite(rates[k])) throw new Error(`FX API missing currency: ${k}`);
    }
    const entry: CacheEntry = { rates, fetchedAt: Date.now(), source: "open.er-api.com" };
    this.cache = entry;
    this.logger.log(`FX rates refreshed: ${JSON.stringify(rates)}`);
    return entry;
  }
}

/** API base is USD; internal rates are "1 X = rates[X] USD" (inverse of the API's "1 USD = X"). */
function invert(usdBase: Record<string, number>): FxRates {
  const usd = toNumber(usdBase.USD);
  const gel = toNumber(usdBase.GEL);
  const rub = toNumber(usdBase.RUB);
  const eur = toNumber(usdBase.EUR);
  return {
    USD: 1,
    GEL: gel > 0 ? usd / gel : Number.NaN,
    RUB: rub > 0 ? usd / rub : Number.NaN,
    EUR: eur > 0 ? usd / eur : Number.NaN,
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}
