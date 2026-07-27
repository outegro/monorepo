import { describe, expect, it } from "vitest";
import { distanceKm, formatKm, nearestDistanceKm } from "./geo";

// Real coordinates from the catalogue, so the numbers can be sanity-checked against a map.
const MYEONGDONG = { lat: 37.5630590908342, lng: 126.985602884281 }; // 고양이사랑채
const SEONGSU = { lat: 37.5445, lng: 127.0557 }; // Seoul Forest
const JEBIBONG = { lat: 36.9217326172587, lng: 128.27120988973388 }; // the hike, 150 km out

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm(MYEONGDONG, MYEONGDONG)).toBeCloseTo(0, 6);
  });

  it("gets a cross-Seoul hop roughly right", () => {
    // Myeongdong → Seoul Forest is about 6–7 km as the crow flies.
    const d = distanceKm(MYEONGDONG, SEONGSU);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(9);
  });

  it("gets a day-trip distance roughly right", () => {
    // Seoul → Woraksan is ~120–140 km straight-line; the point is that it is obviously NOT
    // "nearby", which is the decision this function feeds.
    expect(distanceKm(MYEONGDONG, JEBIBONG)).toBeGreaterThan(100);
  });

  it("is symmetric", () => {
    expect(distanceKm(MYEONGDONG, SEONGSU)).toBeCloseTo(distanceKm(SEONGSU, MYEONGDONG), 9);
  });
});

describe("nearestDistanceKm", () => {
  it("picks the closest target, not the first", () => {
    const d = nearestDistanceKm(MYEONGDONG, [JEBIBONG, SEONGSU]);
    expect(d).toBeCloseTo(distanceKm(MYEONGDONG, SEONGSU), 6);
  });

  it("returns null when the day has no coordinates at all", () => {
    expect(nearestDistanceKm(MYEONGDONG, [])).toBeNull();
  });
});

describe("formatKm", () => {
  // Metres below a kilometre: "0.3 km" is how a machine thinks, "300 m" is how you walk.
  it("uses metres under a kilometre", () => {
    expect(formatKm(0.3)).toBe("300 m");
    expect(formatKm(0.05)).toBe("50 m");
  });

  it("uses kilometres above one", () => {
    expect(formatKm(1.24)).toBe("1.2 km");
    expect(formatKm(12)).toBe("12.0 km");
  });
});
