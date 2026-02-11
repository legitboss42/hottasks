"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

type WalletContextType = {
  accountId: string | null;
  connect: () => void;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType>({
  accountId: null,
  connect: () => {},
  disconnect: () => {},
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export async function initWallet() {
  const selector = await setupWalletSelector({
    network: "testnet",
    modules: [
      setupMyNearWallet({
        successUrl: `${APP_URL}/`,
        failureUrl: `${APP_URL}/`,
      }),
    ],
  });

  const modal = setupModal(selector, { contractId: "" });
  return { selector, modal };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<any>(null);
  const [modal, setModal] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { selector, modal } = await initWallet();

      setSelector(selector);
      setModal(modal);

      const state = selector.store.getState();
      const acc = state.accounts.find((a: any) => a.active);
      setAccountId(acc?.accountId ?? null);

      selector.store.observable.subscribe((state: any) => {
        const acc = state.accounts.find((a: any) => a.active);
        setAccountId(acc?.accountId ?? null);
      });
    }

    init();
  }, []);

  async function connect() {
    if (!modal) return;
    await modal.show();
  }

  async function disconnect() {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }

  return (
    <WalletContext.Provider value={{ accountId, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
