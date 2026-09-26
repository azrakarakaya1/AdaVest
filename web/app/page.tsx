"use client";

import Link from "next/link";
import { Hero } from "@/components/Hero";
import { LogoRow } from "@/components/LogoRow";
import { RoundCard } from "@/components/RoundCard";
import { ContractMissing } from "@/components/ContractMissing";
import { useRounds } from "@/hooks/useRounds";
import { useChainNow } from "@/hooks/useChainNow";
import { CONTRACT_ADDRESS } from "@/lib/contract";

const COMPARE = [
  ["Block time", "~12 s", "~0.4 s"],
  ["Finality", "~13 min", "~0.8 s"],
  ["Throughput", "15–30 tps", "~10,000 tps"],
  ["Fee per bid", "Often dollars", "Fractions of a cent"],
];

const STEPS = [
  { n: "01", title: "Startup lists slices", body: "A founder splits part of the company into slices, e.g. 10 × 1%, and sets a start price, floor and duration." },
  { n: "02", title: "Price drops every second", body: "A live Dutch auction. The price falls until someone clicks Buy. No bid storage, no refunds, fair for everyone." },
  { n: "03", title: "Instant settlement", body: "The investor gets an ERC-1155 slice token, the founder gets MON immediately, and 2.5% goes to the platform." },
];

const FAQ = [
  { q: "Is this legal?", a: "This is a prototype on testnet. A production version would allow only KYC-verified investors, partner with an SPK-licensed equity crowdfunding platform, and back each slice token with a SAFE or similar legal agreement." },
  { q: "Why a Dutch auction?", a: "It's fair, fast, and needs no bid storage or refunds. The price finds itself: the first person who thinks it's worth it buys." },
  { q: "Why not Ethereum or an L2?", a: "A real-time auction needs sub-second finality and near-zero fees on a decentralized L1. That's exactly what Monad provides." },
  { q: "How does AdaVest make money?", a: "A 2.5% fee on every slice sold, enforced by the smart contract. Later: listing fees and premium analytics." },
  { q: "What stops front-running?", a: "Buyers send a small buffer that is refunded, and ordering is decided by consensus. Production could add per-wallet caps or commit–reveal." },
];

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-xs tracking-[0.2em] text-gold uppercase">{kicker}</p>
      <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-mute">{body}</p>}
    </div>
  );
}

export default function Home() {
  const { rounds, isLoading } = useRounds();
  const now = useChainNow(100);

  return (
    <>
      <Hero />
      <LogoRow />

      <section id="rounds" className="scroll-mt-24 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead kicker="Rounds" title="Live equity auctions" body="Every slice is sold onchain. Prices tick down in real time; the first buyer wins." />
          <Link href="/create" className="glass mb-8 rounded-full px-4 py-2 text-sm hover:bg-white/10">
            + Create round
          </Link>
        </div>

        {!CONTRACT_ADDRESS ? (
          <ContractMissing />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="card h-64 animate-pulse" />)}
          </div>
        ) : rounds.length === 0 ? (
          <div className="card p-8 text-center text-mute">
            No rounds yet. <Link href="/create" className="text-white underline-offset-4 hover:underline">Create the first one →</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rounds.map((r) => <RoundCard key={r.id} round={r} now={now} />)}
          </div>
        )}
      </section>

      <section className="pt-24">
        <SectionHead kicker="How it works" title="From cap table to wallet in three steps" />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <span className="text-sm text-mute tabular">{s.n}</span>
              <h3 className="mt-6 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why-monad" className="scroll-mt-24 pt-24">
        <SectionHead
          kicker="Why Monad"
          title="Live auctions are only possible in real time"
          body="A live auction needs many buy attempts per second and instant confirmation. On Ethereum each attempt costs real money and takes 12+ seconds. On Monad it confirms in under a second for almost nothing."
        />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-mute">
                <th className="px-6 py-4 font-normal" />
                <th className="px-6 py-4 font-normal">Ethereum</th>
                <th className="px-6 py-4 font-medium text-sage">Monad</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, eth, monad]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 text-mute">{k}</td>
                  <td className="px-6 py-4 tabular">{eth}</td>
                  <td className="px-6 py-4 font-medium tabular">{monad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 pt-24">
        <SectionHead kicker="FAQ" title="Questions, answered" />
        <div className="grid gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5 open:border-white/15">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="text-mute transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
