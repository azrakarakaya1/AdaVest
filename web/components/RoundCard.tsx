"use client";

import Link from "next/link";
import type { RoundWithId } from "@/lib/contract";
import { priceAt, statusOf, type RoundStatus } from "@/lib/price";
import { formatCountdown, formatMon, pct } from "@/lib/format";

export function StatusBadge({ status, startsIn }: { status: RoundStatus; startsIn?: number }) {
  const map: Record<RoundStatus, { text: string; cls: string }> = {
    live: { text: "Live", cls: "text-sage border-sage/30" },
    floor: { text: "At floor", cls: "text-gold border-gold/30" },
    upcoming: { text: `Starts in ${formatCountdown(startsIn ?? 0)}`, cls: "text-mist border-white/15" },
    soldout: { text: "Sold out", cls: "text-mute border-white/10" },
  };
  const { text, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular ${cls}`}>
      {(status === "live" || status === "floor") && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {text}
    </span>
  );
}

export function RoundCard({ round, now }: { round: RoundWithId; now: number }) {
  const status = statusOf(round, now);
  const price = priceAt(round, now);
  const left = round.totalSlices - round.slicesSold;
  const sold = round.slicesSold / round.totalSlices;

  return (
    <Link
      href={`/round/${round.id}`}
      className="card group flex flex-col gap-5 p-5 transition-colors hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-sm font-semibold">
            {round.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h3 className="font-medium">{round.name}</h3>
            <p className="text-xs text-mute">
              Round #{round.id} · {pct(round.sliceBps)} per slice
            </p>
          </div>
        </div>
        <StatusBadge status={status} startsIn={Number(round.startTime) - now} />
      </div>

      <div>
        <p className="text-xs text-mute">Current price</p>
        <p className="mt-1 text-3xl font-medium tracking-tight tabular">
          {formatMon(price, 4)} <span className="text-base text-mute">MON</span>
        </p>
      </div>

      <div>
        <div className="mb-2 flex justify-between text-xs text-mute tabular">
          <span>
            {round.slicesSold}/{round.totalSlices} sold
          </span>
          <span>{left} left</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-slate to-sage" style={{ width: `${sold * 100}%` }} />
        </div>
      </div>

      <span className="text-sm text-white/70 group-hover:text-white">Enter auction →</span>
    </Link>
  );
}
