export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Payment Successful ✅</h1>
        <p>Your HOT escrow has been funded.</p>
        <a href="/" className="underline mt-6 block">
          Back home
        </a>
      </div>
    </main>
  );
}