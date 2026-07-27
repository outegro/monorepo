"use client";

import { useEffect, useRef, useState } from "react";
import { KAKAO_JS_KEY } from "@/lib/env";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 1-based position within the day; drawn inside the marker when present. */
  order?: number;
}

/**
 * Kakao Maps. Korea-only mapping — Google has no usable POI or directions coverage there
 * because of the map-export restrictions.
 *
 * The SDK is injected once and cached on window; Next remounts components often enough that
 * appending the script per mount would reload the whole library on every navigation.
 */
declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => { extend: (ll: unknown) => void };
        Map: new (
          el: HTMLElement,
          opts: Record<string, unknown>,
        ) => {
          setBounds: (b: unknown) => void;
          setCenter: (ll: unknown) => void;
        };
        CustomOverlay: new (opts: Record<string, unknown>) => { setMap: (m: unknown) => void };
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (!KAKAO_JS_KEY) return Promise.reject(new Error("no_kakao_js_key"));
  if (window.kakao?.maps) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    // autoload=false → the SDK exposes kakao.maps.load() so we control when it initialises.
    el.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    el.async = true;
    el.onload = () => window.kakao?.maps.load(() => resolve());
    el.onerror = () => reject(new Error("kakao_sdk_failed"));
    document.head.appendChild(el);
  });
  return sdkPromise;
}

export function KakaoMap({ points, className }: { points: MapPoint[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const first = points[0];
    if (!ref.current || !first) return;

    loadSdk()
      .then(() => {
        if (cancelled || !ref.current || !window.kakao) return;
        const { maps } = window.kakao;
        const map = new maps.Map(ref.current, {
          center: new maps.LatLng(first.lat, first.lng),
          level: 6,
        });

        const bounds = new maps.LatLngBounds();
        for (const p of points) {
          const ll = new maps.LatLng(p.lat, p.lng);
          bounds.extend(ll);
          // A CustomOverlay rather than a Marker: it can carry the day-order number, which is
          // the only thing that makes a multi-stop day readable at a glance.
          new maps.CustomOverlay({
            position: ll,
            yAnchor: 1,
            content:
              `<div style="display:flex;align-items:center;gap:4px;transform:translateY(-4px)">` +
              `<span style="display:flex;align-items:center;justify-content:center;` +
              `min-width:22px;height:22px;padding:0 6px;border-radius:11px;` +
              `background:#111;color:#fff;font:600 11px/1 system-ui;box-shadow:0 1px 4px rgba(0,0,0,.4)">` +
              `${p.order ?? "•"}</span>` +
              `<span style="background:#fff;color:#111;padding:2px 6px;border-radius:6px;` +
              `font:500 11px/1.4 system-ui;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap">` +
              `${escapeHtml(p.name)}</span></div>`,
          }).setMap(map);
        }
        if (points.length > 1) map.setBounds(bounds);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [points]);

  if (!KAKAO_JS_KEY || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm ${className ?? ""}`}
      >
        Map unavailable — the list below still works.
      </div>
    );
  }

  return <div ref={ref} className={className} />;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/**
 * Deep link that opens the KakaoMap app with navigation to this place. Deliberately not our
 * own router: Kakao Mobility's directions API is a separate product behind its own approval,
 * and the phone's own app has live transit data we could not match anyway.
 */
export function kakaoNavUrl(p: { name: string; lat: number; lng: number }): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
}
