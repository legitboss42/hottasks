"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const params = useSearchParams();
  const amount = params.get("amount");

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Payment Successful ?</h1>

        {amount && <p>Escrow funded: {amount} USDC</p>}

        <a href="/" className="underline mt-6 block">
          Back home
        </a>
      </div>
    </main>
  );
}
