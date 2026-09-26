"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

/**
 * Current time in seconds (fractional), aligned to chain time and updated every `tickMs`.
 * The offset between the local clock and the latest block timestamp is measured once,
 * so the price ticker agrees with what the contract will compute.
 */
export function useChainNow(tickMs = 100): number {
  const client = usePublicClient();
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client
      .getBlock()
      .then((b) => {
        if (cancelled) return;
        const diff = Number(b.timestamp) - Date.now() / 1000;
        // Only correct meaningful skew; block timestamps have 1 s resolution.
        setOffset(Math.abs(diff) > 1.5 ? diff : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return now + offset;
}
