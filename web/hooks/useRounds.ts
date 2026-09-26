"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { auction, CONTRACT_ADDRESS, type Round, type RoundWithId } from "@/lib/contract";

/** All rounds, newest first. Re-reads every 2 s. */
export function useRounds() {
  const count = useReadContract({
    ...auction,
    functionName: "roundCount",
    query: { enabled: !!CONTRACT_ADDRESS, refetchInterval: 4_000 },
  });
  const n = Number(count.data ?? 0n);

  const reads = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      ...auction,
      functionName: "getRound" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: n > 0, refetchInterval: 2_000 },
  });

  const rounds = useMemo<RoundWithId[]>(() => {
    if (!reads.data) return [];
    return reads.data
      .map((r, id) => (r.status === "success" ? { ...(r.result as Round), id } : null))
      .filter((r): r is RoundWithId => r !== null)
      .reverse();
  }, [reads.data]);

  return { rounds, isLoading: count.isLoading || (n > 0 && reads.isLoading), error: count.error ?? reads.error };
}

export function useRound(id: number) {
  const q = useReadContract({
    ...auction,
    functionName: "getRound",
    args: [BigInt(id)],
    query: { enabled: !!CONTRACT_ADDRESS && Number.isInteger(id) && id >= 0, refetchInterval: 1_000 },
  });
  return { round: q.data as Round | undefined, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
}
