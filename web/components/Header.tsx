"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ConnectButton } from "./ConnectButton";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#rounds", label: "Rounds" },
  { href: "/create", label: "Create" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/#why-monad", label: "Why Monad" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-4 bg-ink/70 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5" aria-label="AdaVest home">
        <Logo />
        <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">AdaVest</span>
      </Link>

      <nav className="glass hidden items-center gap-1 rounded-full p-1 pl-2 text-[13px] lg:flex">
        {NAV.map((n) => {
          const active = n.href === path;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                active ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
        <a
          href="https://testnet.monadvision.com"
          target="_blank"
          rel="noreferrer"
          className="ml-2 flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-white/80 hover:text-white"
        >
          Monad Testnet <span aria-hidden>↗</span>
        </a>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink" title="Onchain & transparent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
      </nav>

      <ConnectButton />
    </header>
  );
}
