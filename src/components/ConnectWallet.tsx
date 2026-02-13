"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const WALLET_DETAILS: Record<string, string> = {
  metaMask: "Use MetaMask to sign in and approve funding transactions.",
  walletConnect: "Scan with any WalletConnect-compatible wallet on mobile or desktop.",
  coinbaseWallet: "Connect with Coinbase Wallet for fast, secure transaction signing.",
};

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [connectingUid, setConnectingUid] = useState<string | null>(null);

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.uid === selectedUid) ?? connectors[0],
    [connectors, selectedUid]
  );

  function openModal() {
    if (connectors.length === 0) return;
    setSelectedUid((current) => current ?? connectors[0].uid);
    setOpen(true);
  }

  if (isConnected) {
    return (
      <button className="wallet-chip" onClick={() => disconnect()}>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button className="btn" onClick={openModal}>
        Connect wallet
      </button>
      {open && (
        <div className="wallet-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="wallet-modal" onClick={(event) => event.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Connect Your Wallet</h3>
              <button className="wallet-modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="wallet-modal-body">
              <div className="wallet-modal-list">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    className={`wallet-option ${
                      selectedConnector?.uid === connector.uid ? "active" : ""
                    }`}
                    onClick={() => setSelectedUid(connector.uid)}
                  >
                    {connector.name}
                  </button>
                ))}
              </div>
              <div className="wallet-modal-detail">
                {selectedConnector ? (
                  <>
                    <p className="wallet-modal-copy">
                      {WALLET_DETAILS[selectedConnector.id] ??
                        "Select this wallet to connect and manage HOTTasks actions."}
                    </p>
                    <button
                      className="btn wallet-connect-btn"
                      onClick={async () => {
                        setConnectingUid(selectedConnector.uid);
                        try {
                          await connectAsync({ connector: selectedConnector });
                          setOpen(false);
                        } catch {
                          // Let wagmi surface wallet errors.
                        } finally {
                          setConnectingUid(null);
                        }
                      }}
                      disabled={isPending}
                    >
                      {isPending && connectingUid === selectedConnector.uid
                        ? "Connecting..."
                        : `Connect ${selectedConnector.name}`}
                    </button>
                    <p className="wallet-modal-help">
                      No wallet yet?{" "}
                      <a
                        className="wallet-modal-link"
                        href="https://walletconnect.com/explorer"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Create a new wallet
                      </a>
                    </p>
                  </>
                ) : (
                  <p className="wallet-modal-copy">No wallet connector available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
