"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { parseEther, parseEventLogs, BaseError } from "viem";
import { useConnect, useConnection, useConnectors, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { auction, CONTRACT_ADDRESS } from "@/lib/contract";
import { monadTestnet, explorerTx } from "@/lib/chain";
import { ContractMissing } from "@/components/ContractMissing";
import { useToast } from "@/components/Toast";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm">{label}</span>
      {children}
      {hint && <span className="text-xs text-mute">{hint}</span>}
    </label>
  );
}

const input =
  "rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm outline-none transition focus:border-white/30 tabular";

export default function CreatePage() {
  const router = useRouter();
  const toast = useToast();
  const client = usePublicClient();
  const { isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const switchChain = useSwitchChain();
  const write = useWriteContract();

  const [form, setForm] = useState({
    name: "",
    slicePct: "1",
    slices: "10",
    startPrice: "2",
    floorPrice: "0.2",
    durationMin: "4",
    delaySec: "0",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const sliceBps = Math.round(Number(form.slicePct) * 100);
  const slices = Number(form.slices);
  const totalEquity = (sliceBps * slices) / 100;
  let preview = "";
  let invalid = "";
  try {
    const start = parseEther(form.startPrice || "0");
    const floor = parseEther(form.floorPrice || "0");
    const dur = Math.round(Number(form.durationMin) * 60);
    if (!form.name.trim()) invalid = "Enter a startup name.";
    else if (sliceBps < 1 || slices < 1 || !Number.isInteger(slices)) invalid = "Slice size and count must be positive.";
    else if (totalEquity > 100) invalid = "Total equity can't exceed 100%.";
    else if (start === 0n || floor > start) invalid = "Floor must be at or below the start price.";
    else if (dur < 10) invalid = "Duration must be at least 10 seconds.";
    else preview = `Price falls ${((Number(form.startPrice) - Number(form.floorPrice)) / dur).toFixed(5)} MON per second.`;
  } catch {
    invalid = "Prices must be valid MON amounts.";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isConnected) {
      if (connectors[0]) connect.mutate({ connector: connectors[0], chainId: monadTestnet.id });
      return;
    }
    if (chainId !== monadTestnet.id) return switchChain.mutate({ chainId: monadTestnet.id });
    if (invalid) return;

    const start = parseEther(form.startPrice);
    const floor = parseEther(form.floorPrice);
    const duration = BigInt(Math.round(Number(form.durationMin) * 60));
    const decay = (start - floor) / duration; // decayPerSecond = (start - floor) / duration

    setBusy(true);
    try {
      const hash = await write.mutateAsync({
        ...auction,
        address: CONTRACT_ADDRESS!,
        functionName: "createRound",
        args: [form.name.trim(), "", sliceBps, slices, start, floor, decay, BigInt(Math.max(0, Number(form.delaySec) || 0))],
      });
      const receipt = await client!.waitForTransactionReceipt({ hash, pollingInterval: 100 });
      const [created] = parseEventLogs({ abi: auction.abi, logs: receipt.logs, eventName: "RoundCreated" });
      toast({ tone: "ok", title: `Round "${form.name}" created`, href: explorerTx(hash) });
      router.push(created ? `/round/${created.args.roundId}` : "/#rounds");
    } catch (err) {
      toast({ tone: "error", title: "Could not create round", body: err instanceof BaseError ? err.shortMessage : String(err) });
    } finally {
      setBusy(false);
    }
  }

  if (!CONTRACT_ADDRESS) return <div className="pt-10"><ContractMissing /></div>;

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <p className="text-xs tracking-[0.2em] text-gold uppercase">For founders</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">Open an equity round</h1>
      <p className="mt-3 text-mute">
        Split part of your startup into slices and sell them in a live Dutch auction. Money arrives in your wallet
        the moment each slice sells.
      </p>

      <form onSubmit={onSubmit} className="card mt-8 flex flex-col gap-5 p-6">
        <Field label="Startup name">
          <input className={input} value={form.name} onChange={set("name")} placeholder="e.g. Bosphorus Robotics" maxLength={48} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Equity per slice (%)">
            <input className={input} type="number" step="0.01" min="0.01" value={form.slicePct} onChange={set("slicePct")} />
          </Field>
          <Field label="Number of slices" hint={`${totalEquity || 0}% of equity in total`}>
            <input className={input} type="number" min="1" step="1" value={form.slices} onChange={set("slices")} />
          </Field>
          <Field label="Start price (MON)">
            <input className={input} type="number" step="any" min="0" value={form.startPrice} onChange={set("startPrice")} />
          </Field>
          <Field label="Floor price (MON)">
            <input className={input} type="number" step="any" min="0" value={form.floorPrice} onChange={set("floorPrice")} />
          </Field>
          <Field label="Decay duration (minutes)" hint="Time from start price to floor">
            <input className={input} type="number" step="any" min="0.2" value={form.durationMin} onChange={set("durationMin")} />
          </Field>
          <Field label="Start delay (seconds)" hint="0 = starts immediately">
            <input className={input} type="number" min="0" step="1" value={form.delaySec} onChange={set("delaySec")} />
          </Field>
        </div>

        <p className={`text-sm ${invalid ? "text-red-300" : "text-mute"}`}>{invalid || preview}</p>

        <button
          type="submit"
          disabled={busy || (isConnected && chainId === monadTestnet.id && !!invalid)}
          className="rounded-full bg-white px-6 py-3.5 font-semibold text-ink transition hover:bg-white/90 disabled:bg-white/20 disabled:text-white/60"
        >
          {!isConnected
            ? "Connect wallet"
            : chainId !== monadTestnet.id
              ? "Switch to Monad Testnet"
              : busy
                ? "Creating round…"
                : "Create round"}
        </button>
      </form>
    </div>
  );
}
