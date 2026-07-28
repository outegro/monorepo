"use client";

import { useEffect, useRef, useState } from "react";
import { useKakaoSdk } from "./kakao-map";

/**
 * A small non-interactive Kakao map, sized for one place inside a list row.
 *
 * `kakao.maps.StaticMap` rather than a full `Map`: a review list can hold a hundred cards, and
 * a hundred live map instances would each keep their own tile layer, event handlers and
 * animation frames. StaticMap renders one image-like view and costs almost nothing, which is
 * what makes "every row has a map" affordable at all.
 *
 * Interaction is deliberately absent — the row already links out to KakaoMap for the real
 * thing, and a pannable map inside a scrolling list fights the scroll on a phone.
 */
export function KakaoStaticMap({
  lat,
  lng,
  name,
  className,
}: {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sdk = useKakaoSdk();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (sdk.status !== "ready" || !ref.current || !window.kakao) return;
    const { maps } = window.kakao;
    try {
      // Rebuilt on every coordinate change: StaticMap has no setCenter, and recreating one
      // lightweight view is cheaper than keeping a live map around to mutate.
      ref.current.innerHTML = "";
      new maps.StaticMap(ref.current, {
        center: new maps.LatLng(lat, lng),
        level: 4,
        marker: { position: new maps.LatLng(lat, lng), text: name },
      });
    } catch {
      setFailed(true);
    }
  }, [sdk.status, lat, lng, name]);

  if (sdk.status === "unavailable" || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed text-muted-foreground text-xs ${className ?? ""}`}
      >
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-lg border ${className ?? ""}`} />;
}
