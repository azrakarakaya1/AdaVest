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

function SideNode({ side, bend, className, icon, node }: { side: "left" | "right"; bend: "up" | "down"; className: string; icon: number; node: Node }) {
  const left = side === "left";
  return (
    <div className={`absolute hidden items-center gap-3 xl:flex ${left ? "left-0" : "right-0 flex-row-reverse"} ${className}`}>
      {/* Curved connector like the design sample: runs along the edge, bends, then meets the icon */}
      <svg width="88" height="48" viewBox="0 0 88 48" fill="none" aria-hidden style={left ? undefined : { transform: "scaleX(-1)" }}>
        <path
          d={bend === "up" ? "M0 46 H26 Q36 46 42 40 L54 30 Q60 24 70 24 H88" : "M0 2 H26 Q36 2 42 8 L54 18 Q60 24 70 24 H88"}
          stroke="rgb(255 255 255 / 0.18)"
        />
      </svg>
      <NodeIcon i={icon} />
      <div className="text-left"><NodeLabel node={node} /></div>
    </div>
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

      <div className="relative flex min-h-[560px] flex-col items-center justify-center px-6 py-20 text-center md:min-h-[600px]">
        {/* Side nodes: a short line from the card edge to the icon, label beside it. Only on wide screens so they never touch the headline. */}
        <SideNode side="left" bend="up" className="top-[15%]" icon={0} node={nodes[0]} />
        <SideNode side="left" bend="down" className="bottom-[20%]" icon={2} node={nodes[2]} />
        <SideNode side="right" bend="up" className="top-[15%]" icon={1} node={nodes[1]} />
        <SideNode side="right" bend="down" className="bottom-[20%]" icon={3} node={nodes[3]} />

        <Link href="#rounds" className="glass mb-7 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-white/85 hover:text-white">
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

        {/* Light streaks, in flow below the buttons so they never overlap them */}
        <div aria-hidden className="pointer-events-none mt-10 flex h-20 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative w-px overflow-hidden bg-white/5">
              <div
                className="streak absolute inset-x-0 h-2/3 bg-gradient-to-b from-transparent via-white/70 to-transparent"
                style={{ animationDelay: `${i * 0.8}s`, animationDuration: `${2.8 + i * 0.6}s` }}
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
