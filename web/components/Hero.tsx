"use client";

import Link from "next/link";
import { useRounds } from "@/hooks/useRounds";
import { useChainNow } from "@/hooks/useChainNow";
import { priceAt } from "@/lib/price";
import { formatMon } from "@/lib/format";

type Node = { label: string; value: string; href?: string };

const FALLBACK: Node[] = [
  { label: "Block time", value: "0.4 s" },
  { label: "Finality", value: "0.8 s" },
  { label: "Throughput", value: "10,000 tps" },
  { label: "Platform fee", value: "2.5%" },
];

const ICONS = [
  <path key="0" d="M12 5l7 12H5z" />,
  <g key="1"><circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="12" cy="16" r="2" /></g>,
  <g key="2"><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" /></g>,
  <path key="3" d="M12 3c3 4 5 7 5 10a5 5 0 01-10 0c0-3 2-6 5-10z" />,
];

function NodeIcon({ i }: { i: number }) {
  return (
    <span className="glass grid h-9 w-9 place-items-center rounded-full">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {ICONS[i]}
      </svg>
    </span>
  );
}

function NodeLabel({ node }: { node: Node }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[13px] text-white/90">
        <span className="h-1 w-1 rounded-full bg-white" />
        {node.label}
      </span>
      <span className="pl-3 text-[11px] text-mute tabular">{node.value}</span>
    </>
  );
  return node.href ? (
    <Link href={node.href} className="flex flex-col hover:opacity-80">{body}</Link>
  ) : (
    <div className="flex flex-col">{body}</div>
  );
}

export function Hero() {
  const { rounds } = useRounds();
  const now = useChainNow(500);

  const live = rounds.filter((r) => r.slicesSold < r.totalSlices).slice(0, 4);
  const nodes: Node[] = FALLBACK.map((f, i) =>
    live[i]
      ? { label: live[i].name, value: `${formatMon(priceAt(live[i], now), 3)} MON`, href: `/round/${live[i].id}` }
      : f,
  );
  const liveCount = rounds.filter((r) => r.slicesSold < r.totalSlices && now >= Number(r.startTime)).length;

  return (
    <section className="relative isolate mt-2 overflow-hidden rounded-[28px] border border-line bg-panel">
      {/* Glow blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="drift absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-sage/75 blur-[120px]" />
        <div className="drift absolute top-[10%] left-[35%] h-[520px] w-[420px] rounded-full bg-mist/55 blur-[110px] [animation-delay:-5s]" />
        <div className="drift absolute -bottom-52 -left-32 h-[520px] w-[560px] rounded-full bg-slate/70 blur-[120px] [animation-delay:-9s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgb(13_13_15/0.75)_75%)]" />
        <div className="grid-lines absolute inset-0" />
      </div>

      {/* Connector lines */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full md:block" preserveAspectRatio="none" viewBox="0 0 1000 560">
        <g fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <path d="M0 150 H40 Q60 150 70 140 L110 100 Q120 90 140 90 H230" />
          <path d="M1000 110 H960 Q940 110 930 120 L880 170" />
          <path d="M0 360 H70 Q90 360 100 350 L140 310 Q150 300 170 300 H330" />
          <path d="M1000 340 H940 Q920 340 910 350 L860 400" />
        </g>
      </svg>

      <div className="relative flex min-h-[560px] flex-col items-center justify-center px-6 py-20 text-center md:min-h-[600px]">
        {/* Corner nodes */}
        <div className="absolute top-[22%] left-[6%] hidden flex-col items-start gap-3 md:flex">
          <NodeIcon i={0} />
          <div className="pl-4"><NodeLabel node={nodes[0]} /></div>
        </div>
        <div className="absolute top-[20%] right-[6%] hidden flex-row-reverse items-start gap-3 md:flex">
          <NodeIcon i={1} />
          <div className="pt-6 text-left"><NodeLabel node={nodes[1]} /></div>
        </div>
        <div className="absolute bottom-[28%] left-[4%] hidden flex-col items-start gap-3 md:flex">
          <div className="pl-6"><NodeLabel node={nodes[2]} /></div>
          <NodeIcon i={2} />
        </div>
        <div className="absolute right-[7%] bottom-[24%] hidden flex-col items-end gap-3 md:flex">
          <div className="pr-6 text-left"><NodeLabel node={nodes[3]} /></div>
          <NodeIcon i={3} />
        </div>

        <Link href="#why-monad" className="glass mb-10 grid h-9 w-9 place-items-center rounded-lg" aria-label="Why Monad">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4l13 8-13 8z" /></svg>
        </Link>

        <Link href="#rounds" className="glass mb-6 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-white/85 hover:text-white">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
            <span className={`h-1.5 w-1.5 rounded-full ${liveCount ? "bg-sage animate-pulse" : "bg-white/60"}`} />
          </span>
          {liveCount ? `${liveCount} live round${liveCount > 1 ? "s" : ""} right now` : "Startup equity, sliced"}
          <span aria-hidden>→</span>
        </Link>

        <h1 className="fade-text max-w-4xl text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] font-medium tracking-[-0.035em]">
          One-click for Startup Equity
        </h1>
        <p className="mt-5 max-w-xl text-[15px] text-white/75">
          Startups sell 1% slices in live Dutch auctions. The price drops every second, first click wins, and
          the slice lands in your wallet in under a second on Monad.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="#rounds" className="glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-white/10">
            Open App <span aria-hidden>↗</span>
          </Link>
          <Link href="/create" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-white/90">
            List Your Startup
          </Link>
        </div>

        {/* Light streaks */}
        <div aria-hidden className="pointer-events-none absolute bottom-10 left-1/2 flex h-32 -translate-x-1/2 gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="relative w-px overflow-hidden bg-white/5">
              <div
                className="streak absolute inset-x-0 h-2/3 bg-gradient-to-b from-transparent via-white to-transparent"
                style={{ animationDelay: `${i * 0.55}s`, animationDuration: `${2.6 + (i % 3) * 0.7}s` }}
              />
            </div>
          ))}
        </div>

        {/* Bottom-left scroll hint */}
        <Link href="#rounds" className="glass absolute bottom-6 left-6 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-white/80">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </span>
          01/03 · Scroll down
        </Link>

        {/* Bottom-right horizon indicator */}
        <div className="absolute right-6 bottom-7 hidden flex-col items-start gap-3 sm:flex">
          <span className="text-xs text-gold">Monad horizons</span>
          <div className="flex gap-1.5">
            <span className="h-[3px] w-4 rounded-full bg-white" />
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-[3px] w-4 rounded-full bg-white/15" />)}
          </div>
        </div>
      </div>
    </section>
  );
}
