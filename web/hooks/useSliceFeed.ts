"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, Hash } from "viem";
import { auction, CONTRACT_ADDRESS } from "@/lib/contract";

export type Sale = {
  buyer: Address;
  price: bigint;
  sliceIndex: number;
  txHash: Hash;
  blockNumber: bigint;
};

const CHUNK = 100n; // public RPC caps eth_getLogs ranges
const BACKFILL_BLOCKS = 1_500n; // ~10 minutes of history at 0.4 s blocks

/** SliceBought events for a round: backfills recent history, then polls every second. */
export function useSliceFeed(roundId: number) {
  const client = usePublicClient();
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!client || !CONTRACT_ADDRESS || !Number.isInteger(roundId)) return;
    let cancelled = false;
    let next = 0n;
    const seen = new Set<string>();

    const fetchRange = async (from: bigint, to: bigint) => {
      const logs = await client.getContractEvents({
        ...auction,
        address: CONTRACT_ADDRESS!,
        eventName: "SliceBought",
        args: { roundId: BigInt(roundId) },
        fromBlock: from,
        toBlock: to,
      });
      const fresh: Sale[] = [];
      for (const l of logs) {
        const key = `${l.transactionHash}-${l.logIndex}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push({
          buyer: l.args.buyer!,
          price: l.args.price!,
          sliceIndex: Number(l.args.sliceIndex),
          txHash: l.transactionHash,
          blockNumber: l.blockNumber,
        });
      }
      if (fresh.length && !cancelled) {
        setSales((prev) => [...prev, ...fresh].sort((a, b) => b.sliceIndex - a.sliceIndex));
      }
    };

    const poll = async () => {
      try {
        const head = await client.getBlockNumber();
        if (next === 0n) {
          next = head > BACKFILL_BLOCKS ? head - BACKFILL_BLOCKS : 0n;
        }
        while (next <= head && !cancelled) {
          const to = next + CHUNK - 1n < head ? next + CHUNK - 1n : head;
          await fetchRange(next, to);
          next = to + 1n;
        }
      } catch {
        // transient RPC error: retry on the next tick
      }
      if (!cancelled) timer = setTimeout(poll, 1_000);
    };

    let timer = setTimeout(poll, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, roundId]);

  return sales;
}
