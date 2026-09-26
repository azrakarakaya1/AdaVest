"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BaseError, ContractFunctionRevertedError } from "viem";
import {
  useBalance,
  useConnect,
  useConnection,
  useConnectors,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useRound } from "@/hooks/useRounds";
import { useChainNow } from "@/hooks/useChainNow";
import { useSliceFeed } from "@/hooks/useSliceFeed";
import { auction, CONTRACT_ADDRESS, type Round } from "@/lib/contract";
import { monadTestnet, explorerAddress, explorerTx } from "@/lib/chain";
import { decayProgress, priceAt, statusOf } from "@/lib/price";
import { formatCountdown, formatMon, pct, shortAddr } from "@/lib/format";
import { StatusBadge } from "@/components/RoundCard";
import { ContractMissing } from "@/components/ContractMissing";
import { useToast } from "@/components/Toast";

const BUFFER_BPS = 200n; // send +2%; the contract refunds the excess

function errorMessage(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name === "SoldOut") return "Someone was faster: this round is sold out.";
      if (name === "NotStarted") return "The auction hasn't started yet.";
      if (name === "Underpaid") return "Price moved; please try again.";
      if (name) return name;
    }
    if (e.shortMessage.toLowerCase().includes("rejected")) return "Transaction rejected in wallet.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

