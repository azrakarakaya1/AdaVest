"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useBalance, useConnection, useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/chain";
import { formatMon, shortAddr } from "@/lib/format";
import { useToast } from "./Toast";

function connectError(e: Error): string {
  const err = e as Error & { code?: number; cause?: { code?: number } };
  const code = err.code ?? err.cause?.code;
  if (code === -32002 || /already pending/i.test(e.message))
    return "MetaMask already has a request waiting. Open the MetaMask extension to approve it.";
  if (code === 4001 || /reject|denied/i.test(e.message)) return "Connection request was rejected in the wallet.";
  return e.message.split("\n")[0];
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function ConnectButton() {
  // false during SSR/hydration, true on the client: avoids wallet-state hydration mismatches
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { address, isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const balance = useBalance({ address, query: { enabled: !!address, refetchInterval: 3_000 } });
  const toast = useToast();
  // Prefer MetaMask (announced via EIP-6963) over other injected wallets such as Phantom or Coinbase.
  const wallet = connectors.find((c) => c.id === "io.metamask") ?? connectors.find((c) => c.id !== "injected") ?? connectors[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const base = "flex items-center gap-2 text-sm font-medium transition-colors";

  if (!mounted || !isConnected) {
    const hasWallet = mounted && connectors.length > 0;
    return (
      <button
        className={`${base} text-white/90 hover:text-white disabled:opacity-50`}
        disabled={connect.isPending}
        onClick={() => {
          if (!hasWallet || !wallet) return window.open("https://metamask.io/download/", "_blank");
          // Connect first; switching to Monad is a separate step so a declined switch doesn't block connecting.
          connect.mutate(
            { connector: wallet },
            { onError: (e) => toast({ tone: "error", title: "Could not connect wallet", body: connectError(e) }) },
          );
        }}
      >
        <UserIcon />
        {connect.isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== monadTestnet.id) {
    return (
      <button
        className={`${base} glass rounded-full px-4 py-2 text-gold`}
        onClick={() =>
          switchChain.mutate(
            { chainId: monadTestnet.id },
            { onError: (e) => toast({ tone: "error", title: "Could not switch network", body: connectError(e) }) },
          )
        }
      >
        Switch to Monad
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button className={`${base} glass rounded-full py-1.5 pr-4 pl-1.5`} onClick={() => setOpen((o) => !o)}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink">
          <UserIcon />
        </span>
        <span className="hidden text-mute sm:inline tabular">
          {balance.data ? `${formatMon(balance.data.value, 2)} MON` : "…"}
        </span>
        <span>{shortAddr(address)}</span>
      </button>
      {open && (
        <div className="glass absolute right-0 z-40 mt-2 w-48 rounded-2xl bg-ink/90 p-1.5 text-sm">
          <a href="/portfolio" className="block rounded-xl px-3 py-2 hover:bg-white/5">
            My slices
          </a>
          <button
            className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/5"
            onClick={() => address && navigator.clipboard.writeText(address)}
          >
            Copy address
          </button>
          <button
            className="block w-full rounded-xl px-3 py-2 text-left text-red-300 hover:bg-white/5"
            onClick={() => {
              disconnect.mutate();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
