import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SealFlow } from "@/components/SealFlow";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";
import { FLAGSHIP_EVENT_ID } from "@/data/seed/churu-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SealPage({
  searchParams,
}: {
  searchParams: { event?: string };
}) {
  const store = getStore();
  const eventId = searchParams.event ?? FLAGSHIP_EVENT_ID;
  const bundle = store.getBundle(eventId) ?? store.getBundle(FLAGSHIP_EVENT_ID)!;
  const view = buildReceiptView(bundle);

  return (
    <main>
      <Nav />
      <div className="mx-auto max-w-md px-5 pb-2 pt-2 text-center">
        <div className="chip mx-auto">
          {view.farmerName} · {view.village}, {view.tehsil}
        </div>
      </div>
      <SealFlow initial={view} />
      <div className="mx-auto max-w-md px-5 pb-16 text-center">
        <Link href="/" className="text-xs text-soil-300 underline">
          ← Choose a different farmer
        </Link>
      </div>
    </main>
  );
}
