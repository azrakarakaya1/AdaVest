import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  // NEXT_PUBLIC_RPC_URL lets you point at a private RPC or a local anvil fork (chain id 10143).
  transports: { [monadTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined) },
  pollingInterval: 250, // Monad blocks are ~0.4 s
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
