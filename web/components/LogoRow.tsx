const STACK = ["Monad", "MetaMask", "Foundry", "OpenZeppelin", "viem", "wagmi", "Next.js"];

export function LogoRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-10 text-white/35">
      {STACK.map((s) => (
        <span key={s} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border border-white/35" aria-hidden />
          {s}
        </span>
      ))}
    </div>
  );
}
