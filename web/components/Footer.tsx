export function Footer() {
  return (
    <footer className="mt-24 flex flex-col items-start justify-between gap-3 border-t border-line py-8 text-xs text-mute sm:flex-row sm:items-center">
      <p>AdaVest · Built for Monad Blitz İstanbul v2 · Prototype on Monad Testnet, not a securities offering.</p>
      <p>
        2.5% platform fee · Contract-enforced ·{" "}
        <a className="hover:text-white" href="https://docs.monad.xyz" target="_blank" rel="noreferrer">
          Monad docs ↗
        </a>
      </p>
    </footer>
  );
}
