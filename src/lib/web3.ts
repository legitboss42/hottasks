import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

const isBrowser = typeof window !== "undefined";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  connectors: isBrowser
    ? [
        metaMask(),
        walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
        }),
        coinbaseWallet({
          appName: "HOTTasks",
        }),
      ]
    : [],
});
