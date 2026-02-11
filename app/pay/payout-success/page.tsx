export const dynamic = "force-dynamic";

import Link from "next/link";

export default function PayoutSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Payout Requested ✅</h1>
        <p>Your payout request has been submitted.</p>
        <Link href="/" className="underline mt-6 block">
          Back home
        </Link>
      </div>
    </main>
  );
}