function DecayChart({ round, now }: { round: Round; now: number }) {
  const W = 600;
  const H = 140;
  const start = Number(round.startTime);
  const room = Number(round.startPrice - round.floorPrice);
  const duration = round.decayPerSecond > 0n ? room / Number(round.decayPerSecond) : 1;
  const floorY = H - 12;
  const topY = 12;
  const floorX = W * 0.8;
  const progress = decayProgress(round, now);
  const t = now < start ? 0 : Math.min(1, (now - start) / duration);
  const cx = t * floorX;
  const cy = topY + progress * (floorY - topY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b9ccbf" stopOpacity="0.25" />
          <stop offset="1" stopColor="#b9ccbf" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0 ${topY} L${floorX} ${floorY} H${W} V${H} H0 Z`} fill="url(#fill)" />
      <path d={`M0 ${topY} L${floorX} ${floorY} H${W}`} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <path d={`M0 ${topY} L${cx} ${cy}`} fill="none" stroke="#b9ccbf" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={cx} cy={cy} r="5" fill="#fff" />
    </svg>
  );
}

function Stat({ label, value, sub, flashKey }: { label: string; value: string; sub?: string; flashKey?: string }) {
  return (
    <div key={flashKey} className={`card p-4 ${flashKey ? "flash" : ""}`}>
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-lg font-medium tabular">{value}</p>
      {sub && <p className="text-xs text-mute">{sub}</p>}
    </div>
  );
}

export default function RoundPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { round, isLoading, refetch } = useRound(id);
  const now = useChainNow(100);
  const sales = useSliceFeed(id);
  const toast = useToast();
  const client = usePublicClient();

  const { address, isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const switchChain = useSwitchChain();
  const write = useWriteContract();

  const [pending, setPending] = useState<"sign" | "confirm" | null>(null);
  const [lastConfirm, setLastConfirm] = useState<{ ms: number; hash: string; price: bigint } | null>(null);

  const founderBal = useBalance({
    address: round?.founder,
    query: { enabled: !!round, refetchInterval: 1_000 },
  });
  const mySlices = useReadContract({
    ...auction,
    functionName: "balanceOf",
    args: [address!, BigInt(id)],
    query: { enabled: !!address && !!CONTRACT_ADDRESS, refetchInterval: 2_000 },
  });

  // Remember the founder balance when the page opened, to show the live increase.
  const [founderStart, setFounderStart] = useState<bigint | null>(null);
  if (founderStart === null && founderBal.data) setFounderStart(founderBal.data.value);

  if (!CONTRACT_ADDRESS) return <div className="pt-10"><ContractMissing /></div>;
  if (isLoading) return <div className="card mt-10 h-96 animate-pulse" />;
  if (!round)
    return (
      <div className="card mt-10 p-8 text-center text-mute">
        Round #{params.id} not found. <Link href="/#rounds" className="text-white hover:underline">Back to rounds</Link>
      </div>
    );

  const status = statusOf(round, now);
  const price = priceAt(round, now);
  const startsIn = Number(round.startTime) - now;
  const left = round.totalSlices - round.slicesSold;
  const founderGain =
    founderBal.data && founderStart !== null ? founderBal.data.value - founderStart : 0n;

  async function onBuy() {
    if (!round) return;
    if (!isConnected) {
      if (connectors[0]) connect.mutate({ connector: connectors[0], chainId: monadTestnet.id });
      return;
    }
    if (chainId !== monadTestnet.id) {
      switchChain.mutate({ chainId: monadTestnet.id });
      return;
    }
    try {
      setPending("sign");
      const quote = priceAt(round, Date.now() / 1000);
      const value = quote + (quote * BUFFER_BPS) / 10_000n;
      const hash = await write.mutateAsync({
        ...auction,
        address: CONTRACT_ADDRESS!,
        functionName: "buy",
        args: [BigInt(id)],
        value,
      });
      const sentAt = performance.now();
      setPending("confirm");
      const receipt = await client!.waitForTransactionReceipt({ hash, pollingInterval: 100 });
      const ms = performance.now() - sentAt;
      if (receipt.status !== "success") throw new Error("Transaction reverted.");
      setLastConfirm({ ms, hash, price: quote });
      toast({ tone: "ok", title: `Slice bought · confirmed in ${(ms / 1000).toFixed(2)} s`, href: explorerTx(hash) });
      refetch();
      mySlices.refetch();
    } catch (e) {
      toast({ tone: "error", title: "Purchase failed", body: errorMessage(e) });
    } finally {
      setPending(null);
    }
  }

  let buyLabel = `Buy 1 slice · ${formatMon(price, 4)} MON`;
  if (!isConnected) buyLabel = "Connect wallet to buy";
  else if (chainId !== monadTestnet.id) buyLabel = "Switch to Monad Testnet";
  else if (status === "soldout") buyLabel = "Sold out";
  else if (status === "upcoming") buyLabel = `Opens in ${formatCountdown(startsIn)}`;
  if (pending === "sign") buyLabel = "Confirm in wallet…";
  if (pending === "confirm") buyLabel = "Confirming on Monad…";

  const buyDisabled = !!pending || (isConnected && chainId === monadTestnet.id && (status === "soldout" || status === "upcoming"));

  return (
    <div className="pt-4">
      <Link href="/#rounds" className="text-sm text-mute hover:text-white">← All rounds</Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Price panel */}
        <section className="relative isolate overflow-hidden rounded-[28px] border border-line bg-panel p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="drift absolute -top-40 -right-20 h-[420px] w-[420px] rounded-full bg-sage/40 blur-[110px]" />
            <div className="drift absolute -bottom-48 -left-24 h-[380px] w-[420px] rounded-full bg-slate/60 blur-[110px] [animation-delay:-6s]" />
            <div className="grid-lines absolute inset-0" />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-base font-semibold text-ink">
                {round.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h1 className="text-2xl font-medium tracking-tight">{round.name}</h1>
                <p className="text-sm text-mute">
                  Round #{id} · {pct(round.sliceBps)} equity per slice · founder{" "}
                  <a href={explorerAddress(round.founder)} target="_blank" rel="noreferrer" className="hover:text-white">
                    {shortAddr(round.founder)} ↗
                  </a>
                </p>
              </div>
            </div>
            <StatusBadge status={status} startsIn={startsIn} />
          </div>

          <div className="mt-10">
            <p className="text-sm text-mute">Current price per slice</p>
            <p className="fade-text mt-1 text-[clamp(3rem,9vw,6.5rem)] leading-none font-medium tracking-[-0.04em] tabular">
              {formatMon(price, 4)}
            </p>
            <p className="mt-2 text-sm text-mute tabular">
              MON · start {formatMon(round.startPrice, 2)} → floor {formatMon(round.floorPrice, 2)} · −
              {formatMon(round.decayPerSecond, 4)}/s
            </p>
          </div>

          <div className="mt-6">
            <DecayChart round={round} now={now} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm tabular">
              <span>{round.slicesSold} of {round.totalSlices} slices sold</span>
              <span className="text-mute">{left} left</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: round.totalSlices }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${i < round.slicesSold ? "bg-sage" : "bg-white/10"}`} />
              ))}
            </div>
          </div>

          <button
            onClick={onBuy}
            disabled={buyDisabled}
            className="mt-8 w-full rounded-full bg-white px-6 py-4 text-base font-semibold text-ink transition hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
          >
            {buyLabel}
          </button>
          <p className="mt-3 text-center text-xs text-mute">
            Sends price + 2% buffer; the excess is refunded in the same transaction. 2.5% platform fee included.
          </p>

          {lastConfirm && (
            <div key={lastConfirm.hash} className="flash mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sage/30 px-4 py-3">
              <span className="text-sm">
                <span className="text-sage">✓ Confirmed in {(lastConfirm.ms / 1000).toFixed(2)} s</span>
                <span className="text-mute"> · paid ~{formatMon(lastConfirm.price, 4)} MON</span>
              </span>
              <a href={explorerTx(lastConfirm.hash)} target="_blank" rel="noreferrer" className="text-sm text-mute hover:text-white">
                View tx ↗
              </a>
            </div>
          )}
        </section>

        {/* Side column */}
        <aside className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Founder balance"
              value={founderBal.data ? `${formatMon(founderBal.data.value, 3)} MON` : "…"}
              sub={founderGain > 0n ? `+${formatMon(founderGain, 4)} since you opened` : "Updates live"}
              flashKey={founderBal.data?.value.toString()}
            />
            <Stat
              label="Your slices"
              value={address ? `${mySlices.data?.toString() ?? "0"}` : "—"}
              sub={mySlices.data ? `${pct(Number(mySlices.data) * round.sliceBps)} equity` : "ERC-1155 token"}
            />
          </div>

          <div className="card flex min-h-[360px] flex-1 flex-col p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium">Live feed</h2>
              <span className="flex items-center gap-1.5 text-xs text-mute">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" /> polling every 1 s
              </span>
            </div>
            {sales.length === 0 ? (
              <p className="m-auto text-sm text-mute">No slices sold yet. Be the first.</p>
            ) : (
              <ul className="flex flex-col gap-2 overflow-y-auto">
                {sales.map((s) => (
                  <li key={s.txHash} className="flash flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-xs tabular">
                        #{s.sliceIndex + 1}
                      </span>
                      <span>
                        {s.buyer.toLowerCase() === address?.toLowerCase() ? "You" : shortAddr(s.buyer)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 tabular">
                      {formatMon(s.price, 4)} MON
                      <a href={explorerTx(s.txHash)} target="_blank" rel="noreferrer" className="text-mute hover:text-white" aria-label="View on explorer">
                        ↗
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
