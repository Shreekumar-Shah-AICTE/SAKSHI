import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <div className="text-6xl">🔍</div>
        <h1 className="mt-4 text-3xl font-black text-soil-100">No such witness</h1>
        <p className="mx-auto mt-2 max-w-sm text-soil-300">
          That receipt or page could not be found in the SAKSHI ledger.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to SAKSHI
        </Link>
      </div>
    </main>
  );
}
