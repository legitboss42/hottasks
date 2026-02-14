"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const WALLET_COOKIE = "hot_wallet";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isConnected && address) {
      document.cookie = `${WALLET_COOKIE}=${address.toLowerCase()}; Path=/; Max-Age=604800; SameSite=Lax`;
      return;
    }

    document.cookie = `${WALLET_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }, [address, isConnected]);

  if (isConnected && address) {
    return (
      <button className="wallet-chip" onClick={() => disconnect()}>
        {address.slice(0, 6)}... Disconnect
      </button>
    );
  }

  return (
    <>
      {connectors.map((connector) => (
        <button
          className="btn"
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
        >
          Connect {connector.name}
        </button>
      ))}
    </>
  );
}

export default ConnectWallet;
