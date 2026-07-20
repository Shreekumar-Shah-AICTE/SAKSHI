import Link from "next/link";

export function Nav() {
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-seal text-lg text-night shadow-seal">
          साक्षी
        </span>
        <span className="text-lg font-black tracking-wide text-soil-100">SAKSHI</span>
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/ledger" className="text-soil-300 transition hover:text-soil-100">
          Ledger
        </Link>
        <Link href="/seal" className="btn-ghost !px-4 !py-2 !text-sm">
          Seal a loss
        </Link>
      </div>
    </nav>
  );
}
