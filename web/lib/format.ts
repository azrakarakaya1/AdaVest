import { formatEther } from "viem";

export function formatMon(wei: bigint, decimals = 4): string {
  const n = Number(formatEther(wei));
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export const pct = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
