"use client";

import Link from "next/link";
import { useReadContracts, useConnection } from "wagmi";
import { useRounds } from "@/hooks/useRounds";
import { useChainNow } from "@/hooks/useChainNow";
import { auction } from "@/lib/contract";
import { priceAt } from "@/lib/price";
import { formatMon, pct } from "@/lib/format";
import { ContractMissing } from "@/components/ContractMissing";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export default function PortfolioPage() {
  const { address } = useConnection();
  const { rounds } = useRounds();
  const now = useChainNow(1_000);

  const balances = useReadContracts({
    contracts: rounds.map((r) => ({
      ...auction,
      functionName: "balanceOf" as const,
      args: [address!, BigInt(r.id)] as const,
    })),
    query: { enabled: !!address && rounds.length > 0, refetchInterval: 3_000 },
  });

  const holdings = rounds
    .map((r, i) => ({ round: r, slices: (balances.data?.[i]?.result as bigint | undefined) ?? 0n }))
    .filter((h) => h.slices > 0n);

  const totalValue = holdings.reduce((sum, h) => sum + priceAt(h.round, now) * h.slices, 0n);

  if (!CONTRACT_ADDRESS) return <div className="pt-10"><ContractMissing /></div>;

  return (
    <div className="pt-8">
      <p className="text-xs tracking-[0.2em] text-gold uppercase">Portfolio</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">My slices</h1>

      {!address ? (
        <div className="card mt-8 p-8 text-center text-mute">Connect your wallet to see your slices.</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs text-mute">Startups backed</p>
              <p className="mt-1 text-2xl font-medium tabular">{holdings.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-mute">Slices held</p>
              <p className="mt-1 text-2xl font-medium tabular">{holdings.reduce((s, h) => s + h.slices, 0n).toString()}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-mute">Marked at current auction price</p>
              <p className="mt-1 text-2xl font-medium tabular">{formatMon(totalValue, 3)} MON</p>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-mute">
              No slices yet. <Link href="/#rounds" className="text-white hover:underline">Browse live rounds →</Link>
            </div>
          ) : (
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-mute">
                  <tr className="border-b border-line">
                    <th className="px-6 py-4 font-normal">Startup</th>
                    <th className="px-6 py-4 font-normal">Slices</th>
                    <th className="px-6 py-4 font-normal">Equity</th>
                    <th className="px-6 py-4 font-normal">Current price</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(({ round, slices }) => (
                    <tr key={round.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-4">
                        <Link href={`/round/${round.id}`} className="hover:underline">{round.name}</Link>
                      </td>
                      <td className="px-6 py-4 tabular">{slices.toString()}</td>
                      <td className="px-6 py-4 tabular">{pct(Number(slices) * round.sliceBps)}</td>
                      <td className="px-6 py-4 tabular">{formatMon(priceAt(round, now), 4)} MON</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
