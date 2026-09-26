import type { Round } from "./contract";

/** Mirrors AdaVestAuction.currentPrice(), evaluated at `nowSec` (may be fractional for a smooth ticker). */
export function priceAt(r: Round, nowSec: number): bigint {
  const start = Number(r.startTime);
  if (nowSec <= start) return r.startPrice;
  // Use millisecond precision so the ticker moves smoothly between whole seconds.
  const elapsedMs = BigInt(Math.floor((nowSec - start) * 1000));
  const drop = (r.decayPerSecond * elapsedMs) / 1000n;
  const room = r.startPrice - r.floorPrice;
  return drop >= room ? r.floorPrice : r.startPrice - drop;
}

export type RoundStatus = "upcoming" | "live" | "floor" | "soldout";

export function statusOf(r: Round, nowSec: number): RoundStatus {
  if (r.slicesSold >= r.totalSlices) return "soldout";
  if (nowSec < Number(r.startTime)) return "upcoming";
  return priceAt(r, nowSec) === r.floorPrice ? "floor" : "live";
}

/** 0..1, how far the price has fallen from start to floor. */
export function decayProgress(r: Round, nowSec: number): number {
  const room = r.startPrice - r.floorPrice;
  if (room === 0n) return 1;
  return Number(((r.startPrice - priceAt(r, nowSec)) * 10_000n) / room) / 10_000;
}
